import uuid
from collections.abc import Iterator
from decimal import Decimal

import pytest
from sqlalchemy import Connection, text
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.db.session import get_engine

pytestmark = pytest.mark.skipif(
    not settings.database_url, reason="DATABASE_URL is not set"
)


@pytest.fixture
def connection() -> Iterator[Connection]:
    """A connection whose changes are always rolled back."""
    with get_engine().connect() as conn:
        transaction = conn.begin()
        try:
            yield conn
        finally:
            transaction.rollback()


def make_workspace(conn: Connection, slug: str) -> uuid.UUID:
    return conn.execute(
        text("INSERT INTO workspaces (name, slug) VALUES ('Test', :slug) RETURNING id"),
        {"slug": slug},
    ).scalar_one()


def make_property(
    conn: Connection,
    workspace_id: uuid.UUID,
    code: str = "PROP-T1",
    property_type: str = "residential",
    status: str = "active",
) -> uuid.UUID:
    return conn.execute(
        text(
            "INSERT INTO properties "
            "(workspace_id, property_code, name, property_type, city, country_code, status) "
            "VALUES (:w, :code, 'Test property', :ptype, 'Pune', 'IN', :status) RETURNING id"
        ),
        {"w": workspace_id, "code": code, "ptype": property_type, "status": status},
    ).scalar_one()


def add_ledger_entry(
    conn: Connection,
    workspace_id: uuid.UUID,
    property_id: uuid.UUID,
    entry_type: str,
    amount: str,
    direction: str | None = None,
) -> None:
    conn.execute(
        text(
            "INSERT INTO property_ledger_entries "
            "(workspace_id, property_id, entry_type, direction, amount, currency_code) "
            "VALUES (:w, :p, :t, :d, :a, 'INR')"
        ),
        {
            "w": workspace_id,
            "p": property_id,
            "t": entry_type,
            "d": direction,
            "a": Decimal(amount),
        },
    )


def test_invalid_property_type_is_rejected(connection: Connection) -> None:
    workspace_id = make_workspace(connection, "ws-a")
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_property(connection, workspace_id, property_type="castle")


def test_invalid_property_status_is_rejected(connection: Connection) -> None:
    workspace_id = make_workspace(connection, "ws-a")
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_property(connection, workspace_id, status="vacant")


def test_duplicate_property_code_in_same_workspace_is_rejected(
    connection: Connection,
) -> None:
    workspace_id = make_workspace(connection, "ws-a")
    make_property(connection, workspace_id, code="PROP-001")
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_property(connection, workspace_id, code="PROP-001")


def test_same_property_code_is_allowed_in_different_workspaces(
    connection: Connection,
) -> None:
    ws_a = make_workspace(connection, "ws-a")
    ws_b = make_workspace(connection, "ws-b")
    make_property(connection, ws_a, code="PROP-001")
    make_property(connection, ws_b, code="PROP-001")  # must not raise


def test_ledger_amount_must_be_positive(connection: Connection) -> None:
    workspace_id = make_workspace(connection, "ws-a")
    property_id = make_property(connection, workspace_id)
    with pytest.raises(IntegrityError), connection.begin_nested():
        add_ledger_entry(connection, workspace_id, property_id, "charge", "0.00")
    with pytest.raises(IntegrityError), connection.begin_nested():
        add_ledger_entry(connection, workspace_id, property_id, "payment", "-5.00")


def test_adjustment_needs_a_direction(connection: Connection) -> None:
    workspace_id = make_workspace(connection, "ws-a")
    property_id = make_property(connection, workspace_id)
    with pytest.raises(IntegrityError), connection.begin_nested():
        add_ledger_entry(connection, workspace_id, property_id, "adjustment", "10.00")
    add_ledger_entry(
        connection, workspace_id, property_id, "adjustment", "10.00", direction="increase"
    )  # valid, must not raise


def test_charge_must_not_have_a_direction(connection: Connection) -> None:
    workspace_id = make_workspace(connection, "ws-a")
    property_id = make_property(connection, workspace_id)
    with pytest.raises(IntegrityError), connection.begin_nested():
        add_ledger_entry(
            connection, workspace_id, property_id, "charge", "10.00", direction="increase"
        )


def test_ledger_entry_cannot_point_at_another_workspaces_property(
    connection: Connection,
) -> None:
    ws_a = make_workspace(connection, "ws-a")
    ws_b = make_workspace(connection, "ws-b")
    property_in_a = make_property(connection, ws_a)
    with pytest.raises(IntegrityError), connection.begin_nested():
        add_ledger_entry(connection, ws_b, property_in_a, "charge", "100.00")