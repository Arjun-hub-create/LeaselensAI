import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app": "LeaseLens AI"}


def test_ready_returns_503_when_database_is_unreachable(monkeypatch: pytest.MonkeyPatch) -> None:
    def broken_engine() -> None:
        raise RuntimeError("database is down")

    monkeypatch.setattr("app.api.v1.health.get_engine", broken_engine)
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable", "database": "unreachable"}


@pytest.mark.skipif(not settings.database_url, reason="DATABASE_URL is not set")
def test_ready_returns_ok_with_real_database() -> None:
    """Integration test: needs the leaselens-db container running."""
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "ok"}