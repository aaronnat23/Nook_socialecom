"""Server-only Supabase storage with a local development/cache adapter."""

from pathlib import Path
import httpx
from fastapi import HTTPException
from .config import ROOT, settings
from .models import Asset

DIRECTORY = ROOT / ".local/uploads"
DIRECTORY.mkdir(parents=True, exist_ok=True)


def store(asset_id: str, path: str, payload: bytes) -> None:
    if settings.supabase_url and settings.supabase_service_role_key:
        with httpx.Client(timeout=30) as client:
            r = client.post(
                f"{settings.supabase_url}/storage/v1/object/{settings.supabase_storage_bucket}/{path}",
                content=payload,
                headers={"Authorization": f"Bearer {settings.supabase_service_role_key}", "Content-Type": "image/webp"},
            )
        if r.status_code >= 300:
            raise HTTPException(502, "Image storage is unavailable. Please retry.")
    (DIRECTORY / f"{asset_id}.webp").write_bytes(payload)


def local_path(asset: Asset) -> Path:
    path = DIRECTORY / f"{asset.id}.webp"
    if path.exists():
        return path
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(404, "Image is unavailable locally.")
    with httpx.Client(timeout=20) as client:
        r = client.get(
            f"{settings.supabase_url}/storage/v1/object/authenticated/{settings.supabase_storage_bucket}/{asset.path}",
            headers={"Authorization": f"Bearer {settings.supabase_service_role_key}"},
        )
    if r.status_code != 200:
        raise HTTPException(502, "Image storage is temporarily unavailable.")
    if len(r.content) > 10 * 1024 * 1024 or not r.content.startswith(b"RIFF"):
        raise HTTPException(502, "Stored image is invalid.")
    path.write_bytes(r.content)
    return path
