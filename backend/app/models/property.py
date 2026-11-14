import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    CHAR,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    false,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Property(Base):
    __tablename__ = "properties"
    __table_args__ = (
        UniqueConstraint("workspace_id", "property_code"),
        # Needed so other tables can point at (id, workspace_id) and stay in the same workspace.
        UniqueConstraint("id", "workspace_id"),
        CheckConstraint(
            "property_type IN ('residential', 'commercial', 'mixed_use', 'other')",
            name="property_type_valid",
        ),
        CheckConstraint(
            "status IN ('active', 'inactive', 'archived')", name="status_valid"
        ),
        Index("ix_properties_workspace_id_status", "workspace_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"))
    property_code: Mapped[str] = mapped_column(String(40))
    name: Mapped[str] = mapped_column(String(160))
    property_type: Mapped[str] = mapped_column(String(40))
    address: Mapped[dict[str, Any]] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb")
    )
    city: Mapped[str] = mapped_column(String(100))
    state_region: Mapped[str | None] = mapped_column(String(100))
    country_code: Mapped[str] = mapped_column(CHAR(2))
    status: Mapped[str] = mapped_column(String(20), server_default="active")
    is_demo: Mapped[bool] = mapped_column(Boolean, server_default=false())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PropertyLedgerEntry(Base):
    """Synthetic charges, payments and adjustments. Amounts are always positive."""

    __tablename__ = "property_ledger_entries"
    __table_args__ = (
        ForeignKeyConstraint(
            ["property_id", "workspace_id"],
            ["properties.id", "properties.workspace_id"],
        ),
        CheckConstraint(
            "entry_type IN ('charge', 'payment', 'adjustment')",
            name="entry_type_valid",
        ),
        CheckConstraint("amount > 0", name="amount_positive"),
               CheckConstraint(
            "(entry_type = 'adjustment' AND direction IS NOT NULL"
            " AND direction IN ('increase', 'decrease'))"
            " OR (entry_type <> 'adjustment' AND direction IS NULL)",
            name="direction_matches_type",
        ),
        Index(
            "ix_property_ledger_entries_workspace_id_property_id",
            "workspace_id",
            "property_id",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"))
    property_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    entry_type: Mapped[str] = mapped_column(String(20))
    direction: Mapped[str | None] = mapped_column(String(10))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    currency_code: Mapped[str] = mapped_column(CHAR(3))
    due_date: Mapped[date | None] = mapped_column(Date)
    posted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    reference: Mapped[str | None] = mapped_column(String(80))
    description: Mapped[str | None] = mapped_column(Text)
    is_demo: Mapped[bool] = mapped_column(Boolean, server_default=false())