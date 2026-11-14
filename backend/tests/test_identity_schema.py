import uuid
from collections.abc import Iterator

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


def make_workspace(conn: Connection, slug: str = "test-ws") -> uuid.UUID:
    return conn.execute(
        text("INSERT INTO workspaces (name, slug) VALUES ('Test', :slug) RETURNING id"),
        {"slug": slug},
    ).scalar_one()


def make_user(conn: Connection, email: str = "a@example.com") -> uuid.UUID:
    return conn.execute(
        text(
            "INSERT INTO users (email, display_name, password_hash) "
            "VALUES (:email, 'A', 'not-a-real-hash') RETURNING id"
        ),
        {"email": email},
    ).scalar_one()


def test_tables_and_pgvector_exist(connection: Connection) -> None:
    tables = (
        connection.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        )
        .scalars()
        .all()
    )
    for expected in ("workspaces", "users", "workspace_memberships", "user_sessions"):
        assert expected in tables
    version = connection.execute(
        text("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
    ).scalar_one_or_none()
    assert version is not None


def test_invalid_workspace_status_is_rejected(connection: Connection) -> None:
    with pytest.raises(IntegrityError), connection.begin_nested():
        connection.execute(
            text("INSERT INTO workspaces (name, slug, status) VALUES ('T', 'bad', 'banana')")
        )


def test_uppercase_email_is_rejected(connection: Connection) -> None:
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_user(connection, email="Person@Example.com")


def test_invalid_role_is_rejected(connection: Connection) -> None:
    workspace_id = make_workspace(connection)
    user_id = make_user(connection)
    with pytest.raises(IntegrityError), connection.begin_nested():
        connection.execute(
            text(
                "INSERT INTO workspace_memberships (workspace_id, user_id, role) "
                "VALUES (:w, :u, 'superuser')"
            ),
            {"w": workspace_id, "u": user_id},
        )


def test_duplicate_membership_is_rejected(connection: Connection) -> None:
    workspace_id = make_workspace(connection)
    user_id = make_user(connection)
    insert = text(
        "INSERT INTO workspace_memberships (workspace_id, user_id, role) VALUES (:w, :u, 'viewer')"
    )
    connection.execute(insert, {"w": workspace_id, "u": user_id})
    with pytest.raises(IntegrityError), connection.begin_nested():
        connection.execute(insert, {"w": workspace_id, "u": user_id})