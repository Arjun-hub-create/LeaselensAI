"""fix ledger direction check so adjustments must have a direction

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-13
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE = "property_ledger_entries"
CONSTRAINT = "ck_property_ledger_entries_direction_matches_type"


def upgrade() -> None:
    op.drop_constraint(op.f(CONSTRAINT), TABLE, type_="check")
    op.create_check_constraint(
        op.f(CONSTRAINT),
        TABLE,
        "(entry_type = 'adjustment' AND direction IS NOT NULL"
        " AND direction IN ('increase', 'decrease'))"
        " OR (entry_type <> 'adjustment' AND direction IS NULL)",
    )


def downgrade() -> None:
    # Restores the earlier, flawed rule. Do not run downgrades unless asked.
    op.drop_constraint(op.f(CONSTRAINT), TABLE, type_="check")
    op.create_check_constraint(
        op.f(CONSTRAINT),
        TABLE,
        "(entry_type = 'adjustment' AND direction IN ('increase', 'decrease'))"
        " OR (entry_type <> 'adjustment' AND direction IS NULL)",
    )