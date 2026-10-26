"""Image storage: local disk, PostgreSQL, or server-only Supabase Storage, behind one small interface.

Whatever the backend, readers get a local file path (a cache), because the routes serve files.
"""

import tempfile
from pathlib import Path
import httpx
from fastapi import HTTPException
from .config import ROOT, settings
from .models import Asset, AssetBlob


def _cache_directory() -> Path:
    """The repo's .local/uploads in development; the system temp dir when the filesystem is read-only."""
    for candidate in (ROOT / ".local/uploads", Path(tempfile.gettempdir()) / "nook-uploads"):
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            probe = candidate / ".write-test"
            probe.write_bytes(b"")
            probe.unlink()
            return candidate
        except OSError:
            continue
    raise RuntimeError("No writable directory for the image cache.")


DIRECTORY = _cache_directory()


def store(asset_id: str, path: str, payload: bytes) -> None:
    if settings.storage_backend == "database":
        from .db import SessionLocal  # imported late: db imports config, storage is imported by main

        with SessionLocal() as db:
            db.merge(AssetBlob(asset_id=asset_id, data=payload))
            db.commit()
    elif settings.supabase_url and settings.supabase_service_role_key:
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
    if settings.storage_backend == "database":
        from .db import SessionLocal

        with SessionLocal() as db:
            blob = db.get(AssetBlob, asset.id)
        if not blob:
            raise HTTPException(404, "Image is unavailable.")
        path.write_bytes(blob.data)
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
