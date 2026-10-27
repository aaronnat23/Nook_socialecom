import hashlib
import re
from sqlalchemy import select
from app.catalog import PRODUCTS, slugify
from app.config import ROOT
from app.db import SessionLocal
from app.models import Draft, Product, Publication, Shop, Variant, Version
from app.seed import SHOPS, refresh_sample_catalog, sample_stage, seed
from tests.test_stage import product_body, stage

IMAGES = ROOT / "apps/web/public/images"


def test_catalogue_has_24_specific_products():
    assert len(PRODUCTS) == 24 and len(SHOPS) == 8
    assert len({p.title for p in PRODUCTS}) == 24
    assert len({slugify(p.title) for p in PRODUCTS}) == 24
    for p in PRODUCTS:
        assert p.price_minor > 0 and len(p.description) > 60
        text = p.description.lower()
        assert "sandbox" not in text and "thoughtfully selected" not in text and "small moments" not in text
        names = [v[0] for v in p.values]
        assert len(set(names)) == 2 and not {"Original", "Soft lilac"} & set(names)
        assert all(stock > 0 for _, _, stock in p.values)
    # the same wording must not be recycled across products
    assert len({p.description for p in PRODUCTS}) == 24 and len({p.option + str(p.values) for p in PRODUCTS}) == 24


def test_no_two_sample_photos_are_the_same_picture():
    seen: dict[str, str] = {}
    for i in range(24):
        digest = hashlib.sha256((IMAGES / f"seed_product_{i}.jpg").read_bytes()).hexdigest()
        assert digest not in seen, f"seed_product_{i} repeats {seen[digest]}"
        seen[digest] = f"seed_product_{i}"
    covers = {hashlib.sha256((IMAGES / f"seed_hero_{i}.jpg").read_bytes()).hexdigest() for i in range(8)}
    assert len(covers) == 8, "two shops share a cover photo"


def test_every_staged_sample_has_its_cutout_and_the_api_accepts_it(client, user):
    shop = user["user"]["shop"]["id"]
    staged = [i for i in range(24) if sample_stage(i)]
    assert len(staged) >= 10
    for i in staged:
        cut = sample_stage(i)["cutout"]  # type: ignore[index]
        assert (IMAGES / f"{cut}.webp").exists(), cut
        r = client.post(
            f"/api/v1/shops/{shop}/products", headers=user["headers"], json=product_body(stage=stage(cutout=cut))
        )
        assert r.status_code == 201, (cut, r.text)


def test_seed_matches_the_catalogue_and_an_old_database_is_refreshed_in_place(client):
    seed()
    with SessionLocal() as db:
        shops = {s.slug: s for s in db.scalars(select(Shop))}
        assert {s[1] for s in SHOPS} <= set(shops)
        peach = shops["peach-club"]
        products = {p.image: p for p in db.scalars(select(Product).where(Product.shop_id == peach.id))}
        assert [products[f"seed_product_{i}"].title for i in (6, 7, 8)] == [PRODUCTS[i].title for i in (6, 7, 8)]
        # age the database: old generic copy, old variants, an old starter page
        old = products["seed_product_6"]
        old.title, old.slug, old.description = (
            "Little moments pouch",
            "little-moments-pouch",
            "Generic. A sample product.",
        )
        for v in db.scalars(select(Variant).where(Variant.product_id == old.id)):
            v.options = {"Finish": "Soft lilac"}
        first = db.scalar(select(Version).where(Version.shop_id == peach.id, Version.version_no == 1))
        assert first is not None
        first.document = {**first.document, "marker": "old"}
        edited = shops["mira-and-muse"]
        edited_version = db.scalar(select(Version).where(Version.shop_id == edited.id, Version.version_no == 1))
        assert edited_version is not None
        edited_version.note = "Published by the seller"  # someone made this page their own
        edited_version.document = {**edited_version.document, "marker": "mine"}
        db.commit()
        refresh_sample_catalog(db)
        db.refresh(old)
        assert old.title == PRODUCTS[6].title and old.description == PRODUCTS[6].description
        assert old.slug == slugify(PRODUCTS[6].title)
        options = {v.options["Glaze"] for v in db.scalars(select(Variant).where(Variant.product_id == old.id))}
        assert options == {PRODUCTS[6].values[0][0], PRODUCTS[6].values[1][0]}
        db.refresh(first)
        assert "marker" not in first.document
        db.refresh(edited_version)
        assert edited_version.document["marker"] == "mine", "a page its owner has changed must be left alone"
        assert db.get(Publication, peach.id) is not None and db.get(Draft, peach.id) is not None
        again = refresh_sample_catalog(db)
        assert again == 24
