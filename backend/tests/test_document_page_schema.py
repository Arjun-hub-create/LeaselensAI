import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy import Connection, text
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.db.session import get_engine

pytestmark = pytest.mark.skipif(not settings.database_url, reason="DATABASE_URL is not set")


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


def make_user(conn: Connection) -> uuid.UUID:
    return conn.execute(
        text(
            "INSERT INTO users (email, display_name, password_hash) "
            "VALUES (:email, 'U', 'not-a-real-hash') RETURNING id"
        ),
        {"email": f"{uuid.uuid4()}@example.com"},
    ).scalar_one()


def make_document(
    conn: Connection, workspace_id: uuid.UUID, user_id: uuid.UUID, sha_char: str
) -> uuid.UUID:
    return conn.execute(
        text(
            "INSERT INTO documents (workspace_id, uploaded_by, original_filename, mime_type, "
            "file_size_bytes, sha256, storage_key) "
            "VALUES (:w, :u, 'f.pdf', 'application/pdf', 10, :sha, :key) RETURNING id"
        ),
        {"w": workspace_id, "u": user_id, "sha": sha_char * 64, "key": f"key-{uuid.uuid4()}"},
    ).scalar_one()


def add_page(
    conn: Connection,
    workspace_id: uuid.UUID,
    document_id: uuid.UUID,
    page_number: int,
    body: str = "hello",
    has_text: bool = True,
) -> None:
    conn.execute(
        text(
            "INSERT INTO document_pages (workspace_id, document_id, page_number, extracted_text, has_text) "
            "VALUES (:w, :d, :n, :body, :h)"
        ),
        {"w": workspace_id, "d": document_id, "n": page_number, "body": body, "h": has_text},
    )


def test_page_numbers_start_at_one(connection: Connection) -> None:
    ws = make_workspace(connection, "ws-a")
    document = make_document(connection, ws, make_user(connection), "a")
    add_page(connection, ws, document, 1)  # valid, must not raise
    with pytest.raises(IntegrityError), connection.begin_nested():
        add_page(connection, ws, document, 0)
    with pytest.raises(IntegrityError), connection.begin_nested():
        add_page(connection, ws, document, -3)


def test_a_document_cannot_have_the_same_page_twice(connection: Connection) -> None:
    ws = make_workspace(connection, "ws-a")
    document = make_document(connection, ws, make_user(connection), "a")
    add_page(connection, ws, document, 1)
    with pytest.raises(IntegrityError), connection.begin_nested():
        add_page(connection, ws, document, 1, body="a different text")


def test_two_documents_can_each_have_a_page_one(connection: Connection) -> None:
    ws = make_workspace(connection, "ws-a")
    user = make_user(connection)
    first = make_document(connection, ws, user, "a")
    second = make_document(connection, ws, user, "b")
    add_page(connection, ws, first, 1)
    add_page(connection, ws, second, 1)  # must not raise


def test_a_page_cannot_point_at_another_workspaces_document(connection: Connection) -> None:
    ws_a = make_workspace(connection, "ws-a")
    ws_b = make_workspace(connection, "ws-b")
    document_in_a = make_document(connection, ws_a, make_user(connection), "a")

    add_page(connection, ws_a, document_in_a, 1)  # same workspace: fine
    with pytest.raises(IntegrityError), connection.begin_nested():
        add_page(connection, ws_b, document_in_a, 1)


def test_an_image_only_page_can_be_stored_with_no_text(connection: Connection) -> None:
    ws = make_workspace(connection, "ws-a")
    document = make_document(connection, ws, make_user(connection), "a")
    add_page(connection, ws, document, 1, body="", has_text=False)  # an empty string is allowed
    stored = connection.execute(
        text(
            "SELECT has_text, extracted_text, metadata FROM document_pages "
            "WHERE document_id = :document_id"
        ),
        {"document_id": document},
    ).one()
    assert stored.has_text is False
    assert stored.extracted_text == ""
    assert stored.metadata == {}