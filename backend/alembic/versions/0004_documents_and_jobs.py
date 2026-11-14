"""documents and processing jobs

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-13
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("property_id", sa.Uuid(), nullable=True),
        sa.Column("uploaded_by", sa.Uuid(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=120), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("sha256", sa.CHAR(length=64), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("document_type", sa.String(length=40), server_default="unknown", nullable=False),
        sa.Column("status", sa.String(length=30), server_default="uploaded", nullable=False),
        sa.Column("is_demo", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('uploaded', 'queued', 'processing', 'needs_review', 'ocr_required',"
            " 'approved', 'rejected', 'failed', 'archived')",
            name=op.f("ck_documents_status_valid"),
        ),
        sa.CheckConstraint(
            "document_type IN ('lease', 'insurance_policy', 'compliance_certificate',"
            " 'inspection_report', 'other', 'unknown')",
            name=op.f("ck_documents_document_type_valid"),
        ),
        sa.CheckConstraint("file_size_bytes > 0", name=op.f("ck_documents_file_size_positive")),
        sa.CheckConstraint("sha256 ~ '^[0-9a-f]{64}$'", name=op.f("ck_documents_sha256_format")),
        sa.ForeignKeyConstraint(
            ["property_id", "workspace_id"],
            ["properties.id", "properties.workspace_id"],
            name=op.f("fk_documents_property_id_properties"),
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], name=op.f("fk_documents_workspace_id_workspaces")
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by"], ["users.id"], name=op.f("fk_documents_uploaded_by_users")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_documents")),
        sa.UniqueConstraint("storage_key", name=op.f("uq_documents_storage_key")),
        sa.UniqueConstraint("id", "workspace_id", name=op.f("uq_documents_id_workspace_id")),
    )
    op.create_index(
        op.f("ix_documents_workspace_id_status"), "documents", ["workspace_id", "status"], unique=False
    )
    op.create_index(
        op.f("ix_documents_workspace_id_property_id"),
        "documents",
        ["workspace_id", "property_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_documents_workspace_id_sha256_live"),
        "documents",
        ["workspace_id", "sha256"],
        unique=True,
        postgresql_where=sa.text("status NOT IN ('archived', 'rejected', 'failed')"),
    )

    op.create_table(
        "processing_jobs",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=True),
        sa.Column("job_type", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=24), server_default="queued", nullable=False),
        sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_attempts", sa.Integer(), server_default="3", nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_by", sa.String(length=120), nullable=True),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('queued', 'running', 'succeeded', 'failed', 'cancel_requested', 'cancelled')",
            name=op.f("ck_processing_jobs_status_valid"),
        ),
        sa.CheckConstraint(
            "attempt_count >= 0", name=op.f("ck_processing_jobs_attempt_count_nonnegative")
        ),
        sa.CheckConstraint(
            "max_attempts >= 1", name=op.f("ck_processing_jobs_max_attempts_positive")
        ),
        sa.ForeignKeyConstraint(
            ["document_id", "workspace_id"],
            ["documents.id", "documents.workspace_id"],
            name=op.f("fk_processing_jobs_document_id_documents"),
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], name=op.f("fk_processing_jobs_workspace_id_workspaces")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_processing_jobs")),
        sa.UniqueConstraint("idempotency_key", name=op.f("uq_processing_jobs_idempotency_key")),
    )
    op.create_index(
        op.f("ix_processing_jobs_status_available_at"),
        "processing_jobs",
        ["status", "available_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_processing_jobs_status_available_at"), table_name="processing_jobs")
    op.drop_table("processing_jobs")
    op.drop_index(op.f("ix_documents_workspace_id_sha256_live"), table_name="documents")
    op.drop_index(op.f("ix_documents_workspace_id_property_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_workspace_id_status"), table_name="documents")
    op.drop_table("documents")