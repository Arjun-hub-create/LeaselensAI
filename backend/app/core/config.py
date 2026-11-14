from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> parents[3] is the project root
_PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """App settings. Values can be overridden by environment variables or a .env file."""

    app_env: str = "development"
    app_name: str = "LeaseLens AI"
    api_prefix: str = "/api/v1"
    database_url: str | None = None

    session_cookie_name: str = "ll_session"
    csrf_cookie_name: str = "ll_csrf"
    session_ttl_hours: int = 12
    cookie_secure: bool = False  # set COOKIE_SECURE=true when the app is served over HTTPS

    # Uploaded files live here, outside Git and outside the frontend. Override with STORAGE_ROOT.
    storage_root: str = str(_PROJECT_ROOT / "storage")
    max_upload_bytes: int = 26_214_400  # 25 MB, the limit in our security doc

    # Background worker. These are starting points to tune after measuring, not proven values.
    max_pdf_pages: int = 500
    job_stale_after_seconds: int = 900  # a "running" job older than this is assumed to have crashed
    job_poll_seconds: float = 3.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()