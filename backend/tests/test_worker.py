import io
import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pymupdf
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.jobs.worker import process_next_job
from app.models import Document, DocumentPage, ProcessingJob, User, Workspace
from app.storage.local import LocalDocumentStorage

pytestmark = pytest.mark.skipif(not settings.database_url, reason="DATABASE_URL is not set")

WORKER = "test-worker"


def make_pdf(page_texts: list[str | None]) -> bytes:
    """A real PDF. None means a page with no text at all, like a blank or scanned page."""
    document = pymupdf.open()
    for text in page_texts:
        page = document.new_page()
        if text:
            page.insert_text((72, 72), text)
    data = document.tobytes()
    document.close()
    return data


class FailingStorage(LocalDocumentStorage):
    """Pretends the disk is broken."""

    def read_bytes(self, storage_key: str) -> bytes:
        raise OSError("disk error secret-path")


@pytest.fixture
def ws(make_workspace: Callable[[str], Workspace]) -> Workspace:
    return make_workspace("ws-worker")


@pytest.fixture
def user(make_user: Callable[[str, Workspace, str], User], ws: Workspace) -> User:
    return make_user("worker-test@example.com", ws, "property_manager")


@pytest.fixture
def storage(tmp_path: Path) -> LocalDocumentStorage:
    return LocalDocumentStorage(tmp_path)


def seed(
    db: Session,
    storage: LocalDocumentStorage,
    ws: Workspace,
    user: User,
    data: bytes,
) -> tuple[Document, ProcessingJob]:
    document_id = uuid.uuid4()
    stored = storage.save_upload(ws.id, document_id, io.BytesIO(data), 25_000_000)
    document = Document(
        id=document_id,
        workspace_id=ws.id,
        uploaded_by=user.id,
        original_filename="test.pdf",
        mime_type="application/pdf",
        file_size_bytes=stored.size_bytes,
        sha256=stored.sha256,
        storage_key=stored.storage_key,
        status="queued",
    )
    db.add(document)
    db.flush()
    job = ProcessingJob(
        workspace_id=ws.id,
        document_id=document_id,
        job_type="document_ingest",
        idempotency_key=f"document_ingest:{document_id}",
    )
    db.add(job)
    db.flush()
    return document, job


def run_job(db: Session, storage: LocalDocumentStorage, job: ProcessingJob) -> bool:
    return process_next_job(db, storage, WORKER, only_job_id=job.id)


def pages_of(db: Session, document: Document) -> list[DocumentPage]:
    return list(
        db.execute(
            select(DocumentPage)
            .where(DocumentPage.document_id == document.id)
            .order_by(DocumentPage.page_number)
        ).scalars()
    )


def test_text_pdf_is_read_page_by_page(
    db_session: Session, storage: LocalDocumentStorage, ws: Workspace, user: User
) -> None:
    document, job = seed(db_session, storage, ws, user, make_pdf(["Hello page one", "Second page text"]))

    assert run_job(db_session, storage, job) is True

    db_session.refresh(job)
    db_session.refresh(document)
    assert job.status == "succeeded"
    assert job.attempt_count == 1
    assert job.error_code is None
    assert document.status == "processing"  # stays here until extraction exists

    pages = pages_of(db_session, document)
    assert [p.page_number for p in pages] == [1, 2]
    assert "Hello page one" in pages[0].extracted_text
    assert "Second page text" in pages[1].extracted_text
    assert all(p.has_text for p in pages)
    assert all(p.workspace_id == ws.id for p in pages)


def test_a_pdf_with_no_text_needs_ocr_and_is_not_called_a_success(
    db_session: Session, storage: LocalDocumentStorage, ws: Workspace, user: User
) -> None:
    document, job = seed(db_session, storage, ws, user, make_pdf([None, None]))

    run_job(db_session, storage, job)

    db_session.refresh(document)
    assert document.status == "ocr_required"
    pages = pages_of(db_session, document)
    assert len(pages) == 2
    assert not any(p.has_text for p in pages)


def test_a_mixed_pdf_keeps_going_and_marks_the_empty_page(
    db_session: Session, storage: LocalDocumentStorage, ws: Workspace, user: User
) -> None:
    document, job = seed(db_session, storage, ws, user, make_pdf(["Has text", None]))

    run_job(db_session, storage, job)

    db_session.refresh(document)
    assert document.status == "processing"
    first, second = pages_of(db_session, document)
    assert first.has_text is True
    assert second.has_text is False


def test_a_damaged_pdf_fails_immediately_without_retrying(
    db_session: Session, storage: LocalDocumentStorage, ws: Workspace, user: User
) -> None:
    document, job = seed(db_session, storage, ws, user, b"%PDF-1.4 this is not really a pdf")

    run_job(db_session, storage, job)

    db_session.refresh(job)
    db_session.refresh(document)
    assert job.status == "failed"
    assert job.attempt_count == 1
    assert job.error_code == "PDF_UNREADABLE"
    assert document.status == "failed"
    assert pages_of(db_session, document) == []


def test_a_missing_file_fails_immediately(
    db_session: Session,
    storage: LocalDocumentStorage,
    tmp_path: Path,
    ws: Workspace,
    user: User,
) -> None:
    document, job = seed(db_session, storage, ws, user, make_pdf(["x"]))
    (tmp_path / document.storage_key).unlink()

    run_job(db_session, storage, job)

    db_session.refresh(job)
    assert job.status == "failed"
    assert job.error_code == "STORAGE_MISSING"


