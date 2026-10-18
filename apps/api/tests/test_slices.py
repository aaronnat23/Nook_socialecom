import copy, io, json, time
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
from sqlalchemy import select
from app.db import SessionLocal
from app.models import Variant, Order, Audit
from app.main import THEMES
from app.payments import provider

P = "/api/v1"


def test_collection_order_edits_enforce_ownership_and_unique_products(client, user, other, product):
    shop = user["user"]["shop"]["id"]
    path = f"{P}/shops/{shop}/collections"
    second = client.post(
        f"{P}/shops/{shop}/products",
        headers=user["headers"],
        json={
            "title": "Companion bowl",
            "price_minor": 5000,
            "variants": [{"sku": "BOWL-1", "price_minor": 5000, "stock": 4}],
        },
    ).json()
    body = {"title": "Daily rituals", "product_ids": [product["id"], second["id"]]}
    r = client.post(path, headers=user["headers"], json=body)
    assert r.status_code == 200
    edit = path + "/" + r.json()["id"]
    body = {"title": "A quieter morning", "product_ids": [second["id"], product["id"]]}
    assert client.patch(edit, headers=other["headers"], json=body).status_code == 404
    assert client.patch(edit, headers=user["headers"], json=body).status_code == 200
    assert client.get(path).json()["items"][0]["product_ids"] == body["product_ids"]
    assert (
        client.patch(
            edit, headers=user["headers"], json={**body, "product_ids": [product["id"], product["id"]]}
        ).status_code
        == 422
    )
    assert (
        client.patch(edit, headers=user["headers"], json={**body, "product_ids": ["unknown-product"]}).status_code
        == 422
    )
    other_shop = other["user"]["shop"]["id"]
    foreign = client.post(
        f"{P}/shops/{other_shop}/collections",
        headers=other["headers"],
        json={"title": "Another shop", "product_ids": []},
    ).json()
    assert client.patch(path + "/" + foreign["id"], headers=user["headers"], json=body).status_code == 404
    assert client.get(path).json()["items"][0]["title"] == "A quieter morning"


def draft(client, user):
    return client.get(f"{P}/shops/{user['user']['shop']['id']}/draft", headers=user["headers"]).json()


def save(client, user, d):
    return client.patch(
        f"{P}/shops/{user['user']['shop']['id']}/draft",
        headers={**user["headers"], "If-Match": str(d["revision"])},
        json={"document": d["document"], "baseRevision": d["revision"], "clientMutationId": "test-mutation"},
    )


def publish(client, user, revision):
    return client.post(
        f"{P}/shops/{user['user']['shop']['id']}/publish", headers=user["headers"], json={"expectedRevision": revision}
    )


def checkout(client, user, product, key="order-one", quantity=1):
    return client.post(
        P + "/checkout/session",
        headers={**user["headers"], "Idempotency-Key": key},
        json={
            "items": [{"variant_id": product["variants"][0]["id"], "quantity": quantity}],
            "address": {
                "name": "Test Buyer",
                "line1": "123 Test Road",
                "city": "Kuala Lumpur",
                "postcode": "50000",
                "country": "MY",
            },
        },
    )


def test_foundation_and_auth(client, user):
    assert client.get("/health").json()["database"] == "postgresql"
    assert client.get(P + "/me").status_code == 401
    assert client.get(P + "/me", headers=user["headers"]).json()["handle"] == "alice"
    assert (
        client.post(
            P + "/auth/login", json={"email": "alice@example.test", "password": "incorrectpassword"}
        ).status_code
        == 401
    )
    assert client.post(P + "/auth/refresh", headers=user["headers"]).status_code == 200
    assert (
        client.post(
            P + "/auth/register", json={"email": "other@example.test", "password": "SecureTest!2026", "handle": "alice"}
        ).status_code
        == 409
    )
    assert client.patch(P + "/me", headers=user["headers"], json={"is_admin": True}).status_code == 422
    assert client.get(P + "/admin/reports", headers=user["headers"]).status_code == 403


def test_draft_publish_restore_and_conflict(client, user):
    shop = user["user"]["shop"]["id"]
    d = draft(client, user)
    assert publish(client, user, d["revision"]).status_code == 200
    original = client.get(f"{P}/shops/{shop}/published").json()["document"]
    d["document"]["sections"][0]["children"][1]["props"]["headline"] = "A private new headline"
    r = save(client, user, d)
    assert r.status_code == 200, r.text
    assert save(client, user, d).status_code == 409
    assert client.get(f"{P}/shops/{shop}/published").json()["document"] == original
    assert publish(client, user, r.json()["revision"]).status_code == 200
    versions = client.get(f"{P}/shops/{shop}/versions", headers=user["headers"]).json()["items"]
    assert len(versions) == 2
    restored = client.post(
        f"{P}/shops/{shop}/restore",
        headers=user["headers"],
        json={"versionId": versions[-1]["id"], "expectedRevision": r.json()["revision"]},
    )
    assert restored.status_code == 200
    assert restored.json()["document"] == original
    assert client.get(f"{P}/shops/{shop}/published").json()["document"] != original
    assert len(client.get(f"{P}/shops/{shop}/versions", headers=user["headers"]).json()["items"]) == 2


