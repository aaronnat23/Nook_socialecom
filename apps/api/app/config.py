from pathlib import Path
from typing import Literal
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parents[1]
# The repository root when running from a checkout; unused (and harmless) once the API is deployed on its own.
ROOT = Path(__file__).resolve().parents[min(3, len(Path(__file__).resolve().parents) - 1)]
# The storefront schema and starter templates are shipped inside the API so it can be deployed without the monorepo.
CONTRACT = API_DIR / "contract"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    app_name: str = "Nook"
    database_url: str = "postgresql+psycopg://lilac_app:lilac_local_only@127.0.0.1:55432/lilac"
    environment: str = "development"
    auth_mode: Literal["local", "supabase"] = "local"
    local_auth_secret: str = ""
    sandbox_webhook_secret: str = ""
    cors_origins: list[str] = ["http://127.0.0.1:3000", "http://localhost:3000"]
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "shop-assets"
    cutout_model_path: str = ""
    # "files" keeps uploads on local disk (development); "database" keeps them in PostgreSQL so a host
    # with an ephemeral disk (a free web service, a serverless function) never loses them.
    storage_backend: Literal["files", "database"] = "files"
    # Run migrations and load the sample catalog into an empty database on start (serverless hosts have no release step).
    auto_migrate: bool = False

    @field_validator("database_url")
    @classmethod
    def driver(cls, value: str) -> str:
        """Hosted databases hand out postgres:// or postgresql:// URLs; SQLAlchemy needs the psycopg driver."""
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix) :]
        return value


settings = Settings()
if settings.environment != "development" and settings.auth_mode == "local":
    raise RuntimeError("Local authentication is restricted to development. Configure Supabase Auth.")

if settings.auth_mode == "supabase" and (
    not settings.supabase_url.startswith("https://") or not settings.supabase_publishable_key
):
    raise RuntimeError("Configure the Supabase HTTPS URL and publishable key before using Supabase authentication.")
if len(settings.sandbox_webhook_secret) < 32:
    raise RuntimeError("Set a random SANDBOX_WEBHOOK_SECRET of at least 32 characters.")
