from collections.abc import Callable, Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.security import hash_password
from app.db.session import get_engine
from app.main import app
from app.models import User, Workspace, WorkspaceMembership

TEST_PASSWORD = "correct horse battery staple"


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
def api_app(db_session: Session) -> Iterator[FastAPI]:
    """The app wired to the rolled-back test session."""

    def override_get_db() -> Iterator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield app
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def client(api_app: FastAPI) -> TestClient:
    return TestClient(api_app)


@pytest.fixture
def make_workspace(db_session: Session) -> Callable[[str], Workspace]:
    def _make(slug: str) -> Workspace:
        workspace = Workspace(name=f"Workspace {slug}", slug=slug, is_demo=True)
        db_session.add(workspace)
        db_session.flush()
        return workspace

    return _make


@pytest.fixture
def make_user(db_session: Session) -> Callable[[str, Workspace, str], User]:
    def _make(email: str, workspace: Workspace, role: str) -> User:
        user = User(
            email=email,
            display_name="Test User",
            password_hash=hash_password(TEST_PASSWORD),
        )
        db_session.add(user)
        db_session.flush()
        db_session.add(WorkspaceMembership(workspace_id=workspace.id, user_id=user.id, role=role))
        db_session.flush()
        return user

    return _make


@pytest.fixture
def login(api_app: FastAPI) -> Callable[[str], TestClient]:
    """Returns a function that makes a fresh logged-in client for the given test user."""

    def _login(email: str) -> TestClient:
        test_client = TestClient(api_app)
        response = test_client.post(
            "/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, "test login failed"
        return test_client

    return _login