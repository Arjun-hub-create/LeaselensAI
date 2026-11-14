import uuid
from collections.abc import Callable
from dataclasses import dataclass

import pytest
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Property, User, Workspace

pytestmark = pytest.mark.skipif(not settings.database_url, reason="DATABASE_URL is not set")

BASE = "/api/v1/properties"
MANAGER_A = "a-manager@example.com"
REVIEWER_A = "a-reviewer@example.com"
VIEWER_A = "a-viewer@example.com"
MANAGER_B = "b-manager@example.com"


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


def payload(code: str = "PROP-100", **overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "property_code": code,
        "name": "Test Residency",
        "property_type": "residential",
        "address": {"line1": "12 Example Road"},
        "city": "Pune",
        "country_code": "in",
    }
    data.update(overrides)
    return data


def add_property(
    db: Session,
    workspace: Workspace,
    code: str,
    name: str = "Sample",
    property_type: str = "residential",
    status: str = "active",
) -> Property:
    prop = Property(
        workspace_id=workspace.id,
        property_code=code,
        name=name,
        property_type=property_type,
        city="Pune",
        country_code="IN",
        status=status,
    )
    db.add(prop)
    db.flush()
    return prop


def names(response: Response) -> list[str]:
    return [item["name"] for item in response.json()["items"]]


def test_listing_requires_login(client: TestClient) -> None:
    assert client.get(BASE).status_code == 401


