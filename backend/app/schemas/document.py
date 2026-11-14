import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

DocumentStatus = Literal[
    "uploaded",
    "queued",
    "processing",
    "needs_review",
    "ocr_required",
    "approved",
    "rejected",
    "failed",
    "archived",
]
DocumentType = Literal[
    "lease",
    "insurance_policy",
    "compliance_certificate",
    "inspection_report",
    "other",
    "unknown",
]


class DocumentOut(BaseModel):
    """Note: the internal storage key is deliberately not included."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    property_id: uuid.UUID | None
    uploaded_by: uuid.UUID
    original_filename: str
    mime_type: str
    file_size_bytes: int
    sha256: str
    document_type: str
    status: str
    is_demo: bool
    created_at: datetime
    updated_at: datetime


class DocumentList(BaseModel):
    items: list[DocumentOut]
    total: int
    limit: int
    offset: int


class UploadResponse(BaseModel):
    document_id: uuid.UUID
    job_id: uuid.UUID
    status: str


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID | None
    job_type: str
    status: str
    attempt_count: int
    max_attempts: int
    error_code: str | None
    created_at: datetime
    updated_at: datetime