def test_private_tenant_authorization(client, user, other, product):
    shop = user["user"]["shop"]["id"]
    for path in ["draft", "versions", "products", "orders"]:
        assert client.get(f"{P}/shops/{shop}/{path}", headers=other["headers"]).status_code == 404
    d = draft(client, user)
    assert (
        client.patch(
            f"{P}/shops/{shop}/draft",
            headers={**other["headers"], "If-Match": "1"},
            json={"document": d["document"], "baseRevision": 1, "clientMutationId": "x"},
        ).status_code
        == 404
    )
    assert client.post(f"{P}/products/{product['id']}/archive", headers=other["headers"]).status_code == 404


def test_all_eight_templates_and_strict_schema(client, user):
    assert len(client.get(P + "/themes").json()["items"]) == 8
    for theme in THEMES:
        d = draft(client, user)
        d["document"] = copy.deepcopy(theme["document"])
        d["document"]["shopId"] = user["user"]["shop"]["id"]
        r = save(client, user, d)
        assert r.status_code == 200, (theme["name"], r.text)
        assert publish(client, user, r.json()["revision"]).status_code == 200


def test_unsafe_content_and_missing_preconditions(client, user):
    d = draft(client, user)
    shop = user["user"]["shop"]["id"]
    assert (
        client.patch(
            f"{P}/shops/{shop}/draft",
            headers=user["headers"],
            json={"document": d["document"], "baseRevision": 1, "clientMutationId": "x"},
        ).status_code
        == 428
    )
    bad = copy.deepcopy(d)
    bad["document"]["sections"][0]["children"][0]["props"]["headline"] = "<script>alert(1)</script>"
    assert save(client, user, bad).status_code == 422
    bad = copy.deepcopy(d)
    bad["document"]["sections"][0]["children"][1]["props"]["cta"]["url"] = "javascript:alert(1)"
    assert save(client, user, bad).status_code == 422
    bad = copy.deepcopy(d)
    bad["document"]["sections"][0]["children"][0]["style"]["position"] = "fixed"
    assert save(client, user, bad).status_code == 422
    bad = copy.deepcopy(d)
    bad["document"]["sections"][0]["children"].append(bad["document"]["sections"][0]["children"][0])
    assert save(client, user, bad).status_code == 422
    bad = copy.deepcopy(d)
    bad["document"]["sections"][0]["children"][1]["props"]["imageAssetId"] = "seed_hero_99"
    assert save(client, user, bad).status_code == 422


def test_upload_privacy_magic_bytes_and_publish(client, user, other):
    shop = user["user"]["shop"]["id"]
    r = client.post(
        P + "/uploads",
        headers=user["headers"],
        data={"shop_id": shop, "alt": "Mug photo"},
        files={"file": ("x.jpg", b"<svg onload=alert(1)>", "image/jpeg")},
    )
    assert r.status_code == 422
    im = Image.new("RGB", (100, 80), "purple")
    out = io.BytesIO()
    im.save(out, "PNG")
    r = client.post(
        P + "/uploads",
        headers=user["headers"],
        data={"shop_id": shop, "alt": "Mug photo"},
        files={"file": ("mug.png", out.getvalue(), "image/png")},
    )
    assert r.status_code == 201, r.text
    asset = r.json()["id"]
    assert client.get(f"/media/{asset}.webp").status_code == 404
    assert client.get(f"{P}/assets/{asset}", headers=other["headers"]).status_code == 404
    assert client.get(f"{P}/assets/{asset}", headers=user["headers"]).status_code == 200
    d = draft(client, user)
    d["document"]["sections"][0]["children"][1]["props"]["imageAssetId"] = asset
    r = save(client, user, d)
    assert r.status_code == 200
    assert publish(client, user, r.json()["revision"]).status_code == 200
    assert client.get(f"/media/{asset}.webp").status_code == 200


