"""properties and property ledger entries

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-12
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "properties",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("property_code", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("property_type", sa.String(length=40), nullable=False),
        sa.Column(
            "address",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("state_region", sa.String(length=100), nullable=True),
        sa.Column("country_code", sa.CHAR(length=2), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("is_demo", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "property_type IN ('residential', 'commercial', 'mixed_use', 'other')",
            name=op.f("ck_properties_property_type_valid"),
        ),
        sa.CheckConstraint(
            "status IN ('active', 'inactive', 'archived')",
            name=op.f("ck_properties_status_valid"),
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"],
            name=op.f("fk_properties_workspace_id_workspaces"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_properties")),
        sa.UniqueConstraint(
            "workspace_id", "property_code",
            name=op.f("uq_properties_workspace_id_property_code"),
        ),
        sa.UniqueConstraint("id", "workspace_id", name=op.f("uq_properties_id_workspace_id")),
    )
    op.create_index(
        op.f("ix_properties_workspace_id_status"),
        "properties",
        ["workspace_id", "status"],
        unique=False,
    )

    op.create_table(
        "property_ledger_entries",
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("property_id", sa.Uuid(), nullable=False),
        sa.Column("entry_type", sa.String(length=20), nullable=False),
        sa.Column("direction", sa.String(length=10), nullable=True),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency_code", sa.CHAR(length=3), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("reference", sa.String(length=80), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_demo", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.CheckConstraint(
            "entry_type IN ('charge', 'payment', 'adjustment')",
            name=op.f("ck_property_ledger_entries_entry_type_valid"),
        ),
        sa.CheckConstraint("amount > 0", name=op.f("ck_property_ledger_entries_amount_positive")),
        sa.CheckConstraint(
            "(entry_type = 'adjustment' AND direction IN ('increase', 'decrease'))"
            " OR (entry_type <> 'adjustment' AND direction IS NULL)",
            name=op.f("ck_property_ledger_entries_direction_matches_type"),
        ),
        sa.ForeignKeyConstraint(
            ["property_id", "workspace_id"],
            ["properties.id", "properties.workspace_id"],
            name=op.f("fk_property_ledger_entries_property_id_properties"),
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"],
            name=op.f("fk_property_ledger_entries_workspace_id_workspaces"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_property_ledger_entries")),
    )
    op.create_index(
        op.f("ix_property_ledger_entries_workspace_id_property_id"),
        "property_ledger_entries",
        ["workspace_id", "property_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_property_ledger_entries_workspace_id_property_id"),
        table_name="property_ledger_entries",
    )
    op.drop_table("property_ledger_entries")
    op.drop_index(op.f("ix_properties_workspace_id_status"), table_name="properties")
    op.drop_table("properties")