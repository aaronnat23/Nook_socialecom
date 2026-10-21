import io
from pathlib import Path
from PIL import Image, ImageDraw
from app.config import ROOT

P = "/api/v1"
PHOTO = ROOT / "apps/web/public/images/seed_product_3.jpg"


def product_body(**extra):
    return {
        "title": "Stage mug",
        "description": "A staged test product",
        "price_minor": 4200,
        "status": "draft",
        "category": "Home & living",
        "variants": [{"sku": "STG-1", "options": {"Finish": "Original"}, "price_minor": 4200, "stock": 3}],
        **extra,
    }


def upload(client, user, payload: bytes, name="photo.jpg", keep_alpha=False):
    r = client.post(
        P + "/uploads",
        headers=user["headers"],
        data={"shop_id": user["user"]["shop"]["id"], "alt": "Photo", "keep_alpha": str(keep_alpha).lower()},
        files={"file": (name, payload, "image/jpeg" if name.endswith("jpg") else "image/png")},
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def stage(**kw):
    base = {"backdrop": {"kind": "ribbon", "a": "#D6F56B", "b": "#FFFFFF", "text": "SMALL SHOPS"}, "outline": True}
    base.update(kw)
    return base


def test_stage_is_validated_stored_and_returned(client, user):
    shop = user["user"]["shop"]["id"]
    url = f"{P}/shops/{shop}/products"
    ok = client.post(url, headers=user["headers"], json=product_body(stage=stage(cutout="seed_cutout_3")))
    assert ok.status_code == 201, ok.text
    saved = ok.json()["stage"]
    assert (
        saved["cutout"] == "seed_cutout_3" and saved["backdrop"]["text"] == "SMALL SHOPS" and saved["outline"] is True
    )
    # unknown backdrop kinds, bad colours, markup-ish text and out-of-range placement are rejected
    for bad in [
        stage(backdrop={"kind": "iframe"}),
        stage(backdrop={"kind": "color", "a": "red"}),
        stage(backdrop={"kind": "ribbon", "text": "x" * 41}),
        stage(scale=3),
        stage(y=0.9),
        {**stage(), "extra": 1},
    ]:
        assert client.post(url, headers=user["headers"], json=product_body(stage=bad)).status_code == 422
    # a photo backdrop needs an image, other kinds must not carry one
    photo = {"backdrop": {"kind": "photo", "a": "#FFFFFF", "b": "#FFFFFF"}}
    assert client.post(url, headers=user["headers"], json=product_body(stage=photo)).status_code == 422
    with_asset = stage(backdrop={"kind": "color", "a": "#FFFFFF", "b": "#FFFFFF", "asset_id": "seed_hero_1"})
    assert client.post(url, headers=user["headers"], json=product_body(stage=with_asset)).status_code == 422
    # unknown sample cut-outs are refused; clearing the stage works
    assert (
        client.post(url, headers=user["headers"], json=product_body(stage=stage(cutout="seed_cutout_99"))).status_code
        == 422
    )
    cleared = client.patch(f"{P}/products/{ok.json()['id']}", headers=user["headers"], json=product_body())
    assert cleared.status_code == 200 and cleared.json()["stage"] is None


def test_stage_cannot_use_another_shops_images(client, user, other):
    other_shop = client.post(P + "/me/seller-onboarding", headers=other["headers"], json={"accepted_terms": True})
    assert other_shop.status_code in (200, 201)
    foreign = upload(client, other, PHOTO.read_bytes())
    shop = user["user"]["shop"]["id"]
    r = client.post(
        f"{P}/shops/{shop}/products", headers=user["headers"], json=product_body(stage=stage(cutout=foreign))
    )
    assert r.status_code == 422


def test_cutout_removes_the_background_and_keeps_it_private_until_published(client, user, other):
    shop = user["user"]["shop"]["id"]
    source = upload(client, user, PHOTO.read_bytes())
    r = client.post(f"{P}/shops/{shop}/cutouts", headers=user["headers"], json={"asset_id": source})
    assert r.status_code == 201, r.text
    cut = r.json()
    fetched = client.get(f"{P}/assets/{cut['id']}", headers=user["headers"])
    assert fetched.status_code == 200
    im = Image.open(io.BytesIO(fetched.content))
    assert im.mode == "RGBA" and im.size == (cut["width"], cut["height"])
    alpha = im.getchannel("A")
    assert alpha.getpixel((2, 2)) < 40, "corners should be transparent"
    assert alpha.getpixel((im.width // 2, int(im.height * 0.75))) > 215, "the product body should stay opaque"
    # not public, not usable by someone else, then public once a published product stages it
    assert client.get(f"/media/{cut['id']}.webp").status_code == 404
    assert (
        client.post(f"{P}/shops/{shop}/cutouts", headers=other["headers"], json={"asset_id": source}).status_code == 404
    )
    r = client.post(
        f"{P}/shops/{shop}/products",
        headers=user["headers"],
        json=product_body(status="published", stage=stage(cutout=cut["id"])),
    )
    assert r.status_code == 201, r.text
    assert client.get(f"/media/{cut['id']}.webp").status_code == 200
    assert client.get(f"{P}/products/{r.json()['slug']}").json()["stage"]["cutout"] == cut["id"]


def test_cutout_reports_photos_without_a_clear_product(client, user):
    shop = user["user"]["shop"]["id"]
    flat = Image.new("RGB", (400, 400), "#f3eadb")
    out = io.BytesIO()
    flat.save(out, "PNG")
    source = upload(client, user, out.getvalue(), name="flat.png")
    r = client.post(f"{P}/shops/{shop}/cutouts", headers=user["headers"], json={"asset_id": source})
    assert r.status_code == 422
    assert "product" in r.text.lower() or "background" in r.text.lower()


def test_transparent_uploads_keep_their_alpha_when_asked(client, user):
    shop = user["user"]["shop"]["id"]
    im = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse((20, 20, 100, 100), fill=(255, 90, 54, 255))
    out = io.BytesIO()
    im.save(out, "PNG")
    kept = upload(client, user, out.getvalue(), name="cut.png", keep_alpha=True)
    flat = upload(client, user, out.getvalue(), name="cut.png", keep_alpha=False)
    for asset, expect_alpha in [(kept, True), (flat, False)]:
        data = client.get(f"{P}/assets/{asset}", headers=user["headers"]).content
        assert (Image.open(io.BytesIO(data)).mode == "RGBA") is expect_alpha
