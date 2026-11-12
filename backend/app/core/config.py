from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """App settings. Values can be overridden by environment variables or a .env file."""

    app_env: str = "development"
    app_name: str = "LeaseLens AI"
    api_prefix: str = "/api/v1"
    database_url: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()