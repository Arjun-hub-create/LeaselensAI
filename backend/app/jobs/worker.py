"""Background worker. Run from the backend folder:

    python -m app.jobs.worker          keep running and poll for jobs
    python -m app.jobs.worker --once   process everything that is ready, then stop
"""

import argparse
import logging
import os
import socket
import time
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import and_, delete, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_session_factory
from app.documents.extraction import ExtractionError, extract_pages
from app.models import Document, DocumentPage, ProcessingJob
from app.storage.local import DocumentStorage, get_storage

logger = logging.getLogger("leaselens.worker")

RETRY_BASE_SECONDS = 30  # waits 30s after the first failure, 60s after the second

# Fixed messages. The parser's own error text is never stored, because it can contain file content.
SUMMARIES = {
    "PDF_UNREADABLE": "The PDF could not be read. It may be damaged.",
    "PDF_ENCRYPTED": "The PDF is password-protected.",
    "TOO_MANY_PAGES": "The PDF has more pages than this build supports.",
    "STORAGE_MISSING": "The stored file could not be found.",
    "STORAGE_ERROR": "The stored file could not be read. It will be retried.",
    "DOCUMENT_MISSING": "The document record no longer exists.",
    "UNEXPECTED": "An unexpected error occurred. It will be retried.",
    "WORKER_CRASHED": "The worker stopped while processing this job.",
}


def claim_job(
    db: Session, worker_id: str, now: datetime, only_job_id: UUID | None = None
) -> ProcessingJob | None:
    """Atomically take one ready job. SKIP LOCKED means two workers never take the same one."""
    stale_before = now - timedelta(seconds=settings.job_stale_after_seconds)
    conditions = [
        ProcessingJob.job_type == "document_ingest",
        or_(
            and_(ProcessingJob.status == "queued", ProcessingJob.available_at <= now),
            # A job stuck as "running" belongs to a worker that most likely crashed.
            and_(ProcessingJob.status == "running", ProcessingJob.locked_at < stale_before),
        ),
    ]
    if only_job_id is not None:
        conditions.append(ProcessingJob.id == only_job_id)  # used by tests to target one job

    job = db.execute(
        select(ProcessingJob)
        .where(*conditions)
        .order_by(ProcessingJob.available_at, ProcessingJob.id)
        .limit(1)
        .with_for_update(skip_locked=True)
    ).scalar_one_or_none()
    if job is None:
        return None

    job.status = "running"
    job.locked_at = now
    job.locked_by = worker_id
    job.attempt_count += 1
    document = _load_document(db, job)
    if document is not None:
        document.status = "processing"
    db.commit()
    return job


def _load_document(db: Session, job: ProcessingJob) -> Document | None:
    if job.document_id is None:
        return None
    return db.execute(
        select(Document).where(
            Document.id == job.document_id,
            Document.workspace_id == job.workspace_id,
        )
    ).scalar_one_or_none()


def _ingest(db: Session, storage: DocumentStorage, job: ProcessingJob) -> None:
    document = _load_document(db, job)
    if document is None:
        raise ExtractionError("DOCUMENT_MISSING")

    data = storage.read_bytes(document.storage_key)
    pages = extract_pages(data, settings.max_pdf_pages)

    # Replace any pages from an earlier attempt, so a re-run never duplicates them.
    db.execute(delete(DocumentPage).where(DocumentPage.document_id == document.id))
    db.add_all(
        DocumentPage(
            workspace_id=document.workspace_id,
            document_id=document.id,
            page_number=page.page_number,
            extracted_text=page.text,
            has_text=page.has_text,
            page_metadata={"image_count": page.image_count, "char_count": len(page.text)},
        )
        for page in pages
    )

    # No readable text anywhere is NOT a success for the document: it needs OCR.
    # Otherwise it stays "processing" until classification and extraction exist.
    document.status = "processing" if any(page.has_text for page in pages) else "ocr_required"

    job.status = "succeeded"
    job.locked_at = None
    job.locked_by = None
    job.error_code = None
    job.error_summary = None
    db.commit()


def _record_failure(db: Session, job_id: UUID, code: str, retryable: bool) -> None:
    job = db.get(ProcessingJob, job_id)
    if job is None:
        return
    now = datetime.now(UTC)
    job.locked_at = None
    job.locked_by = None
    job.error_code = code
    job.error_summary = SUMMARIES.get(code, "Processing failed.")
    document = _load_document(db, job)

    if retryable and job.attempt_count < job.max_attempts:
        delay = RETRY_BASE_SECONDS * 2 ** (job.attempt_count - 1)
        job.status = "queued"
        job.available_at = now + timedelta(seconds=delay)
        if document is not None:
            document.status = "queued"
        logger.warning("job %s failed (%s), will retry in %ss", job_id, code, delay)
    else:
        job.status = "failed"
        if document is not None:
            document.status = "failed"
        logger.warning("job %s failed for good (%s)", job_id, code)
    db.commit()


def process_next_job(
    db: Session,
    storage: DocumentStorage,
    worker_id: str,
    only_job_id: UUID | None = None,
) -> bool:
    """Handle one job. Returns False only when there was nothing ready to do."""
    job = claim_job(db, worker_id, datetime.now(UTC), only_job_id)
    if job is None:
        return False
    job_id = job.id

    if job.attempt_count > job.max_attempts:
        # It has already been claimed the maximum number of times and the workers keep dying on it.
        _record_failure(db, job_id, "WORKER_CRASHED", retryable=False)
        return True

    try:
        _ingest(db, storage, job)
    except ExtractionError as error:
        db.rollback()
        _record_failure(db, job_id, error.code, error.retryable)
    except FileNotFoundError:
        db.rollback()
        _record_failure(db, job_id, "STORAGE_MISSING", retryable=False)
    except OSError:
        db.rollback()
        _record_failure(db, job_id, "STORAGE_ERROR", retryable=True)
    except Exception as error:  # noqa: BLE001 - one bad job must never kill the worker
        db.rollback()
        # Only the exception's type is logged. Its message and traceback can contain file text.
        logger.error("job %s hit an unexpected %s", job_id, type(error).__name__)
        _record_failure(db, job_id, "UNEXPECTED", retryable=True)
    else:
        logger.info("job %s succeeded", job_id)
    return True


def run(once: bool) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    storage = get_storage()
    worker_id = f"{socket.gethostname()}:{os.getpid()}"
    factory = get_session_factory()
    logger.info("worker %s started (once=%s)", worker_id, once)
    try:
        while True:
            with factory() as db:
                handled = process_next_job(db, storage, worker_id)
            if handled:
                continue
            if once:
                break
            time.sleep(settings.job_poll_seconds)
    except KeyboardInterrupt:
        pass
    logger.info("worker stopped")


def main() -> None:
    parser = argparse.ArgumentParser(description="LeaseLens background worker")
    parser.add_argument("--once", action="store_true", help="process ready jobs, then stop")
    run(once=parser.parse_args().once)


if __name__ == "__main__":
    main()