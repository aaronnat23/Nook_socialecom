import os

os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL", "postgresql+psycopg://lilac_app:lilac_local_only@127.0.0.1:55432/lilac_test"
)
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app, rate_buckets
from app.db import engine, Base


@pytest.fixture(autouse=True)
def clean_db():
    assert engine.url.database and engine.url.database.endswith("_test"), "Tests require a separate *_test database."
    Base.metadata.create_all(engine)
    with engine.begin() as c:
        names = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
        c.execute(text(f"TRUNCATE {names} CASCADE"))
    rate_buckets.clear()


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def user(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "alice@example.test", "password": "SecureTest!2026", "handle": "alice", "display_name": "Alice"},
    )
    assert r.status_code == 200, r.text
    result = r.json()
    result["headers"] = {"Authorization": f"Bearer {result['token']}"}
    client.post("/api/v1/me/seller-onboarding", headers=result["headers"], json={"accepted_terms": True})
    return result


@pytest.fixture
def other(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "bob@example.test", "password": "SecureTest!2026", "handle": "bobby", "display_name": "Bob"},
    )
    result = r.json()
    result["headers"] = {"Authorization": f"Bearer {result['token']}"}
    return result


@pytest.fixture
def product(client, user):
    shop = user["user"]["shop"]["id"]
    r = client.post(
        f"/api/v1/shops/{shop}/products",
        headers=user["headers"],
        json={
            "title": "Handmade mug",
            "description": "A genuine test fixture",
            "price_minor": 6800,
            "status": "published",
            "category": "Home & living",
            "variants": [
                {"sku": "MUG-1", "options": {"Finish": "Original"}, "price_minor": 6800, "stock": 5},
                {"sku": "MUG-2", "options": {"Finish": "Lilac"}, "price_minor": 7300, "stock": 2},
            ],
        },
    )
    assert r.status_code == 201, r.text
    return r.json()