def test_manager_creates_a_property_in_their_own_workspace(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    manager = login(MANAGER_A)
    response = manager.post(BASE, json=payload(), headers=csrf(manager))

    assert response.status_code == 201
    body = response.json()
    assert body["country_code"] == "IN"  # lower-case input was normalised
    saved = db_session.get(Property, uuid.UUID(body["id"]))
    assert saved is not None
    assert saved.workspace_id == world.ws_a.id


def test_a_client_cannot_choose_the_workspace(
    world: World, login: Callable[[str], TestClient]
) -> None:
    manager = login(MANAGER_A)
    response = manager.post(
        BASE, json=payload(workspace_id=str(world.ws_b.id)), headers=csrf(manager)
    )
    assert response.status_code == 422


@pytest.mark.usefixtures("world")
@pytest.mark.parametrize("email", [REVIEWER_A, VIEWER_A])
def test_reviewer_and_viewer_cannot_create(
    login: Callable[[str], TestClient], email: str
) -> None:
    user = login(email)
    assert user.post(BASE, json=payload(), headers=csrf(user)).status_code == 403


@pytest.mark.usefixtures("world")
def test_create_needs_the_csrf_header(login: Callable[[str], TestClient]) -> None:
    manager = login(MANAGER_A)
    assert manager.post(BASE, json=payload()).status_code == 403


@pytest.mark.usefixtures("world")
def test_duplicate_code_is_rejected_in_a_workspace_but_allowed_elsewhere(
    login: Callable[[str], TestClient],
) -> None:
    a = login(MANAGER_A)
    b = login(MANAGER_B)
    assert a.post(BASE, json=payload("PROP-1"), headers=csrf(a)).status_code == 201
    assert a.post(BASE, json=payload("PROP-1"), headers=csrf(a)).status_code == 409
    assert b.post(BASE, json=payload("PROP-1"), headers=csrf(b)).status_code == 201


@pytest.mark.usefixtures("world")
def test_invalid_property_type_is_rejected(login: Callable[[str], TestClient]) -> None:
    manager = login(MANAGER_A)
    response = manager.post(BASE, json=payload(property_type="castle"), headers=csrf(manager))
    assert response.status_code == 422


def test_list_only_returns_the_callers_workspace(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    add_property(db_session, world.ws_a, "A-1")
    add_property(db_session, world.ws_b, "B-1")

    viewer = login(VIEWER_A)  # viewers may read
    body = viewer.get(BASE).json()

    assert [item["property_code"] for item in body["items"]] == ["A-1"]
    assert body["total"] == 1


def test_reading_another_workspaces_property_is_404(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    other = add_property(db_session, world.ws_b, "B-1")

    assert login(VIEWER_A).get(f"{BASE}/{other.id}").status_code == 404
    assert login(MANAGER_B).get(f"{BASE}/{other.id}").status_code == 200


def test_updating_another_workspaces_property_is_404_and_changes_nothing(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    other = add_property(db_session, world.ws_b, "B-1", name="Original")
    manager = login(MANAGER_A)

    response = manager.patch(
        f"{BASE}/{other.id}", json={"name": "Hacked"}, headers=csrf(manager)
    )

    assert response.status_code == 404
    db_session.refresh(other)
    assert other.name == "Original"


def test_manager_can_update_a_property(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    prop = add_property(db_session, world.ws_a, "A-1")
    manager = login(MANAGER_A)

    response = manager.patch(
        f"{BASE}/{prop.id}",
        json={"name": "Renamed", "status": "inactive"},
        headers=csrf(manager),
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Renamed"
    assert response.json()["status"] == "inactive"


def test_viewer_cannot_update(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    prop = add_property(db_session, world.ws_a, "A-1")
    viewer = login(VIEWER_A)
    response = viewer.patch(f"{BASE}/{prop.id}", json={"name": "Nope"}, headers=csrf(viewer))
    assert response.status_code == 403


@pytest.mark.parametrize(
    "body",
    [{}, {"name": None}, {"status": "vacant"}, {"property_code": "NEW-CODE"}],
)
def test_bad_updates_are_rejected(
    world: World,
    login: Callable[[str], TestClient],
    db_session: Session,
    body: dict[str, object],
) -> None:
    prop = add_property(db_session, world.ws_a, "A-1")
    manager = login(MANAGER_A)
    response = manager.patch(f"{BASE}/{prop.id}", json=body, headers=csrf(manager))
    assert response.status_code == 422


def test_pagination(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    for code, name in [("P-1", "Alpha"), ("P-2", "Bravo"), ("P-3", "Charlie")]:
        add_property(db_session, world.ws_a, code, name=name)
    viewer = login(VIEWER_A)

    first = viewer.get(BASE, params={"limit": 2})
    second = viewer.get(BASE, params={"limit": 2, "offset": 2})

    assert names(first) == ["Alpha", "Bravo"]
    assert first.json()["total"] == 3
    assert names(second) == ["Charlie"]


def test_search_matches_name_and_code_and_escapes_wildcards(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    add_property(db_session, world.ws_a, "A-1", name="Alpha Tower")
    add_property(db_session, world.ws_a, "B-2", name="Bravo House")
    viewer = login(VIEWER_A)

    assert names(viewer.get(BASE, params={"q": "bravo"})) == ["Bravo House"]
    assert names(viewer.get(BASE, params={"q": "a-1"})) == ["Alpha Tower"]
    assert names(viewer.get(BASE, params={"q": "%"})) == []  # a literal %, not "match everything"


def test_filters_by_status_and_type(
    world: World, login: Callable[[str], TestClient], db_session: Session
) -> None:
    add_property(db_session, world.ws_a, "A-1", name="Alpha", property_type="commercial")
    add_property(db_session, world.ws_a, "A-2", name="Bravo", status="archived")
    viewer = login(VIEWER_A)

    assert names(viewer.get(BASE, params={"property_type": "commercial"})) == ["Alpha"]
    assert names(viewer.get(BASE, params={"status": "archived"})) == ["Bravo"]
    assert viewer.get(BASE, params={"status": "vacant"}).status_code == 422


@pytest.mark.usefixtures("world")
@pytest.mark.parametrize("limit", [0, 101])
def test_limit_must_be_between_1_and_100(
    login: Callable[[str], TestClient], limit: int
) -> None:
    viewer = login(VIEWER_A)
    assert viewer.get(BASE, params={"limit": limit}).status_code == 422