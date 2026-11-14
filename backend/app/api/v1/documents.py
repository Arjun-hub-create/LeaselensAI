import uuid
from pathlib import PureWindowsPath
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.api.deps import AuthContext, CurrentAuth, DbSession, require_roles
from app.api.utils import escape_like
from app.core.config import settings
from app.models import Document, ProcessingJob, Property
from app.models.document import DUPLICATE_EXEMPT_STATUSES
from app.schemas.document import (
    DocumentList,
    DocumentOut,
    DocumentStatus,
    DocumentType,
    UploadResponse,
)
from app.storage.local import DocumentStorage, UploadRejectedError, get_storage

router = APIRouter(prefix="/documents", tags=["documents"])

UploadAuth = Annotated[AuthContext, Depends(require_roles("admin", "property_manager"))]
Storage = Annotated[DocumentStorage, Depends(get_storage)]

DUPLICATE_MESSAGE = "This file has already been uploaded to your workspace."


def clean_filename(raw: str | None) -> str:
    """The name to show in the UI. Only the last path part is kept, and it is never used as a path."""
    name = PureWindowsPath(raw or "").name  # handles both / and \ separators
    name = "".join(ch for ch in name if ch.isprintable()).strip()
    return name[:255]


def get_owned_document(db: DbSession, ctx: AuthContext, document_id: uuid.UUID) -> Document:
    document = db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.workspace_id == ctx.workspace.id,
        )
    ).scalar_one_or_none()
    if document is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found.")
    return document


@router.post("", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
def upload_document(
    ctx: UploadAuth,
    db: DbSession,
    storage: Storage,
    file: Annotated[UploadFile, File()],
    property_id: Annotated[uuid.UUID | None, Form()] = None,
) -> UploadResponse:
    # Cheap checks first. None of these touch the disk.
    filename = clean_filename(file.filename)
    if not filename.lower().endswith(".pdf") or len(filename) <= len(".pdf"):
        raise HTTPException(415, "Only PDF files are supported.")
    declared_type = (file.content_type or "").split(";")[0].strip().lower()
    if declared_type != "application/pdf":
        raise HTTPException(415, "Only PDF files are supported.")

    if property_id is not None:
        owned = db.execute(
            select(Property.id).where(
                Property.id == property_id,
                Property.workspace_id == ctx.workspace.id,
            )
        ).first()
        if owned is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found.")

    document_id = uuid.uuid4()
    try:
        stored = storage.save_upload(
            ctx.workspace.id, document_id, file.file, settings.max_upload_bytes
        )
    except UploadRejectedError as rejected:
        if rejected.reason == "too_large":
            limit_mb = settings.max_upload_bytes // (1024 * 1024)
            raise HTTPException(413, f"The file is too large. The limit is {limit_mb} MB.") from None
        if rejected.reason == "empty":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "The file is empty.") from None
        raise HTTPException(415, "The file is not a valid PDF.") from None

    already_uploaded = db.execute(
        select(Document.id).where(
            Document.workspace_id == ctx.workspace.id,
            Document.sha256 == stored.sha256,
            Document.status.not_in(DUPLICATE_EXEMPT_STATUSES),
        )
    ).first()
    if already_uploaded is not None:
        storage.delete_file(stored.storage_key)
        raise HTTPException(status.HTTP_409_CONFLICT, DUPLICATE_MESSAGE)

    document = Document(
        id=document_id,
        workspace_id=ctx.workspace.id,
        property_id=property_id,
        uploaded_by=ctx.user.id,
        original_filename=filename,
        mime_type="application/pdf",
        file_size_bytes=stored.size_bytes,
        sha256=stored.sha256,
        storage_key=stored.storage_key,
        status="queued",
        is_demo=ctx.workspace.is_demo,
    )
    job = ProcessingJob(
        workspace_id=ctx.workspace.id,
        document_id=document_id,
        job_type="document_ingest",
        idempotency_key=f"document_ingest:{document_id}",
    )
    try:
        db.add(document)
        db.flush()  # the document must exist before the job that points at it
        db.add(job)
        db.commit()
    except IntegrityError:
        # Most likely a simultaneous upload of the same file won the race.
        db.rollback()
        storage.delete_file(stored.storage_key)
        raise HTTPException(status.HTTP_409_CONFLICT, DUPLICATE_MESSAGE) from None
    except SQLAlchemyError:
        db.rollback()
        storage.delete_file(stored.storage_key)
        raise

    return UploadResponse(document_id=document_id, job_id=job.id, status="queued")


@router.get("", response_model=DocumentList)
def list_documents(
    ctx: CurrentAuth,
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    status_filter: Annotated[DocumentStatus | None, Query(alias="status")] = None,
    document_type: DocumentType | None = None,
    property_id: uuid.UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> DocumentList:
    conditions = [Document.workspace_id == ctx.workspace.id]
    if q and q.strip():
        conditions.append(
            Document.original_filename.ilike(f"%{escape_like(q.strip())}%", escape="\\")
        )
    if status_filter is not None:
        conditions.append(Document.status == status_filter)
    if document_type is not None:
        conditions.append(Document.document_type == document_type)
    if property_id is not None:
        conditions.append(Document.property_id == property_id)

    total = db.execute(select(func.count()).select_from(Document).where(*conditions)).scalar_one()
    rows = (
        db.execute(
            select(Document)
            .where(*conditions)
            .order_by(Document.created_at.desc(), Document.id)
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    return DocumentList(
        items=[DocumentOut.model_validate(row) for row in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: uuid.UUID, ctx: CurrentAuth, db: DbSession) -> DocumentOut:
    return DocumentOut.model_validate(get_owned_document(db, ctx, document_id))