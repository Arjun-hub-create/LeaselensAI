import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy import Connection, text
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.db.session import get_engine

pytestmark = pytest.mark.skipif(not settings.database_url, reason="DATABASE_URL is not set")

SHA_A = "a" * 64
SHA_B = "b" * 64
SHA_C = "c" * 64

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


def make_property(conn: Connection, workspace_id: uuid.UUID) -> uuid.UUID:
    return conn.execute(
        text(
            "INSERT INTO properties (workspace_id, property_code, name, property_type, city, country_code) "
            "VALUES (:w, 'P-1', 'Test', 'residential', 'Pune', 'IN') RETURNING id"
        ),
        {"w": workspace_id},
    ).scalar_one()


def make_document(
    conn: Connection,
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    sha: str = SHA_A,
    status: str = "queued",
    document_type: str = "unknown",
    size: int = 10,
    property_id: uuid.UUID | None = None,
) -> uuid.UUID:
    return conn.execute(
        text(
            "INSERT INTO documents (workspace_id, property_id, uploaded_by, original_filename, "
            "mime_type, file_size_bytes, sha256, storage_key, status, document_type) "
            "VALUES (:w, :p, :u, 'f.pdf', 'application/pdf', :size, :sha, :key, :status, :dtype) "
            "RETURNING id"
        ),
        {
            "w": workspace_id,
            "p": property_id,
            "u": user_id,
            "size": size,
            "sha": sha,
            "key": f"key-{uuid.uuid4()}",
            "status": status,
            "dtype": document_type,
        },
    ).scalar_one()


def make_job(
    conn: Connection,
    workspace_id: uuid.UUID,
    document_id: uuid.UUID | None,
    key: str = "job-1",
    status: str = "queued",
) -> None:
    conn.execute(
        text(
            "INSERT INTO processing_jobs (workspace_id, document_id, job_type, idempotency_key, status) "
            "VALUES (:w, :d, 'document_ingest', :key, :status)"
        ),
        {"w": workspace_id, "d": document_id, "key": key, "status": status},
    )


def test_invalid_document_status_is_rejected(connection: Connection) -> None:
    ws = make_workspace(connection, "ws-a")
    user = make_user(connection)
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_document(connection, ws, user, status="completed")  # removed by gap fix G2


def test_invalid_document_type_is_rejected(connection: Connection) -> None:
    ws = make_workspace(connection, "ws-a")
    user = make_user(connection)
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_document(connection, ws, user, document_type="spreadsheet")


def test_bad_hash_and_bad_size_are_rejected(connection: Connection) -> None:
    ws = make_workspace(connection, "ws-a")
    user = make_user(connection)
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_document(connection, ws, user, sha="not-a-sha256")
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_document(connection, ws, user, size=0)


def test_only_one_live_copy_of_a_file_per_workspace(connection: Connection) -> None:
    ws_a = make_workspace(connection, "ws-a")
    ws_b = make_workspace(connection, "ws-b")
    user = make_user(connection)
    first = make_document(connection, ws_a, user, sha=SHA_A)

    with pytest.raises(IntegrityError), connection.begin_nested():
        make_document(connection, ws_a, user, sha=SHA_A)

    make_document(connection, ws_b, user, sha=SHA_A)  # another workspace is fine
    make_document(connection, ws_a, user, sha=SHA_B)  # a different file is fine

    connection.execute(text("UPDATE documents SET status = 'archived' WHERE id = :id"), {"id": first})
    make_document(connection, ws_a, user, sha=SHA_A)  # allowed once the earlier copy is archived


def test_document_cannot_point_at_another_workspaces_property(connection: Connection) -> None:
    ws_a = make_workspace(connection, "ws-a")
    ws_b = make_workspace(connection, "ws-b")
    user = make_user(connection)
    property_in_a = make_property(connection, ws_a)

    make_document(connection, ws_a, user, property_id=property_in_a)  # same workspace: fine
    make_document(connection, ws_b, user, sha=SHA_B)  # no property at all: fine
    with pytest.raises(IntegrityError), connection.begin_nested():
                make_document(connection, ws_b, user, sha=SHA_C, property_id=property_in_a)


def test_job_rules(connection: Connection) -> None:
    ws_a = make_workspace(connection, "ws-a")
    ws_b = make_workspace(connection, "ws-b")
    user = make_user(connection)
    document = make_document(connection, ws_a, user)

    make_job(connection, ws_a, document, key="job-1")
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_job(connection, ws_a, document, key="job-1")  # idempotency key is unique
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_job(connection, ws_a, document, key="job-2", status="paused")
    with pytest.raises(IntegrityError), connection.begin_nested():
        make_job(connection, ws_b, document, key="job-3")  # job in B, document in A