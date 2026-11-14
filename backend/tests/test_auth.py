import hashlib
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import get_engine
from app.main import app
from app.models import User, UserSession, Workspace, WorkspaceMembership

pytestmark = pytest.mark.skipif(not settings.database_url, reason="DATABASE_URL is not set")

PASSWORD = "correct horse battery staple"
LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"
LOGOUT = "/api/v1/auth/logout"


@pytest.fixture
def db_session() -> Iterator[Session]:
    """A session inside an outer transaction that is always rolled back, so tests leave no data."""
    with get_engine().connect() as connection:
        outer = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            session.close()
            outer.rollback()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


def make_workspace(db: Session, slug: str = "test-auth-ws") -> Workspace:
    workspace = Workspace(name="Test workspace", slug=slug, is_demo=True)
    db.add(workspace)
    db.flush()
    return workspace


def make_user(
    db: Session,
    email: str,
    workspace: Workspace | None = None,
    role: str = "viewer",
    is_active: bool = True,
) -> User:
    user = User(
        email=email,
        display_name="Test User",
        password_hash=hash_password(PASSWORD),
        is_active=is_active,
    )
    db.add(user)
    db.flush()
    if workspace is not None:
        db.add(WorkspaceMembership(workspace_id=workspace.id, user_id=user.id, role=role))
        db.flush()
    return user


def log_in(client: TestClient, email: str, password: str = PASSWORD):
    return client.post(LOGIN, json={"email": email, "password": password})


def test_login_succeeds_and_sets_safe_cookies(client: TestClient, db_session: Session) -> None:
    workspace = make_workspace(db_session)
    make_user(db_session, "test-login@example.com", workspace, role="reviewer")

    response = log_in(client, " Test-Login@Example.com ")  # spaces and capitals are normalised

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "test-login@example.com"
    assert body["role"] == "reviewer"
    assert body["workspace"]["id"] == str(workspace.id)
    assert "password" not in response.text

    set_cookies = response.headers.get_list("set-cookie")
    session_cookie = next(c for c in set_cookies if c.startswith(f"{settings.session_cookie_name}="))
    assert "httponly" in session_cookie.lower()
    assert "samesite=lax" in session_cookie.lower()


def test_only_a_hash_of_the_session_token_is_stored(client: TestClient, db_session: Session) -> None:
    user = make_user(db_session, "test-hash@example.com", make_workspace(db_session))
    log_in(client, "test-hash@example.com")

    raw_token = client.cookies.get(settings.session_cookie_name)
    stored = db_session.execute(
        select(UserSession).where(UserSession.user_id == user.id)
    ).scalar_one()
    assert raw_token is not None
    assert stored.token_hash != raw_token
    assert stored.token_hash == hashlib.sha256(raw_token.encode()).hexdigest()


def test_wrong_password_and_unknown_email_look_identical(client: TestClient, db_session: Session) -> None:
    make_user(db_session, "test-known@example.com", make_workspace(db_session))

    wrong_password = log_in(client, "test-known@example.com", "not the password")
    unknown_email = log_in(client, "test-nobody@example.com", "not the password")

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


def test_me_requires_login(client: TestClient) -> None:
    assert client.get(ME).status_code == 401


def test_me_returns_the_logged_in_user(client: TestClient, db_session: Session) -> None:
    workspace = make_workspace(db_session)
    make_user(db_session, "test-me@example.com", workspace, role="admin")
    log_in(client, "test-me@example.com")

    response = client.get(ME)

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "test-me@example.com"
    assert response.json()["role"] == "admin"


def test_logout_needs_the_csrf_header(client: TestClient, db_session: Session) -> None:
    make_user(db_session, "test-csrf@example.com", make_workspace(db_session))
    log_in(client, "test-csrf@example.com")
    csrf = client.cookies.get(settings.csrf_cookie_name)
    assert csrf is not None

    assert client.post(LOGOUT).status_code == 403
    assert client.post(LOGOUT, headers={"X-CSRF-Token": "wrong"}).status_code == 403
    assert client.get(ME).status_code == 200  # still logged in after the failed attempts

    assert client.post(LOGOUT, headers={"X-CSRF-Token": csrf}).status_code == 204
    assert client.get(ME).status_code == 401


def test_a_logged_out_token_cannot_be_reused(client: TestClient, db_session: Session) -> None:
    make_user(db_session, "test-revoke@example.com", make_workspace(db_session))
    log_in(client, "test-revoke@example.com")
    raw_token = client.cookies.get(settings.session_cookie_name)
    csrf = client.cookies.get(settings.csrf_cookie_name)
    assert raw_token is not None and csrf is not None

    client.post(LOGOUT, headers={"X-CSRF-Token": csrf})

    reused = client.get(ME, headers={"Cookie": f"{settings.session_cookie_name}={raw_token}"})
    assert reused.status_code == 401


def test_an_expired_session_is_rejected(client: TestClient, db_session: Session) -> None:
    user = make_user(db_session, "test-expired@example.com", make_workspace(db_session))
    log_in(client, "test-expired@example.com")

    stored = db_session.execute(
        select(UserSession).where(UserSession.user_id == user.id)
    ).scalar_one()
    stored.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db_session.flush()

    assert client.get(ME).status_code == 401


def test_an_inactive_user_cannot_log_in(client: TestClient, db_session: Session) -> None:
    make_user(db_session, "test-inactive@example.com", make_workspace(db_session), is_active=False)
    assert log_in(client, "test-inactive@example.com").status_code == 401


def test_a_user_without_a_workspace_cannot_log_in(client: TestClient, db_session: Session) -> None:
    make_user(db_session, "test-nows@example.com", workspace=None)
    assert log_in(client, "test-nows@example.com").status_code == 403