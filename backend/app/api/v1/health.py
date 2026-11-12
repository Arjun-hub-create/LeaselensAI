from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.db.session import get_engine

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    app: str


class ReadyResponse(BaseModel):
    status: str
    database: str


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Basic liveness check. It reveals no configuration, paths or secrets."""
    return HealthResponse(status="ok", app=settings.app_name)


@router.get("/health/ready", response_model=ReadyResponse)
def ready(response: Response) -> ReadyResponse:
    """Readiness check: can the API reach the database? Error details are never returned."""
    try:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
    except (SQLAlchemyError, RuntimeError):
        # SQLAlchemyError: the database is down, unreachable or rejected us.
        # RuntimeError: DATABASE_URL is not configured.
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadyResponse(status="unavailable", database="unreachable")
    return ReadyResponse(status="ready", database="ok")