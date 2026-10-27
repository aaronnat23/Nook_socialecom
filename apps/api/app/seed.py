"""Idempotent, explicitly fictional sandbox catalog."""

import copy, hashlib, json
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session
from .db import SessionLocal
from .auth import passwords
from .models import Profile, Shop, Draft, Version, Publication, Product, Variant, Collection, Order, now
from .config import CONTRACT
from .catalog import PRODUCTS, slugify
from datetime import timedelta

THEMES = json.loads((CONTRACT / "themes.json").read_text())
SHOPS = [
    (
        "Studio Hening",
        "studio-hening",
        "Quiet objects for everyday rituals.",
        "Home & living",
        "Kuala Lumpur",
        "Minimal Studio",
    ),
    (
        "Sunday Archive",
        "sunday-archive",
        "Pre-loved pieces. Stories worth keeping.",
        "Fashion",
        "Petaling Jaya",
        "Vintage Film",
    ),
    ("Peach Club", "peach-club", "Playful little things for your everyday.", "Lifestyle", "Subang Jaya", "Y2K Diary"),
    ("Mira & Muse", "mira-and-muse", "Small treasures with a softer side.", "Jewelry", "Penang", "Dark Editorial"),
    (
        "Clay Collective",
        "clay-collective",
        "Shaped by hand, made to be loved.",
        "Home & living",
        "Johor Bahru",
        "Handmade Market",
    ),
    (
        "Offhours Studio",
        "offhours-studio",
        "For the hours that belong to you.",
        "Fashion",
        "Kuala Lumpur",
        "Streetwear Drop",
    ),
    ("Fern & Form", "fern-and-form", "A little closer to nature.", "Beauty", "Ipoh", "Botanical"),
    ("Paper & Pause", "paper-and-pause", "Art to make room for.", "Art & prints", "Melaka", "Art Gallery"),
]


def sample_stage(index: int) -> dict[str, object] | None:
    """Staged presentations for the sample products whose photos cut out cleanly."""
    scenes: dict[int, tuple[str, str, str, str, float, float, bool]] = {
        # index: (backdrop kind, a, b, ribbon text, scale, y offset, die-cut outline)
        0: ("arch", "#CDB8FF", "#FFFBF3", "", 0.86, 0.1, False),
        1: ("stripes", "#B8DAFF", "#FFFBF3", "", 0.82, 0.02, True),
        2: ("gradient", "#FFD15C", "#FF8A6E", "", 0.7, 0.0, False),
        3: ("ribbon", "#D6F56B", "#FFFFFF", "SMALL SHOPS", 0.8, 0.04, True),
        4: ("sunburst", "#FFB5CC", "#FFD9E6", "", 0.8, 0.03, False),
        6: ("dots", "#FFC9D9", "#FFFBF3", "", 0.84, 0.04, False),
        8: ("color", "#B7E4C7", "#FFFBF3", "", 0.8, 0.04, False),
        9: ("dots", "#211A2E", "#4A4158", "", 0.78, 0.0, False),
        13: ("stripes", "#CFE9D9", "#FFFBF3", "", 0.84, 0.0, False),
        16: ("arch", "#FFD15C", "#FFFBF3", "", 0.86, 0.04, False),
        18: ("gradient", "#FFC9A8", "#FFFBF3", "", 0.84, 0.02, False),
        20: ("ribbon", "#FFB5CC", "#FFFFFF", "SMALL BATCH", 0.82, 0.03, True),
    }
    if index not in scenes:
        return None
    kind, a, b, text, scale, y, outline = scenes[index]
    return {
        "v": 1,
        "cutout": f"seed_cutout_{index}",
        "backdrop": {"kind": kind, "a": a, "b": b, "text": text, "asset_id": None},
        "scale": scale,
        "x": 0.0,
        "y": y,
        "outline": outline,
        "shadow": True,
    }


def stage_samples(db: Session) -> int:
    """Gives sample products their staged look; safe to run again on an existing database."""
    changed = 0
    for product in db.scalars(select(Product).where(Product.image.like("seed_product_%"))):
        stage = sample_stage(int(product.image.rsplit("_", 1)[1]))
        if stage and product.stage is None:
            product.stage = stage
            changed += 1
    db.commit()
    return changed


def sample_document(i: int, shop_id: str) -> dict[str, Any]:
    """The starter page a sample shop begins with: its template, with the shop's own name and tagline."""
    name, _, bio = SHOPS[i][:3]
    doc: dict[str, Any] = copy.deepcopy(THEMES[i]["document"])
    doc["shopId"] = shop_id
    for sec in doc["sections"]:
        for b in sec["children"]:
            if b["type"] == "profileHeader":
                b["props"].update({"headline": name, "subtitle": bio})
    return doc


