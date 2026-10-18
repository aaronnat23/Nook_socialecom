from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    app_name: str = "Lilac"
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


settings = Settings()
if settings.environment != "development" and settings.auth_mode == "local":
    raise RuntimeError("Local authentication is restricted to development. Configure Supabase Auth.")

if settings.auth_mode == "supabase" and (
    not settings.supabase_url.startswith("https://") or not settings.supabase_publishable_key
):
    raise RuntimeError("Configure the Supabase HTTPS URL and publishable key before using Supabase authentication.")
if len(settings.sandbox_webhook_secret) < 32:
    raise RuntimeError("Set a random SANDBOX_WEBHOOK_SECRET of at least 32 characters.")