def test_catalog_search_follows_and_favorites(client, user, product):
    assert product["variants"][0]["stock"] == 5
    found = client.get(P + "/search?q=handmade").json()["items"]
    assert len(found) == 1
    assert publish(client, user, 1).status_code == 200
    shop = user["user"]["shop"]["id"]
    for _ in range(2):
        assert client.post(f"{P}/shops/{shop}/follow", headers=user["headers"]).status_code == 200
        assert client.post(f"{P}/products/{product['id']}/favorite", headers=user["headers"]).status_code == 200
    me = client.get(P + "/me", headers=user["headers"]).json()
    assert len(me["following"]) == 1 and len(me["favorites"]) == 1 and me["shop"]["followers"] == 1
    assert client.delete(f"{P}/products/{product['id']}/favorite", headers=user["headers"]).status_code == 200
    assert client.post(f"{P}/products/{product['id']}/archive", headers=user["headers"]).status_code == 200
    assert client.get(P + "/search?q=handmade").json()["items"] == []
    assert client.get(f"{P}/products/{product['id']}").status_code == 404


def test_authoritative_quote_and_idempotent_checkout(client, user, product):
    vid = product["variants"][0]["id"]
    q = client.post(
        P + "/checkout/quote", headers=user["headers"], json={"items": [{"variant_id": vid, "quantity": 2}]}
    )
    assert q.json()["total_minor"] == 14400
    assert (
        client.post(
            P + "/checkout/quote",
            headers=user["headers"],
            json={"items": [{"variant_id": vid, "quantity": 1}], "total_minor": 1},
        ).status_code
        == 422
    )
    a = checkout(client, user, product)
    b = checkout(client, user, product)
    assert a.status_code == 201 and b.status_code == 201
    assert a.json()["id"] == b.json()["id"]
    assert a.json()["total_minor"] == 7600
    with SessionLocal() as db:
        assert db.get(Variant, vid).stock == 4


def test_last_unit_race_prevents_oversell(client, user, other, product):
    vid = product["variants"][0]["id"]
    with SessionLocal() as db:
        db.get(Variant, vid).stock = 1
        db.commit()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(lambda args: checkout(client, args[0], product, args[1]), [(user, "race-a"), (other, "race-b")])
        )
    assert sorted(r.status_code for r in results) == [201, 409]
    with SessionLocal() as db:
        assert db.get(Variant, vid).stock == 0


def test_signed_idempotent_payment_and_refund_inventory(client, user, other, product):
    o = checkout(client, user, product).json()
    event = {
        "id": "payment-test",
        "order_id": o["id"],
        "status": "paid",
        "amount_minor": o["total_minor"],
        "currency": "MYR",
    }
    body = json.dumps(event).encode()
    stamp = str(int(time.time()))
    headers = {"X-Signature": provider.sign(body, stamp), "X-Timestamp": stamp, "Content-Type": "application/json"}
    assert (
        client.post(
            P + "/webhooks/payments/sandbox", content=body, headers={**headers, "X-Signature": "bad"}
        ).status_code
        == 400
    )
    assert client.post(P + "/webhooks/payments/sandbox", content=body, headers=headers).status_code == 200
    assert client.post(P + "/webhooks/payments/sandbox", content=body, headers=headers).json()["duplicate"] is True
    assert client.get(f"{P}/orders/{o['id']}", headers=other["headers"]).status_code == 404
    with SessionLocal() as db:
        assert db.get(Variant, product["variants"][0]["id"]).stock == 4
        assert len(list(db.scalars(select(Audit).where(Audit.action == "order.transition")))) == 1
    refunded = client.post(f"{P}/orders/{o['id']}/cancel-request", headers=user["headers"])
    assert refunded.json()["state"] == "refunded"
    assert client.post(f"{P}/orders/{o['id']}/cancel-request", headers=user["headers"]).status_code == 409
    with SessionLocal() as db:
        assert db.get(Variant, product["variants"][0]["id"]).stock == 5


def test_failed_payment_and_expiration_return_stock(client, user, product):
    o = checkout(client, user, product).json()
    event = {
        "id": "failed",
        "order_id": o["id"],
        "status": "payment_failed",
        "amount_minor": o["total_minor"],
        "currency": "MYR",
    }
    body = json.dumps(event).encode()
    stamp = str(int(time.time()))
    assert (
        client.post(
            P + "/webhooks/payments/sandbox",
            content=body,
            headers={"X-Signature": provider.sign(body, stamp), "X-Timestamp": stamp},
        ).status_code
        == 200
    )
    with SessionLocal() as db:
        assert db.get(Variant, product["variants"][0]["id"]).stock == 5
    o = checkout(client, user, product, "expired").json()
    from datetime import timedelta
    from app.models import now

    with SessionLocal() as db:
        db.get(Order, o["id"]).expires_at = now() - timedelta(seconds=1)
        db.commit()
    paid = client.post(f"{P}/orders/{o['id']}/sandbox-pay", headers=user["headers"])
    assert paid.json()["state"] == "cancelled"
    with SessionLocal() as db:
        assert db.get(Variant, product["variants"][0]["id"]).stock == 5