def sample_draft(i: int, doc: dict[str, Any]) -> dict[str, Any]:
    draft = copy.deepcopy(doc)
    if i == 0:
        draft["sections"][0]["children"][1]["props"]["subtitle"] = "A few new favorites, fresh from the studio."
    return draft


def checksum(doc: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(doc, sort_keys=True).encode()).hexdigest()


def refresh_sample_catalog(db: Session) -> int:
    """Brings an existing database's sample shops up to the current catalogue (photos, names, descriptions,
    options, staged looks and untouched starter pages) without touching accounts, orders or edited pages."""
    changed = 0
    for i, (_, slug, _, _, _, _) in enumerate(SHOPS):
        shop = db.scalar(select(Shop).where(Shop.slug == slug))
        if not shop:
            continue
        for j in range(3):
            index = i * 3 + j
            sample = PRODUCTS[index]
            product = db.scalar(
                select(Product).where(Product.shop_id == shop.id, Product.image == f"seed_product_{index}")
            )
            if not product:
                continue
            wanted = slugify(sample.title)
            taken = db.scalar(
                select(Product.id).where(Product.shop_id == shop.id, Product.slug == wanted, Product.id != product.id)
            )
            product.title = sample.title
            product.slug = product.slug if taken else wanted
            product.description = sample.description
            product.price_minor = sample.price_minor
            product.tags = list(sample.tags)
            if product.stage is None or str(product.stage.get("cutout", "")).startswith("seed_cutout_"):
                product.stage = sample_stage(index)
            for k, (value, extra, stock) in enumerate(sample.values):
                variant = db.scalar(
                    select(Variant).where(
                        Variant.product_id == product.id, Variant.sku == f"{slug[:8].upper()}-{j + 1}-{k + 1}"
                    )
                )
                if variant:
                    variant.options = {sample.option: value}
                    variant.price_minor = sample.price_minor + extra
                    variant.stock = stock
            changed += 1
        # The starter page is replaced only if its owner has never published or saved anything of their own.
        first = db.scalar(select(Version).where(Version.shop_id == shop.id, Version.version_no == 1))
        publication = db.get(Publication, shop.id)
        draft = db.get(Draft, shop.id)
        if first and first.note.startswith("First collection") and publication and publication.version_id == first.id:
            doc = sample_document(i, shop.id)
            first.document = doc
            first.checksum = checksum(doc)
            if draft and draft.revision == 1:
                draft.document = sample_draft(i, doc)
    db.commit()
    return changed


def seed() -> None:
    with SessionLocal() as db:
        if db.scalar(select(Shop.id).where(Shop.slug == "studio-hening")):
            print(f"Sandbox seed already present; staged {stage_samples(db)} sample products.")
            return
        for i, (name, slug, bio, category, city, theme) in enumerate(SHOPS):
            u = Profile(
                email="demo@lilac.local" if i == 0 else f"{slug}@lilac.local",
                password_hash=passwords.hash("LilacDemo!2026"),
                handle=slug.replace("-", "_"),
                display_name="Alya" if i == 0 else name,
                bio=bio,
            )
            db.add(u)
            db.flush()
            s = Shop(
                owner_user_id=u.id,
                slug=slug,
                name=name,
                bio=bio,
                category=category,
                location=city,
                avatar=f"seed_hero_{i}",
                cover=f"seed_hero_{i}",
                theme=THEMES[i]["id"],
                seller_enabled=True,
            )
            db.add(s)
            db.flush()
            doc = sample_document(i, s.id)
            v = Version(
                shop_id=s.id,
                version_no=1,
                document=doc,
                checksum=checksum(doc),
                author_id=u.id,
                note="First collection — sandbox sample",
            )
            db.add(v)
            db.flush()
            db.add(Publication(shop_id=s.id, version_id=v.id))
            db.add(Draft(shop_id=s.id, document=sample_draft(i, doc)))
            ids = []
            for j in range(3):
                index = i * 3 + j
                sample = PRODUCTS[index]
                p = Product(
                    shop_id=s.id,
                    slug=slugify(sample.title),
                    title=sample.title,
                    description=sample.description,
                    price_minor=sample.price_minor,
                    image=f"seed_product_{index}",
                    category=category,
                    status="published",
                    tags=list(sample.tags),
                    stage=sample_stage(index),
                )
                db.add(p)
                db.flush()
                ids.append(p.id)
                for k, (value, extra, stock) in enumerate(sample.values):
                    db.add(
                        Variant(
                            product_id=p.id,
                            sku=f"{slug[:8].upper()}-{j + 1}-{k + 1}",
                            options={sample.option: value},
                            price_minor=sample.price_minor + extra,
                            stock=stock,
                        )
                    )
            db.add(Collection(shop_id=s.id, title="Everyday favorites", product_ids=ids))
        db.commit()
        print("Seeded 8 sandbox spaces, 24 products, 48 variants and 8 collections.")


if __name__ == "__main__":
    seed()
