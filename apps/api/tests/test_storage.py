from app import storage
from app.config import settings
from app.db import SessionLocal
from app.models import AssetBlob
from tests.test_stage import PHOTO, upload


def test_database_backend_survives_losing_the_disk(client, user, monkeypatch):
    """A host with an ephemeral disk wipes the cache; the image must still come back from PostgreSQL."""
    monkeypatch.setattr(settings, "storage_backend", "database")
    asset_id = upload(client, user, PHOTO.read_bytes())
    with SessionLocal() as db:
        blob = db.get(AssetBlob, asset_id)
        assert blob is not None and blob.data.startswith(b"RIFF")

    (storage.DIRECTORY / f"{asset_id}.webp").unlink()
    r = client.get(f"/api/v1/assets/{asset_id}", headers=user["headers"])
    assert r.status_code == 200
    assert r.content == blob.data
    assert (storage.DIRECTORY / f"{asset_id}.webp").exists()


def test_hosted_database_urls_get_the_psycopg_driver():
    for url in ("postgres://u:p@host:5432/db", "postgresql://u:p@host:5432/db"):
        assert (
            type(settings).model_validate({"database_url": url}).database_url == "postgresql+psycopg://u:p@host:5432/db"
        )
    kept = "postgresql+psycopg://u:p@host/db"
    assert type(settings).model_validate({"database_url": kept}).database_url == kept