def test_a_pdf_with_too_many_pages_is_refused(
    db_session: Session,
    storage: LocalDocumentStorage,
    monkeypatch: pytest.MonkeyPatch,
    ws: Workspace,
    user: User,
) -> None:
    monkeypatch.setattr(settings, "max_pdf_pages", 2)
    document, job = seed(db_session, storage, ws, user, make_pdf(["a", "b", "c"]))

    run_job(db_session, storage, job)

    db_session.refresh(job)
    assert job.status == "failed"
    assert job.error_code == "TOO_MANY_PAGES"
    assert pages_of(db_session, document) == []


def test_temporary_problems_are_retried_then_given_up_on(
    db_session: Session, tmp_path: Path, ws: Workspace, user: User
) -> None:
    broken = FailingStorage(tmp_path)
    document, job = seed(db_session, broken, ws, user, make_pdf(["x"]))

    run_job(db_session, broken, job)  # attempt 1
    db_session.refresh(job)
    db_session.refresh(document)
    assert job.status == "queued"
    assert job.attempt_count == 1
    assert job.error_code == "STORAGE_ERROR"
    assert job.available_at > datetime.now(UTC)  # it waits before the next try
    assert document.status == "queued"
    assert "secret" not in (job.error_summary or "")  # the raw error text is never stored

    for expected_attempt in (2, 3):
        job.available_at = datetime.now(UTC) - timedelta(seconds=1)
        db_session.flush()
        run_job(db_session, broken, job)
        db_session.refresh(job)
        assert job.attempt_count == expected_attempt

    db_session.refresh(document)
    assert job.status == "failed"
    assert document.status == "failed"


def test_an_unexpected_error_is_retried_and_its_message_is_not_stored(
    db_session: Session,
    storage: LocalDocumentStorage,
    monkeypatch: pytest.MonkeyPatch,
    ws: Workspace,
    user: User,
) -> None:
    def explode(data: bytes, max_pages: int) -> None:
        raise RuntimeError("boom with secret text")

    monkeypatch.setattr("app.jobs.worker.extract_pages", explode)
    _, job = seed(db_session, storage, ws, user, make_pdf(["x"]))

    run_job(db_session, storage, job)

    db_session.refresh(job)
    assert job.status == "queued"
    assert job.error_code == "UNEXPECTED"
    assert "secret" not in (job.error_summary or "")


def test_a_job_that_is_not_ready_yet_is_left_alone(
    db_session: Session, storage: LocalDocumentStorage, ws: Workspace, user: User
) -> None:
    _, job = seed(db_session, storage, ws, user, make_pdf(["x"]))
    job.available_at = datetime.now(UTC) + timedelta(hours=1)
    db_session.flush()

    assert run_job(db_session, storage, job) is False
    db_session.refresh(job)
    assert job.status == "queued"
    assert job.attempt_count == 0


def test_a_job_that_just_started_is_not_taken_by_another_worker(
    db_session: Session, storage: LocalDocumentStorage, ws: Workspace, user: User
) -> None:
    _, job = seed(db_session, storage, ws, user, make_pdf(["x"]))
    job.status = "running"
    job.locked_at = datetime.now(UTC)
    db_session.flush()

    assert run_job(db_session, storage, job) is False


def test_a_crashed_workers_job_is_picked_up_again(
    db_session: Session, storage: LocalDocumentStorage, ws: Workspace, user: User
) -> None:
    _, job = seed(db_session, storage, ws, user, make_pdf(["recovered text"]))
    job.status = "running"
    job.locked_at = datetime.now(UTC) - timedelta(hours=1)
    db_session.flush()

    assert run_job(db_session, storage, job) is True
    db_session.refresh(job)
    assert job.status == "succeeded"


def test_a_job_that_keeps_crashing_workers_is_given_up_on(
    db_session: Session, storage: LocalDocumentStorage, ws: Workspace, user: User
) -> None:
    document, job = seed(db_session, storage, ws, user, make_pdf(["x"]))
    job.status = "running"
    job.locked_at = datetime.now(UTC) - timedelta(hours=1)
    job.attempt_count = job.max_attempts
    db_session.flush()

    assert run_job(db_session, storage, job) is True
    db_session.refresh(job)
    db_session.refresh(document)
    assert job.status == "failed"
    assert job.error_code == "WORKER_CRASHED"
    assert document.status == "failed"


def test_running_a_job_again_replaces_pages_instead_of_duplicating_them(
    db_session: Session, storage: LocalDocumentStorage, ws: Workspace, user: User
) -> None:
    document, job = seed(db_session, storage, ws, user, make_pdf(["fresh text"]))
    db_session.add(
        DocumentPage(
            workspace_id=ws.id,
            document_id=document.id,
            page_number=5,
            extracted_text="left over from an earlier attempt",
            has_text=True,
        )
    )
    db_session.flush()

    run_job(db_session, storage, job)

    pages = pages_of(db_session, document)
    assert [p.page_number for p in pages] == [1]
    assert "fresh text" in pages[0].extracted_text


def test_an_empty_queue_returns_false(db_session: Session, storage: LocalDocumentStorage) -> None:
    assert process_next_job(db_session, storage, WORKER, only_job_id=uuid.uuid4()) is False