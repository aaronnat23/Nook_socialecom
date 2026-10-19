"""Idempotent, explicitly fictional sandbox catalog."""

import copy, hashlib, json
from sqlalchemy import select
from .db import SessionLocal
from .auth import passwords
from .models import Profile, Shop, Draft, Version, Publication, Product, Variant, Collection, Order, now
from .config import ROOT
from datetime import timedelta

THEMES = json.loads((ROOT / "packages/storefront-schema/fixtures/themes.json").read_text())
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
PRODUCTS = [
    ("Cloud ceramic mug", 6800),
    ("The everyday vessel", 12800),
    ("Quiet corner table lamp", 8900),
    ("Weekend canvas tote", 4800),
    ("The archive carryall", 9600),
    ("Soft linen shirt", 11900),
    ("Everyday linen tote", 5800),
    ("Little moments pouch", 3500),
    ("The daily companion", 7900),
    ("Everyday gold hoops", 8900),
    ("Golden hour necklace", 12800),
    ("Tiny treasures ring", 6900),
    ("Hand-thrown coffee cup", 7800),
    ("The morning ritual set", 14800),
    ("Speckled studio vase", 9800),
    ("Off-duty essential tee", 9900),
    ("Weekend overshirt", 18900),
    ("Everyday canvas carry", 6900),
    ("Botanical body oil", 8800),
    ("Slow morning candle", 5800),
    ("Calm ritual mist", 6800),
    ("Sunday light art print", 4500),
    ("A quiet corner print", 6500),
    ("Little things postcard set", 2800),
]


def seed() -> None:
    with SessionLocal() as db:
        if db.scalar(select(Shop.id).where(Shop.slug == "studio-hening")):
            print("Sandbox seed already present.")
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
            doc = copy.deepcopy(THEMES[i]["document"])
            doc["shopId"] = s.id
            for sec in doc["sections"]:
                for b in sec["children"]:
                    if b["type"] == "profileHeader":
                        b["props"].update({"headline": name, "subtitle": bio})
            v = Version(
                shop_id=s.id,
                version_no=1,
                document=doc,
                checksum=hashlib.sha256(json.dumps(doc, sort_keys=True).encode()).hexdigest(),
                author_id=u.id,
                note="First collection — sandbox sample",
            )
            db.add(v)
            db.flush()
            db.add(Publication(shop_id=s.id, version_id=v.id))
            draft = copy.deepcopy(doc)
            if i == 0:
                draft["sections"][0]["children"][1]["props"]["subtitle"] = "A few new favorites, fresh from the studio."
            db.add(Draft(shop_id=s.id, document=draft))
            ids = []
            for j in range(3):
                index = i * 3 + j
                title, price = PRODUCTS[index]
                p = Product(
                    shop_id=s.id,
                    slug=title.lower().replace(" ", "-"),
                    title=title,
                    description=f"{title}, thoughtfully selected by {name}. Designed for the small moments that make a day feel like yours. This is a sample product in the Lilac sandbox catalog.",
                    price_minor=price,
                    image=f"seed_product_{index}",
                    category=category,
                    status="published",
                    tags=["independent", "malaysia"],
                )
                db.add(p)
                db.flush()
                ids.append(p.id)
                for k in range(2):
                    db.add(
                        Variant(
                            product_id=p.id,
                            sku=f"{slug[:8].upper()}-{j + 1}-{k + 1}",
                            options={"Finish": "Original" if k == 0 else "Soft lilac"},
                            price_minor=price + (k * 500),
                            stock=12 if k == 0 else 6,
                        )
                    )
            db.add(Collection(shop_id=s.id, title="Everyday favorites", product_ids=ids))
        db.commit()
        print("Seeded 8 sandbox spaces, 24 products, 48 variants and 8 collections.")


if __name__ == "__main__":
    seed()
