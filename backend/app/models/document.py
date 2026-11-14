import uuid
from datetime import datetime

from sqlalchemy import (
    CHAR,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    false,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Statuses from docs/14_gap_resolutions.md (G2). A document in one of these may be uploaded again.
DUPLICATE_EXEMPT_STATUSES = ("archived", "rejected", "failed")


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        # A document's property must be in the same workspace. A NULL property_id is allowed.
        ForeignKeyConstraint(
            ["property_id", "workspace_id"],
            ["properties.id", "properties.workspace_id"],
        ),
        UniqueConstraint("id", "workspace_id"),
        CheckConstraint(
            "status IN ('uploaded', 'queued', 'processing', 'needs_review', 'ocr_required',"
            " 'approved', 'rejected', 'failed', 'archived')",
            name="status_valid",
        ),
        CheckConstraint(
            "document_type IN ('lease', 'insurance_policy', 'compliance_certificate',"
            " 'inspection_report', 'other', 'unknown')",
            name="document_type_valid",
        ),
        CheckConstraint("file_size_bytes > 0", name="file_size_positive"),
        CheckConstraint("sha256 ~ '^[0-9a-f]{64}$'", name="sha256_format"),
        Index("ix_documents_workspace_id_status", "workspace_id", "status"),
        Index("ix_documents_workspace_id_property_id", "workspace_id", "property_id"),
        # One live copy of the same file per workspace.
        Index(
            "ix_documents_workspace_id_sha256_live",
            "workspace_id",
            "sha256",
            unique=True,
            postgresql_where=text("status NOT IN ('archived', 'rejected', 'failed')"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"))
    property_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    original_filename: Mapped[str] = mapped_column(String(255))  # display only, never a path
    mime_type: Mapped[str] = mapped_column(String(120))
    file_size_bytes: Mapped[int] = mapped_column(BigInteger)
    sha256: Mapped[str] = mapped_column(CHAR(64))
    storage_key: Mapped[str] = mapped_column(Text, unique=True)
    document_type: Mapped[str] = mapped_column(String(40), server_default="unknown")
    status: Mapped[str] = mapped_column(String(30), server_default="uploaded")
    is_demo: Mapped[bool] = mapped_column(Boolean, server_default=false())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ProcessingJob(Base):
    """The execution mechanism for background work (claim, retry, lock). See gap file G7."""

    __tablename__ = "processing_jobs"
    __table_args__ = (
        ForeignKeyConstraint(
            ["document_id", "workspace_id"],
            ["documents.id", "documents.workspace_id"],
        ),
        CheckConstraint(
            "status IN ('queued', 'running', 'succeeded', 'failed', 'cancel_requested', 'cancelled')",
            name="status_valid",
        ),
        CheckConstraint("attempt_count >= 0", name="attempt_count_nonnegative"),
        CheckConstraint("max_attempts >= 1", name="max_attempts_positive"),
        Index("ix_processing_jobs_status_available_at", "status", "available_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"))
    document_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    job_type: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(24), server_default="queued")
    attempt_count: Mapped[int] = mapped_column(Integer, server_default="0")
    max_attempts: Mapped[int] = mapped_column(Integer, server_default="3")
    available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locked_by: Mapped[str | None] = mapped_column(String(120))
    idempotency_key: Mapped[str] = mapped_column(String(160), unique=True)
    error_code: Mapped[str | None] = mapped_column(String(80))
    error_summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )