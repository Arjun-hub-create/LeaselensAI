import hashlib
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Document, ProcessingJob, Property, User, Workspace
from app.storage.local import LocalDocumentStorage, get_storage

BASE = "/api/v1/documents"
JOBS = "/api/v1/jobs"
MANAGER_A = "a-manager@example.com"
REVIEWER_A = "a-reviewer@example.com"
VIEWER_A = "a-viewer@example.com"
MANAGER_B = "b-manager@example.com"


@pytest.fixture
def storage_root(api_app: FastAPI, tmp_path: Path) -> Path:
    """Send every upload to a temporary folder instead of the real storage folder."""
    api_app.dependency_overrides[get_storage] = lambda: LocalDocumentStorage(tmp_path)
    return tmp_path


pytestmark = [
    pytest.mark.skipif(not settings.database_url, reason="DATABASE_URL is not set"),
    pytest.mark.usefixtures("storage_root"),
]


@dataclass
class World:
    ws_a: Workspace
    ws_b: Workspace


@pytest.fixture
def world(
    make_workspace: Callable[[str], Workspace],
    make_user: Callable[[str, Workspace, str], User],
) -> World:
    ws_a = make_workspace("ws-a")
    ws_b = make_workspace("ws-b")
    make_user(MANAGER_A, ws_a, "property_manager")
    make_user(REVIEWER_A, ws_a, "reviewer")
    make_user(VIEWER_A, ws_a, "viewer")
    make_user(MANAGER_B, ws_b, "property_manager")
    return World(ws_a=ws_a, ws_b=ws_b)


def csrf(test_client: TestClient) -> dict[str, str]:
    return {"X-CSRF-Token": test_client.cookies.get(settings.csrf_cookie_name) or ""}


def pdf(extra: str = "") -> bytes:
    """Smallest thing that passes our checks: it starts with the PDF signature."""
    return b"%PDF-1.4\n" + extra.encode()


def upload(
    test_client: TestClient,
    data: bytes | None = None,
    filename: str = "lease.pdf",
    content_type: str = "application/pdf",
    property_id: uuid.UUID | None = None,
) -> Response:
    return test_client.post(
        BASE,
        files={"file": (filename, pdf("default") if data is None else data, content_type)},
        data={"property_id": str(property_id)} if property_id else None,
        headers=csrf(test_client),
    )


def stored_files(root: Path) -> list[str]:
    return sorted(p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file())


def add_property(db: Session, workspace: Workspace, code: str = "P-1") -> Property:
    prop = Property(
        workspace_id=workspace.id,
        property_code=code,
        name="Sample",
        property_type="residential",
        city="Pune",
        country_code="IN",
    )
    db.add(prop)
    db.flush()
    return prop


def test_upload_requires_login(client: TestClient) -> None:
    response = client.post(BASE, files={"file": ("a.pdf", pdf(), "application/pdf")})
    assert response.status_code == 401


def test_manager_uploads_a_pdf(
    world: World, login: Callable[[str], TestClient], db_session: Session, storage_root: Path
) -> None:
    manager = login(MANAGER_A)
    data = pdf("hello")

    response = upload(manager, data)

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    assert "storage_key" not in response.text

    document = db_session.get(Document, uuid.UUID(body["document_id"]))
    assert document is not None
    assert document.workspace_id == world.ws_a.id
    assert document.sha256 == hashlib.sha256(data).hexdigest()
    assert document.file_size_bytes == len(data)
    assert document.status == "queued"
    assert (storage_root / document.storage_key).read_bytes() == data

    job = db_session.get(ProcessingJob, uuid.UUID(body["job_id"]))
    assert job is not None
    assert job.status == "queued"
    assert job.document_id == document.id


@pytest.mark.usefixtures("world")
@pytest.mark.parametrize("email", [REVIEWER_A, VIEWER_A])
def test_reviewer_and_viewer_cannot_upload(
    login: Callable[[str], TestClient], email: str, storage_root: Path
) -> None:
    user = login(email)
    assert upload(user).status_code == 403
    assert stored_files(storage_root) == []


@pytest.mark.usefixtures("world")
def test_upload_needs_the_csrf_header(login: Callable[[str], TestClient]) -> None:
    manager = login(MANAGER_A)
    response = manager.post(BASE, files={"file": ("a.pdf", pdf(), "application/pdf")})
    assert response.status_code == 403


@pytest.mark.usefixtures("world")
def test_wrong_extension_is_rejected(
    login: Callable[[str], TestClient], storage_root: Path
) -> None:
    assert upload(login(MANAGER_A), filename="notes.txt").status_code == 415
    assert stored_files(storage_root) == []


@pytest.mark.usefixtures("world")
def test_wrong_declared_type_is_rejected(
    login: Callable[[str], TestClient], storage_root: Path
) -> None:
    assert upload(login(MANAGER_A), content_type="text/plain").status_code == 415
    assert stored_files(storage_root) == []


@pytest.mark.usefixtures("world")
def test_a_file_without_the_pdf_signature_is_rejected_and_leaves_nothing(
    login: Callable[[str], TestClient], storage_root: Path
) -> None:
    response = upload(login(MANAGER_A), data=b"MZ this is not a pdf")
    assert response.status_code == 415
    assert stored_files(storage_root) == []


@pytest.mark.usefixtures("world")
def test_an_empty_file_is_rejected(
    login: Callable[[str], TestClient], storage_root: Path
) -> None:
    assert upload(login(MANAGER_A), data=b"").status_code == 400
    assert stored_files(storage_root) == []


@pytest.mark.usefixtures("world")
def test_a_file_over_the_limit_is_rejected_and_leaves_nothing(
    login: Callable[[str], TestClient],
    monkeypatch: pytest.MonkeyPatch,
    storage_root: Path,
) -> None:
    monkeypatch.setattr(settings, "max_upload_bytes", 100)
    response = upload(login(MANAGER_A), data=pdf("x" * 500))
    assert response.status_code == 413
    assert stored_files(storage_root) == []


@pytest.mark.usefixtures("world")
def test_the_uploaded_file_name_never_becomes_a_path(
    login: Callable[[str], TestClient], db_session: Session, storage_root: Path
) -> None:
    response = upload(login(MANAGER_A), pdf("t"), filename="../../evil.pdf")

    assert response.status_code == 202
    document = db_session.get(Document, uuid.UUID(response.json()["document_id"]))
    assert document is not None
    assert document.original_filename == "evil.pdf"
    files = stored_files(storage_root)
    assert len(files) == 1
    assert files[0].endswith("/original.pdf")
    assert not (storage_root.parent / "evil.pdf").exists()


@pytest.mark.usefixtures("world")
def test_the_same_file_twice_is_rejected_but_another_workspace_may_upload_it(
    login: Callable[[str], TestClient], storage_root: Path
) -> None:
    a = login(MANAGER_A)
    b = login(MANAGER_B)
    data = pdf("same bytes")

    assert upload(a, data).status_code == 202
    assert upload(a, data).status_code == 409
    assert len(stored_files(storage_root)) == 1  # the rejected copy was removed

    assert upload(b, data).status_code == 202


def test_a_rejected_document_can_be_uploaded_again(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    manager = login(MANAGER_A)
    data = pdf("retry me")
    first = upload(manager, data)
    assert first.status_code == 202

    document = db_session.get(Document, uuid.UUID(first.json()["document_id"]))
    assert document is not None
    document.status = "rejected"
    db_session.flush()

    assert upload(manager, data).status_code == 202


def test_upload_can_attach_to_a_property_in_the_same_workspace(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    prop = add_property(db_session, world.ws_a)
    response = upload(login(MANAGER_A), property_id=prop.id)

    assert response.status_code == 202
    document = db_session.get(Document, uuid.UUID(response.json()["document_id"]))
    assert document is not None
    assert document.property_id == prop.id


def test_upload_to_another_workspaces_property_is_404_and_stores_nothing(
    world: World,
    login: Callable[[str], TestClient],
    db_session: Session,
    storage_root: Path,
) -> None:
    other = add_property(db_session, world.ws_b)
    response = upload(login(MANAGER_A), property_id=other.id)
    assert response.status_code == 404
    assert stored_files(storage_root) == []


@pytest.mark.usefixtures("world")
def test_listing_only_shows_the_callers_workspace(
    login: Callable[[str], TestClient],
) -> None:
    upload(login(MANAGER_A), pdf("a"), filename="alpha.pdf")
    upload(login(MANAGER_B), pdf("b"), filename="bravo.pdf")

    viewer = login(VIEWER_A)  # viewers may read
    body = viewer.get(BASE).json()

    assert [item["original_filename"] for item in body["items"]] == ["alpha.pdf"]
    assert body["total"] == 1
    assert "storage_key" not in viewer.get(BASE).text


@pytest.mark.usefixtures("world")
def test_reading_another_workspaces_document_is_404(
    login: Callable[[str], TestClient],
) -> None:
    uploaded = upload(login(MANAGER_B), pdf("b"))
    document_id = uploaded.json()["document_id"]

    assert login(VIEWER_A).get(f"{BASE}/{document_id}").status_code == 404
    assert login(MANAGER_B).get(f"{BASE}/{document_id}").status_code == 200


@pytest.mark.usefixtures("world")
def test_job_status_is_visible_only_inside_the_workspace(
    login: Callable[[str], TestClient],
) -> None:
    uploaded = upload(login(MANAGER_A), pdf("a"))
    job_id = uploaded.json()["job_id"]

    inside = login(VIEWER_A).get(f"{JOBS}/{job_id}")
    assert inside.status_code == 200
    assert inside.json()["status"] == "queued"
    assert login(MANAGER_B).get(f"{JOBS}/{job_id}").status_code == 404


@pytest.mark.usefixtures("world")
def test_filters_and_search(login: Callable[[str], TestClient]) -> None:
    manager = login(MANAGER_A)
    upload(manager, pdf("a"), filename="alpha.pdf")
    upload(manager, pdf("b"), filename="bravo_lease.pdf")

    def names(response: Response) -> list[str]:
        return [item["original_filename"] for item in response.json()["items"]]

    assert names(manager.get(BASE, params={"q": "bravo"})) == ["bravo_lease.pdf"]
    assert names(manager.get(BASE, params={"q": "%"})) == []  # a literal %, not a wildcard
    assert len(names(manager.get(BASE, params={"status": "queued"}))) == 2
    assert names(manager.get(BASE, params={"status": "approved"})) == []
    assert manager.get(BASE, params={"status": "banana"}).status_code == 422