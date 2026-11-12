from functools import lru_cache

from sqlalchemy import Engine, create_engine

from app.core.config import settings


@lru_cache
def get_engine() -> Engine:
    """Create the database engine on first use, so importing the app never needs a database."""
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not set")
    return create_engine(
        settings.database_url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5},  # fail in 5 seconds instead of waiting forever
    )