def test_fulfillment_and_report_authorization(client, user, other, product):
    o = checkout(client, other, product).json()
    assert client.post(f"{P}/orders/{o['id']}/sandbox-pay", headers=other["headers"]).json()["state"] == "paid"
    shop = product["shop_id"]
    path = f"{P}/shops/{shop}/orders/{o['id']}/ship"
    assert client.post(path, headers=other["headers"], json={"tracking": "TEST-123"}).status_code == 404
    assert client.post(path, headers=user["headers"], json={"tracking": "TEST-123"}).json()["state"] == "shipped"
    assert (
        client.post(
            P + "/reports",
            headers=other["headers"],
            json={"target_type": "shop", "target_id": shop, "reason": "This is a test moderation report."},
        ).status_code
        == 201
    )


def test_local_signout_revokes_session(client, user):
    assert client.post(P + "/auth/logout", headers=user["headers"]).status_code == 200
    assert client.get(P + "/me", headers=user["headers"]).status_code == 401


def test_theme_backup_is_immutable_and_does_not_publish(client, user):
    assert publish(client, user, 1).status_code == 200
    shop = user["user"]["shop"]["id"]
    original = client.get(f"{P}/shops/{shop}/published").json()
    d = draft(client, user)
    d["document"]["sections"][0]["children"][1]["props"]["headline"] = "A different private draft"
    d = save(client, user, d).json()
    r = client.post(
        f"{P}/shops/{shop}/snapshots",
        headers=user["headers"],
        json={"expectedRevision": d["revision"], "note": "Before a new theme"},
    )
    assert r.status_code == 200 and r.json()["draftBackup"] is True
    assert client.get(f"{P}/shops/{shop}/published").json() == original
    history = client.get(f"{P}/shops/{shop}/versions", headers=user["headers"]).json()["items"]
    assert len(history) == 2 and history[0]["note"].startswith("Draft backup:")


def test_profile_updates_do_not_rename_shop_and_shop_shipping_is_authoritative(client, user, product):
    shop_id = user["user"]["shop"]["id"]
    assert (
        client.patch(P + "/me", headers=user["headers"], json={"display_name": "A different personal name"}).json()[
            "shop"
        ]["name"]
        == "Alice"
    )
    r = client.patch(
        f"{P}/shops/{shop_id}",
        headers=user["headers"],
        json={
            "name": "The studio",
            "bio": "A little studio",
            "location": "Penang",
            "shipping_minor": 1200,
            "return_policy": "Returns can be requested within 7 days for unused goods.",
        },
    )
    assert r.status_code == 200
    q = client.post(
        P + "/checkout/quote",
        headers=user["headers"],
        json={"items": [{"variant_id": product["variants"][0]["id"], "quantity": 1}]},
    )
    assert q.json()["shipping_minor"] == 1200 and q.json()["total_minor"] == 8000


def test_low_contrast_cannot_publish_and_foreign_collections_rejected(client, user, other):
    d = draft(client, user)
    hero = d["document"]["sections"][0]["children"][1]
    hero["style"].update({"backgroundColor": "#FFFFFF", "textColor": "#FFFFFF"})
    r = save(client, user, d)
    assert r.status_code == 200 and len(r.json()["validationWarnings"]) > 0
    assert publish(client, user, r.json()["revision"]).status_code == 422
    d = draft(client, user)
    d["document"]["sections"][0]["children"][1]["style"].pop("textColor")
    d["document"]["sections"][0]["children"][2]["props"].update({"source": "collection", "collectionId": "not-owned"})
    assert save(client, user, d).status_code == 422


def test_cart_scopes_shops_and_provider_rejects_invalid_amount(client, user, other, product):
    client.post(P + "/me/seller-onboarding", headers=other["headers"], json={"accepted_terms": True})
    p = client.post(
        f"{P}/shops/{other['user']['shop']['id']}/products",
        headers=other["headers"],
        json={
            "title": "Another shop product",
            "price_minor": 2000,
            "variants": [{"sku": "OTHER", "options": {}, "price_minor": 2000, "stock": 1}],
            "status": "published",
        },
    ).json()
    r = client.post(
        P + "/checkout/quote",
        headers=user["headers"],
        json={
            "items": [
                {"variant_id": product["variants"][0]["id"], "quantity": 1},
                {"variant_id": p["variants"][0]["id"], "quantity": 1},
            ]
        },
    )
    assert r.status_code == 422
    o = checkout(client, user, product).json()
    event = {"id": "bad-amount", "order_id": o["id"], "status": "paid", "amount_minor": 1, "currency": "MYR"}
    body = json.dumps(event).encode()
    stamp = str(int(time.time()))
    r = client.post(
        P + "/webhooks/payments/sandbox",
        content=body,
        headers={"X-Signature": provider.sign(body, stamp), "X-Timestamp": stamp},
    )
    assert r.status_code == 422
    assert client.get(f"{P}/orders/{o['id']}", headers=user["headers"]).json()["state"] == "pending_payment"
