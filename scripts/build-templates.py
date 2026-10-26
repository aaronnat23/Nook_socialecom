"""Builds packages/storefront-schema/fixtures/themes.json: the starter templates sellers can try on.

Each template is plain data for the shared storefront schema (see scripts/create-contract.py), so it
renders the same on web and native and stays editable block by block. Run:

    .venv/bin/python scripts/build-templates.py

The first eight ids are stable because seed data assigns them to the sample shops by position.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def B(id, type, props=None, style=None, m=None, t=None, kids=None):
    """A block. `m` and `t` are mobile and tablet style overrides."""
    block = {"id": id, "type": type, "props": props or {}}
    if style:
        block["style"] = style
    responsive = {}
    if m:
        responsive["mobile"] = {"style": m}
    if t:
        responsive["tablet"] = {"style": t}
    if responsive:
        block["responsive"] = responsive
    if kids:
        block["children"] = kids
    return block


def S(id, children, **style):
    section = {"id": id, "type": "section", "children": children}
    if style:
        section["style"] = style
    return section


def template(slug, name, description, fonts, colors, width, radius, sections):
    heading, body = fonts
    keys = ["background", "surface", "text", "accent", "muted"]
    return {
        "id": slug,
        "name": name,
        "description": description,
        "document": {
            "schemaVersion": 1,
            "shopId": "template",
            "pageId": f"page_{slug}",
            "theme": {
                "fontHeading": heading,
                "fontBody": body,
                "colors": dict(zip(keys, colors)),
                "contentWidth": width,
                "radius": radius,
            },
            "sections": sections,
        },
    }


def hero(id, headline, subtitle, image, alt, cta=None, variant=None, **style):
    props = {"headline": headline, "subtitle": subtitle, "imageAssetId": image, "alt": alt}
    if cta:
        props["cta"] = {"label": cta, "url": "#products"}
    if variant:
        props["variant"] = variant
    return props


def products(headline, limit=12, variant=None):
    props = {"headline": headline, "source": "all", "limit": limit}
    if variant:
        props["variant"] = variant
    return props


def gallery(headline, images, variant=None):
    props = {"images": [{"imageAssetId": i, "alt": a} for i, a in images]}
    if headline:
        props["headline"] = headline
    if variant:
        props["variant"] = variant
    return props


def profile(variant=None):
    props = {"headline": "Your space", "subtitle": "A little introduction goes here."}
    if variant:
        props["variant"] = variant
    return props


T = []

# 1 ── Minimal Studio: calm, serif, lots of air ───────────────────────────────────────────────
T.append(
    template(
        "minimal-studio",
        "Minimal Studio",
        "Quiet, spacious and serif: a split hero, an open product grid and a letter from the studio.",
        ("Georgia", "Inter"),
        ["#FAF9F6", "#FFFFFF", "#29252F", "#7550B5", "#6B6573"],
        1120,
        8,
        [
            S(
                "main",
                [
                    B("identity", "profileHeader", profile("row"), {"paddingTop": 24, "paddingBottom": 24}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "Everyday, a little more beautiful.",
                            "A collection of little things that feel like you.",
                            "seed_hero_0",
                            "Speckled ceramics on a pale shelf",
                            "Explore the collection",
                            "split",
                        ),
                        {"fontSize": 60, "paddingTop": 42, "paddingBottom": 42, "backgroundColor": "#EEE5F7", "borderRadius": 24, "minHeight": 340},
                        m={"fontSize": 36, "paddingTop": 28, "paddingBottom": 28},
                    ),
                    B("products", "productGrid", products("Objects for everyday rituals", 6, "grid"), {"columns": 3, "gap": 22, "paddingTop": 56}, m={"columns": 2, "gap": 12}),
                ],
            ),
            S(
                "story",
                [
                    B(
                        "letter",
                        "text",
                        {
                            "headline": "A note from the studio",
                            "text": "We make fewer things, and make them slowly. Each piece is glazed by hand, fired twice and checked by someone who cares whether it sits well in your palm.\n\nThank you for letting them into your mornings.",
                            "variant": "letter",
                        },
                        {"paddingTop": 72, "paddingBottom": 48},
                    ),
                    B("rule", "divider", {"variant": "line"}, {"paddingTop": 8, "paddingBottom": 8}),
                    B(
                        "photos",
                        "gallery",
                        gallery(None, [("seed_hero_0", "Glazed cups on a shelf"), ("seed_product_14", "Blue plates stacked on timber")], "grid"),
                        {"columns": 2, "gap": 16, "aspectRatio": "16:9", "borderRadius": 12, "paddingTop": 24, "paddingBottom": 24},
                    ),
                    B("visit", "button", {"label": "See everything", "url": "#products", "variant": "solid"}, {"paddingBottom": 64}),
                ],
            ),
        ],
    )
)

# 2 ── Vintage Film: typewriter, contact sheets, found objects ────────────────────────────────
T.append(
    template(
        "vintage-film",
        "Vintage Film",
        "A typewriter-set archive: film-strip photos, a numbered contact sheet and found-object notes.",
        ("Courier New", "Courier New"),
        ["#F3E9D8", "#FBF4E6", "#3B2A1A", "#A4472B", "#6A5A48"],
        1040,
        2,
        [
            S(
                "main",
                [
                    B(
                        "ticker",
                        "announcement",
                        {"text": "Found objects ✦ Est. in small moments ✦ Everything has a past life", "variant": "marquee"},
                        {"backgroundColor": "#3B2A1A", "textColor": "#F3E9D8", "fontSize": 11, "paddingTop": 10, "paddingBottom": 10, "paddingLeft": 0, "paddingRight": 0},
                    ),
                    B("identity", "profileHeader", profile("centered"), {"paddingTop": 36, "paddingBottom": 12}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "A little old soul. A lot of character.",
                            "Salvaged, restored and passed along.",
                            "seed_hero_1",
                            "A kraft tote bag against a grey wall",
                            "Browse the archive",
                            "centered",
                        ),
                        {"fontSize": 44, "paddingTop": 24, "paddingBottom": 40, "textAlign": "center", "fontWeight": 700, "focalY": 68},
                        m={"fontSize": 28},
                    ),
                    B(
                        "reel",
                        "gallery",
                        gallery(
                            "Roll no. 7",
                            [
                                ("seed_hero_1", "A kraft tote, frame 1"),
                                ("seed_product_5", "A pressed white shirt, frame 2"),
                                ("seed_product_22", "A pastoral painting, frame 3"),
                                ("seed_product_19", "A candle among fairy lights, frame 4"),
                                ("seed_product_11", "A gold chain bracelet, frame 5"),
                            ],
                            "filmstrip",
                        ),
                        {"aspectRatio": "3:4", "borderRadius": 2, "paddingTop": 8, "paddingBottom": 24},
                    ),
                    B("stars", "divider", {"variant": "stars"}, {"borderColor": "#A4472B", "paddingTop": 12, "paddingBottom": 12}),
                ],
            ),
            S(
                "index",
                [
                    B("products", "productGrid", products("The contact sheet", 8, "list"), {"paddingTop": 24, "paddingBottom": 24}),
                    B("pick", "featuredProduct", {"productId": "", "headline": "Pick of the month", "variant": "card"}, {"paddingTop": 32, "paddingBottom": 24}),
                    B(
                        "note",
                        "text",
                        {
                            "headline": "Condition notes",
                            "text": "Every piece is photographed on the day it arrives. Small marks are part of the story and are always listed.",
                            "variant": "note",
                        },
                        {"paddingTop": 48, "paddingBottom": 48},
                    ),
                    B("social", "socialLinks", {"links": [{"label": "Instagram", "url": "https://instagram.com"}, {"label": "Journal", "url": "#products"}], "variant": "links"}, {"paddingBottom": 56, "textAlign": "center"}),
                ],
            ),
        ],
    )
)

# 3 ── Y2K Diary: notebook grid, polaroids, hot pink ──────────────────────────────────────────
T.append(
    template(
        "y2k-diary",
        "Y2K Diary",
        "A pink scrapbook on graph paper: handwritten titles, polaroids and sticky notes.",
        ("Caveat", "Trebuchet MS"),
        ["#FFF0F9", "#FFFFFF", "#3A1E55", "#C0278A", "#7C4A86"],
        980,
        22,
        [
            S(
                "page",
                [
                    B("welcome", "announcement", {"text": "✧ welcome to my little universe ✧", "variant": "pill"}, {"fontSize": 14, "paddingTop": 28, "paddingBottom": 6, "textColor": "#3A1E55"}),
                    B("identity", "profileHeader", profile("banner"), {"paddingTop": 12, "paddingBottom": 24, "fontSize": 40, "fontWeight": 700}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "my favourite things, all in one place",
                            "pretty little finds, picked just for you ♡",
                            "seed_product_10",
                            "A necklace on a bare shoulder",
                            "peek inside",
                            "flip",
                        ),
                        {"fontSize": 62, "paddingTop": 26, "paddingBottom": 26, "shape": "circle", "fontWeight": 700, "gradient": "candy", "borderRadius": 40, "paddingLeft": 36, "paddingRight": 36},
                        m={"fontSize": 40},
                    ),
                    B(
                        "polaroids",
                        "gallery",
                        gallery(
                            "scrapbook",
                            [
                                ("seed_product_10", "gold chain, my daily wear"),
                                ("seed_product_11", "new bracelet, who dis"),
                                ("seed_product_20", "the prettiest bottle"),
                            ],
                            "polaroid",
                        ),
                        {"columns": 3, "gap": 28, "aspectRatio": "4:5", "fontSize": 40, "fontWeight": 700, "paddingTop": 40, "paddingBottom": 24},
                        m={"columns": 2, "gap": 18},
                    ),
                    B(
                        "notes",
                        "columns",
                        {"variant": "even"},
                        {"columns": 2, "gap": 22, "paddingTop": 24, "paddingBottom": 24},
                        kids=[
                            B("n1", "text", {"headline": "currently obsessed with", "text": "layering chains, sunset walks and anything that sparkles.", "variant": "note"}, {"fontSize": 34, "fontWeight": 700}),
                            B("n2", "text", {"headline": "shipping day", "text": "i pack orders every friday with stickers and a tiny handwritten note.", "variant": "note"}, {"fontSize": 34, "fontWeight": 700}),
                        ],
                    ),
                    B("wave", "divider", {"variant": "wave"}, {"borderColor": "#C0278A", "paddingTop": 12, "paddingBottom": 12}),
                    B("products", "productGrid", products("the wishlist", 6, "grid"), {"columns": 2, "gap": 22, "fontSize": 42, "fontWeight": 700, "paddingTop": 20, "paddingBottom": 36}),
                    B("social", "socialLinks", {"links": [{"label": "Instagram", "url": "https://instagram.com"}, {"label": "TikTok", "url": "https://tiktok.com"}], "variant": "chips"}, {"paddingBottom": 56, "textAlign": "center"}),
                ],
                backgroundColor="#FFF0F9",
                pattern="grid",
                patternColor="#F2C7E6",
            )
        ],
    )
)

# 4 ── Dark Editorial: after-hours magazine ───────────────────────────────────────────────────
T.append(
    template(
        "dark-editorial",
        "Dark Editorial",
        "A midnight magazine: a full-bleed cover, a pull quote, large spreads and a masonry wall.",
        ("DM Serif Display", "Inter"),
        ["#14111A", "#221C2B", "#F4EFF8", "#D4B6FF", "#B7AAC4"],
        1200,
        0,
        [
            S(
                "cover",
                [
                    B("identity", "profileHeader", profile("minimal"), {"paddingTop": 22, "paddingBottom": 22}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "Quiet objects. Bold intentions.",
                            "The autumn edit · Volume 04",
                            "seed_hero_3",
                            "Jewelled earrings resting on a monstera leaf",
                            "Read the edit",
                            "overlay",
                        ),
                        {"fontSize": 88, "minHeight": 620, "paddingLeft": 0, "paddingRight": 0, "paddingTop": 0, "paddingBottom": 0, "borderRadius": 0, "textColor": "#F4EFF8"},
                        m={"fontSize": 44, "minHeight": 520},
                    ),
                ],
                width="full",
            ),
            S(
                "body",
                [
                    B("issue", "announcement", {"text": "No. 04 — Jewellery, objects & slow things", "variant": "pill"}, {"fontSize": 11, "paddingTop": 56, "paddingBottom": 8, "letterSpacing": 3, "uppercase": True}),
                    B(
                        "quote",
                        "text",
                        {"headline": "We make fewer things, on purpose.", "text": "The studio, on why every drop is small", "variant": "quote"},
                        {"fontSize": 52, "paddingTop": 40, "paddingBottom": 56},
                        m={"fontSize": 32},
                    ),
                    B("products", "productGrid", products("The edit", 4, "lookbook"), {"gap": 48, "paddingBottom": 64}),
                    B(
                        "wall",
                        "gallery",
                        gallery(
                            "From the notebook",
                            [
                                ("seed_hero_3", "Earrings on a leaf"),
                                ("seed_product_18", "An amber bottle in warm light"),
                                ("seed_product_11", "A chain bracelet on a magazine"),
                                ("seed_product_10", "A pendant at the collarbone"),
                                ("seed_product_21", "Still life with tulips"),
                                ("seed_product_19", "A candle among fairy lights"),
                            ],
                            "masonry",
                        ),
                        {"columns": 3, "gap": 14, "borderRadius": 0, "paddingBottom": 48},
                        m={"columns": 2},
                    ),
                    B("more", "button", {"label": "Read the journal", "url": "#products", "variant": "link"}, {"paddingBottom": 72, "textAlign": "center"}),
                ],
            ),
        ],
    )
)

# 5 ── Handmade Market: kraft paper, letters from the workbench ───────────────────────────────
T.append(
    template(
        "handmade-market",
        "Handmade Market",
        "Warm and personal: a kraft-paper banner, a maker's letter, framed portraits and a swipeable stall.",
        ("Georgia", "Georgia"),
        ["#FBF1E3", "#FFF9F0", "#4B2E22", "#B5502A", "#7E6A59"],
        1080,
        14,
        [
            S(
                "main",
                [
                    B(
                        "banner",
                        "announcement",
                        {"text": "Made by hand ✦ Small batches ✦ Sent with care", "variant": "marquee"},
                        {"backgroundColor": "#B5502A", "textColor": "#FFF8F0", "fontSize": 12, "paddingTop": 11, "paddingBottom": 11, "paddingLeft": 0, "paddingRight": 0},
                    ),
                    B("identity", "profileHeader", profile("row"), {"paddingTop": 28, "paddingBottom": 12}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "Made slowly. Loved for a long time.",
                            "Glazed, stitched and wrapped by two pairs of hands.",
                            "seed_hero_0",
                            "Speckled ceramics glazed by hand",
                            "Visit the stall",
                            "flip",
                        ),
                        {"fontSize": 56, "paddingTop": 36, "paddingBottom": 36, "paddingLeft": 36, "paddingRight": 36, "backgroundColor": "#F2DCC3", "borderRadius": 36, "shape": "arch", "minHeight": 420},
                        m={"fontSize": 34},
                    ),
                ],
            ),
            S(
                "bench",
                [
                    B(
                        "letter",
                        "text",
                        {
                            "headline": "Dear neighbour,",
                            "text": "Every cup begins as a handful of wet clay on a Sunday morning. I wedge, throw and trim until it feels right in my hands, and only then does it go in the kiln.\n\nIf it feels right in yours too, it has found its home.",
                            "variant": "letter",
                        },
                        {"paddingTop": 64, "paddingBottom": 40},
                    ),
                    B(
                        "portraits",
                        "columns",
                        {"variant": "wideLeft"},
                        {"columns": 2, "gap": 24, "paddingBottom": 24},
                        kids=[
                            B("p1", "image", {"imageAssetId": "seed_product_14", "alt": "Blue-glazed plates on a timber shelf", "caption": "Glaze test, batch 12", "variant": "framed"}, {"aspectRatio": "4:3", "borderRadius": 18}),
                            B("p2", "image", {"imageAssetId": "seed_hero_0", "alt": "Cups waiting to be fired", "caption": "Waiting for the kiln", "variant": "framed"}, {"aspectRatio": "3:4", "borderRadius": 18}),
                        ],
                        m={"columns": 1},
                    ),
                    B("dots", "divider", {"variant": "dots"}, {"borderColor": "#B5502A", "paddingTop": 24, "paddingBottom": 24}),
                    B("products", "productGrid", products("Fresh off the bench", 8, "carousel"), {"gap": 20, "paddingBottom": 40}),
                    B("social", "socialLinks", {"links": [{"label": "Instagram", "url": "https://instagram.com"}, {"label": "Markets I visit", "url": "#products"}], "variant": "chips"}, {"paddingBottom": 56}),
                ],
            ),
        ],
    )
)

# 6 ── Streetwear Drop: loud poster type, ticker tape, hazard stripes ─────────────────────────
T.append(
    template(
        "streetwear-drop",
        "Streetwear Drop",
        "Poster-sized type, a ticker tape, hazard stripes and a mosaic with one big hero piece.",
        ("Archivo Black", "Arial"),
        ["#EFEFEA", "#FFFFFF", "#111111", "#C93509", "#55554F"],
        1320,
        0,
        [
            S(
                "drop",
                [
                    B(
                        "tape",
                        "announcement",
                        {"text": "Drop 04 ✦ Limited run ✦ No restocks ✦ Ships Friday", "variant": "marquee"},
                        {"backgroundColor": "#111111", "textColor": "#EFEFEA", "fontSize": 12, "paddingTop": 11, "paddingBottom": 11, "paddingLeft": 0, "paddingRight": 0},
                    ),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "Wear your own story",
                            "Heavyweight basics, cut boxy, made in tiny runs.",
                            "seed_hero_5",
                            "A model in a plain white heavyweight tee",
                            "Shop the drop",
                            "poster",
                        ),
                        {"fontSize": 132, "paddingTop": 36, "paddingBottom": 24, "uppercase": True},
                        t={"fontSize": 96},
                        m={"fontSize": 56, "paddingTop": 20},
                    ),
                    B(
                        "hazard",
                        "announcement",
                        {"text": "New arrivals — 12 pieces — this week only", "variant": "bar"},
                        {"backgroundColor": "#FFD500", "textColor": "#111111", "pattern": "stripes", "patternColor": "#E0B800", "fontSize": 13, "fontWeight": 800, "uppercase": True, "letterSpacing": 2, "paddingTop": 14, "paddingBottom": 14, "textAlign": "center", "marginTop": 24},
                    ),
                    B("products", "productGrid", products("The drop", 6, "mosaic"), {"gap": 18, "paddingTop": 40, "paddingBottom": 24, "uppercase": True, "fontSize": 40}, m={"fontSize": 28}),
                ],
            ),
            S(
                "lookbook",
                [
                    B(
                        "campaign",
                        "columns",
                        {"variant": "wideRight"},
                        {"columns": 2, "gap": 24, "paddingTop": 32, "paddingBottom": 32},
                        kids=[
                            B("c1", "text", {"headline": "Lookbook 04", "text": "Shot on the rooftop at 6am. No retouching, no filters, no apologies."}, {"fontSize": 44, "uppercase": True}),
                            B("c2", "image", {"imageAssetId": "seed_product_4", "alt": "A navy backpack, shot at dawn", "variant": "framed"}, {"aspectRatio": "3:4", "borderRadius": 0, "borderColor": "#111111"}),
                        ],
                        m={"columns": 1},
                    ),
                    B("shopall", "button", {"label": "Shop all", "url": "#products", "variant": "outline"}, {"paddingBottom": 40}),
                    B("identity", "profileHeader", profile("minimal"), {"paddingTop": 12, "paddingBottom": 40}),
                ],
            ),
        ],
    )
)

# 7 ── Botanical: sage, arches and a slower pace ──────────────────────────────────────────────
T.append(
    template(
        "botanical",
        "Botanical",
        "Soft sage and arched windows: a centered cover, a spotlight product and a masonry of greenery.",
        ("DM Serif Display", "Georgia"),
        ["#F1F5EA", "#FBFDF7", "#263A29", "#4E7A4B", "#5F735C"],
        980,
        20,
        [
            S(
                "intro",
                [
                    B("identity", "profileHeader", profile("centered"), {"paddingTop": 36, "paddingBottom": 16, "fontSize": 28}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "A slower kind of beautiful.",
                            "Plant-led skincare and slow-living objects, made in small batches.",
                            "seed_hero_6",
                            "An amber dropper bottle on a wooden pedestal",
                            "Find your daily ritual",
                            "centered",
                        ),
                        {"fontSize": 54, "gradient": "sage", "borderRadius": 36, "shape": "arch", "paddingTop": 48, "paddingBottom": 48, "textAlign": "center"},
                        m={"fontSize": 34},
                    ),
                    B("orn", "divider", {"variant": "ornament"}, {"borderColor": "#4E7A4B", "paddingTop": 36, "paddingBottom": 20}),
                ],
            ),
            S(
                "shop",
                [
                    B("spot", "featuredProduct", {"productId": "", "headline": "Rooted in the everyday", "variant": "spotlight"}, {"paddingTop": 24, "paddingBottom": 56}),
                    B(
                        "story",
                        "text",
                        {"headline": "Grown, not manufactured.", "text": "Everything here begins with a seed or a leaf. We steep, press and bottle in small batches, then send it to you with a little care card on how to use it well."},
                        {"textAlign": "center", "fontSize": 40, "maxWidth": 700, "paddingTop": 24, "paddingBottom": 40},
                        m={"fontSize": 30},
                    ),
                    B(
                        "green",
                        "gallery",
                        gallery(
                            "From the greenhouse",
                            [
                                ("seed_product_9", "Leaf-shadowed stones"),
                                ("seed_product_8", "Spring blossom in white vases"),
                                ("seed_product_19", "A candle among soft lights"),
                                ("seed_product_18", "An amber bottle in sunlight"),
                                ("seed_product_2", "A lamp against a sage wall"),
                                ("seed_product_12", "A lamp against deep teal"),
                            ],
                            "masonry",
                        ),
                        {"columns": 3, "gap": 16, "borderRadius": 22, "paddingBottom": 40},
                        m={"columns": 2},
                    ),
                    B("products", "productGrid", products("The shelf", 6, "grid"), {"columns": 3, "gap": 20, "paddingBottom": 40}, m={"columns": 2}),
                    B("ship", "announcement", {"text": "Free shipping over RM120", "variant": "pill"}, {"fontSize": 13, "paddingBottom": 64}),
                ],
            ),
        ],
    )
)

# 8 ── Art Gallery: white cube, museum labels ─────────────────────────────────────────────────
T.append(
    template(
        "art-gallery",
        "Art Gallery",
        "A white cube with museum labels: monospaced captions, framed works and a numbered catalogue.",
        ("Georgia", "Space Mono"),
        ["#FBFAF7", "#FFFFFF", "#1B1A1F", "#7A2E4F", "#625C63"],
        1240,
        0,
        [
            S(
                "front",
                [
                    B("identity", "profileHeader", profile("minimal"), {"paddingTop": 28, "paddingBottom": 28}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "Objects with a point of view.",
                            "Current exhibition — oil, ink and found objects, 2024–2026.",
                            "seed_hero_7",
                            "A still life of tulips and roses in a dark interior",
                            None,
                            "stack",
                        ),
                        {"fontSize": 60, "paddingTop": 8, "paddingBottom": 48, "borderRadius": 0},
                        m={"fontSize": 36},
                    ),
                ],
            ),
            S(
                "works",
                [
                    B(
                        "wall",
                        "columns",
                        {"variant": "wideRight"},
                        {"columns": 2, "gap": 56, "paddingTop": 24, "paddingBottom": 24},
                        kids=[
                            B("w1", "text", {"headline": "On view", "text": "No. 07 — Still life with tulips, after the old masters.\nOil on panel, 2025.\n\nA study in how little light it takes to make a room feel full."}, {"fontSize": 28}),
                            B("w2", "image", {"imageAssetId": "seed_product_21", "alt": "Still life with tulips and roses", "caption": "No. 07 — Oil on panel, 2025", "variant": "framed"}, {"aspectRatio": "3:4", "borderRadius": 0, "borderColor": "#1B1A1F", "maxWidth": 520}),
                        ],
                        m={"columns": 1},
                    ),
                    B(
                        "wall2",
                        "columns",
                        {"variant": "wideLeft"},
                        {"columns": 2, "gap": 56, "paddingTop": 24, "paddingBottom": 48},
                        kids=[
                            B("w3", "image", {"imageAssetId": "seed_product_22", "alt": "An English pastoral landscape with sheep", "caption": "No. 12 — Pastoral, oil on canvas, 2024", "variant": "framed"}, {"aspectRatio": "4:3", "borderRadius": 0, "borderColor": "#1B1A1F", "maxWidth": 620}),
                            B("w4", "text", {"headline": "Also showing", "text": "No. 12 — Pastoral.\nOil on canvas, 2024.\n\nPrints available on request."}, {"fontSize": 28}),
                        ],
                        m={"columns": 1},
                    ),
                    B("rule", "divider", {"variant": "line"}, {"borderColor": "#1B1A1F", "paddingTop": 8, "paddingBottom": 8}),
                    B("products", "productGrid", products("The catalogue", 10, "list"), {"fontSize": 34, "paddingTop": 40, "paddingBottom": 40}),
                    B("price", "button", {"label": "Request the price list", "url": "#products", "variant": "link"}, {"paddingBottom": 72}),
                ],
            ),
        ],
    )
)

# 9 ── Candy Counter: bubblegum boutique ──────────────────────────────────────────────────────
T.append(
    template(
        "candy-counter",
        "Candy Counter",
        "A pick-and-mix boutique: polka dots, bubblegum pink, pill-shaped photos and a swipeable shelf.",
        ("Caprasimo", "Trebuchet MS"),
        ["#FFF4F9", "#FFFFFF", "#4A1D46", "#D0206F", "#8A4F86"],
        1120,
        32,
        [
            S(
                "shop",
                [
                    B(
                        "ticker",
                        "announcement",
                        {"text": "Sweet things ✦ Small batch ✦ Pick & mix ✦ Gift wrapped free", "variant": "marquee"},
                        {"backgroundColor": "#FFD3EC", "textColor": "#4A1D46", "fontSize": 13, "fontWeight": 700, "paddingTop": 11, "paddingBottom": 11, "paddingLeft": 0, "paddingRight": 0},
                    ),
                    B("identity", "profileHeader", profile("banner"), {"paddingTop": 28, "paddingBottom": 20, "fontSize": 40}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "Pick a little something sweet.",
                            "Tiny treats and pretty things, wrapped like presents.",
                            "seed_product_20",
                            "A pink perfume bottle against a blue sky",
                            "Fill your bag",
                            "split",
                        ),
                        {"fontSize": 66, "gradient": "candy", "paddingTop": 40, "paddingBottom": 40, "paddingLeft": 44, "paddingRight": 44, "borderRadius": 48, "shape": "circle"},
                        m={"fontSize": 40, "paddingLeft": 22, "paddingRight": 22},
                    ),
                    B("products", "productGrid", products("Pick & mix", 7, "mosaic"), {"gap": 20, "paddingTop": 44, "paddingBottom": 24, "fontSize": 44}, m={"fontSize": 30}),
                    B("wave", "divider", {"variant": "wave"}, {"borderColor": "#D0206F", "paddingTop": 12, "paddingBottom": 12}),
                    B(
                        "treats",
                        "gallery",
                        gallery(
                            "Sprinkles",
                            [
                                ("seed_product_20", "Pink bottle, blue sky"),
                                ("seed_product_8", "Blossom on a white table"),
                                ("seed_product_11", "Golden chain on a magazine"),
                            ],
                            "grid",
                        ),
                        {"columns": 3, "gap": 18, "aspectRatio": "3:4", "shape": "pill", "fontSize": 40, "paddingTop": 20, "paddingBottom": 32},
                        m={"columns": 2},
                    ),
                    B(
                        "notes",
                        "columns",
                        {"variant": "even"},
                        {"columns": 2, "gap": 20, "paddingBottom": 40},
                        kids=[
                            B("n1", "text", {"headline": "Gift wrapping", "text": "Free tissue, ribbon and a handwritten card on every order.", "variant": "note"}, {"backgroundColor": "#FFE98A", "fontSize": 26}),
                            B("n2", "text", {"headline": "Pick-up parties", "text": "Come by on Saturdays for samples, stickers and sweet tea.", "variant": "note"}, {"backgroundColor": "#C8F2E0", "fontSize": 26}),
                        ],
                        m={"columns": 1},
                    ),
                    B("social", "socialLinks", {"links": [{"label": "Instagram", "url": "https://instagram.com"}, {"label": "TikTok", "url": "https://tiktok.com"}], "variant": "chips"}, {"paddingBottom": 56, "textAlign": "center"}),
                ],
                backgroundColor="#FFF4F9",
                pattern="dots",
                patternColor="#F7C3DE",
            )
        ],
    )
)

# 10 ── Photocopy Zine: black ink, newsprint, mono type ───────────────────────────────────────
T.append(
    template(
        "photocopy-zine",
        "Photocopy Zine",
        "Black ink on newsprint: monospaced type, hazard tape, taped-up notes and polaroid snaps.",
        ("Space Mono", "Space Mono"),
        ["#F2EFE6", "#FFFFFF", "#111111", "#2438FF", "#4B4B47"],
        1000,
        0,
        [
            S(
                "issue",
                [
                    B("identity", "profileHeader", profile("row"), {"paddingTop": 24, "paddingBottom": 16, "uppercase": True, "letterSpacing": 1}),
                    B(
                        "tape",
                        "announcement",
                        {"text": "Issue 07 — printed on a photocopier that should have been retired years ago", "variant": "bar"},
                        {"backgroundColor": "#FFE600", "textColor": "#111111", "pattern": "stripes", "patternColor": "#E6CF00", "fontSize": 12, "fontWeight": 700, "paddingTop": 12, "paddingBottom": 12, "textAlign": "center", "uppercase": True},
                    ),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "Make. Copy. Share.",
                            "Small runs, loud opinions and clothes you can't buy anywhere else.",
                            "seed_product_15",
                            "A black-and-white style snapshot of a worn tee",
                            "Get the zine",
                            "split",
                        ),
                        {"fontSize": 64, "backgroundColor": "#111111", "textColor": "#F2EFE6", "paddingTop": 44, "paddingBottom": 44, "paddingLeft": 36, "paddingRight": 36, "uppercase": True, "fontWeight": 700, "marginTop": 24},
                        m={"fontSize": 34, "paddingLeft": 18, "paddingRight": 18},
                    ),
                    B(
                        "snaps",
                        "gallery",
                        gallery(
                            "Fig. 1–3",
                            [
                                ("seed_product_5", "Fig. 1 — the shirt, pressed"),
                                ("seed_product_4", "Fig. 2 — the bag, with opinions"),
                                ("seed_product_17", "Fig. 3 — the tote, empty"),
                            ],
                            "polaroid",
                        ),
                        {"columns": 3, "gap": 24, "aspectRatio": "4:5", "fontSize": 28, "uppercase": True, "paddingTop": 44, "paddingBottom": 24},
                        m={"columns": 2},
                    ),
                    B(
                        "notes",
                        "columns",
                        {"variant": "even"},
                        {"columns": 2, "gap": 24, "paddingBottom": 32},
                        kids=[
                            B("n1", "text", {"headline": "Rule no. 1", "text": "If it doesn't make you laugh or cringe, it doesn't go in the zine.", "variant": "note"}, {"backgroundColor": "#FFE600", "fontSize": 22}),
                            B("n2", "text", {"headline": "Rule no. 2", "text": "Everything is photocopied until it falls apart.", "variant": "note"}, {"backgroundColor": "#FFFFFF", "fontSize": 22}),
                        ],
                        m={"columns": 1},
                    ),
                    B("stars", "divider", {"variant": "stars"}, {"paddingTop": 12, "paddingBottom": 12}),
                    B("products", "productGrid", products("Table of contents", 6, "grid"), {"columns": 2, "gap": 22, "uppercase": True, "fontSize": 28, "paddingTop": 24, "paddingBottom": 32}, m={"columns": 1}),
                    B("order", "button", {"label": "Order the zine", "url": "#products", "variant": "outline"}, {"paddingBottom": 64}),
                ],
                backgroundColor="#F2EFE6",
                pattern="dots",
                patternColor="#DAD6CB",
            )
        ],
    )
)

# 11 ── Atelier: a quiet fashion lookbook ─────────────────────────────────────────────────────
T.append(
    template(
        "atelier",
        "Atelier",
        "A fashion lookbook in oatmeal and olive: letterspaced wordmark, tall spreads and wide-left stories.",
        ("DM Serif Display", "Inter"),
        ["#F4F0EA", "#FFFFFF", "#1D1B19", "#3E4A33", "#6A655D"],
        1280,
        0,
        [
            S(
                "opening",
                [
                    B(
                        "identity",
                        "profileHeader",
                        profile("centered"),
                        {"paddingTop": 44, "paddingBottom": 20, "fontSize": 18, "uppercase": True, "letterSpacing": 8, "fontWeight": 400},
                    ),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "The Autumn Collection",
                            "Tailoring for ordinary days. Cut long, worn often.",
                            "seed_product_16",
                            "A pressed white shirt and patterned tie",
                            "View the looks",
                            "flip",
                        ),
                        {"fontSize": 76, "minHeight": 560, "paddingTop": 24, "paddingBottom": 24, "aspectRatio": "4:5", "borderRadius": 0},
                        t={"fontSize": 56},
                        m={"fontSize": 40, "minHeight": 0},
                    ),
                ],
            ),
            S(
                "looks",
                [
                    B("products", "productGrid", products("Looks", 4, "lookbook"), {"gap": 48, "paddingTop": 72, "paddingBottom": 72}),
                    B(
                        "story",
                        "columns",
                        {"variant": "wideLeft"},
                        {"columns": 2, "gap": 56, "paddingBottom": 72},
                        kids=[
                            B("s1", "image", {"imageAssetId": "seed_hero_5", "alt": "A model in a white tee in a bright room"}, {"aspectRatio": "4:3", "borderRadius": 0}),
                            B("s2", "text", {"headline": "Made to be worn on repeat.", "text": "Natural fibres, honest seams and cuts that outlast the season."}, {"fontSize": 40}),
                        ],
                        m={"columns": 1},
                    ),
                    B(
                        "details",
                        "gallery",
                        gallery(
                            None,
                            [
                                ("seed_product_15", "A relaxed tee"),
                                ("seed_product_5", "A pressed shirt"),
                                ("seed_product_10", "A fine pendant"),
                                ("seed_product_4", "A structured bag"),
                            ],
                            "grid",
                        ),
                        {"columns": 4, "gap": 10, "aspectRatio": "3:4", "borderRadius": 0, "paddingBottom": 64},
                        m={"columns": 2},
                    ),
                    B("ship", "announcement", {"text": "Complimentary shipping & returns across Malaysia", "variant": "bar"}, {"backgroundColor": "#3E4A33", "textColor": "#F4F0EA", "fontSize": 11, "uppercase": True, "letterSpacing": 3, "paddingTop": 14, "paddingBottom": 14, "textAlign": "center"}),
                ],
            ),
        ],
    )
)

# 12 ── Night Market: lantern light after dark ────────────────────────────────────────────────
T.append(
    template(
        "night-market",
        "Night Market",
        "Midnight navy and lantern amber: a full-bleed night scene, a swipeable stall and round medallions.",
        ("Caprasimo", "Inter"),
        ["#0F1B2D", "#172A45", "#FFF2DD", "#FFB23E", "#A9B7CB"],
        1100,
        24,
        [
            S(
                "night",
                [
                    B(
                        "ticker",
                        "announcement",
                        {"text": "Night market ✦ Open till late ✦ Cash, QR & smiles ✦", "variant": "marquee"},
                        {"backgroundColor": "#FFB23E", "textColor": "#0F1B2D", "fontSize": 12, "fontWeight": 800, "paddingTop": 10, "paddingBottom": 10, "paddingLeft": 0, "paddingRight": 0},
                    ),
                    B("identity", "profileHeader", profile("row"), {"paddingTop": 24, "paddingBottom": 16}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "Open till late.",
                            "Lanterns on, kettle hot, stall stocked with small good things.",
                            "seed_hero_4",
                            "A white pendant lamp glowing against a deep teal wall",
                            "Wander the stalls",
                            "overlay",
                        ),
                        {"fontSize": 84, "minHeight": 520, "borderRadius": 36, "textColor": "#FFF2DD", "textAlign": "right"},
                        m={"fontSize": 48, "minHeight": 440},
                    ),
                    B("products", "productGrid", products("The stalls", 8, "carousel"), {"gap": 20, "paddingTop": 56, "paddingBottom": 32}),
                    B("stars", "divider", {"variant": "stars"}, {"borderColor": "#FFB23E", "paddingTop": 12, "paddingBottom": 12}),
                    B(
                        "tonight",
                        "columns",
                        {"variant": "wideRight"},
                        {"columns": 2, "gap": 40, "paddingTop": 24, "paddingBottom": 40},
                        kids=[
                            B("t1", "text", {"headline": "Tonight's special", "text": "Candles poured this afternoon, still warm when we wrap them. Ask for the one that smells like rain on a hot road.", "variant": "letter"}, {"fontSize": 34}),
                            B("t2", "image", {"imageAssetId": "seed_product_19", "alt": "A candle glowing among fairy lights", "variant": "framed"}, {"aspectRatio": "4:5", "borderRadius": 28, "borderColor": "#FFB23E"}),
                        ],
                        m={"columns": 1},
                    ),
                    B(
                        "lanterns",
                        "gallery",
                        gallery(
                            "Lanterns",
                            [
                                ("seed_product_19", "A candle among fairy lights"),
                                ("seed_product_18", "An amber bottle in warm light"),
                                ("seed_product_12", "A pendant lamp in teal"),
                            ],
                            "grid",
                        ),
                        {"columns": 3, "gap": 24, "aspectRatio": "1:1", "shape": "circle", "fontSize": 40, "paddingBottom": 56},
                        m={"columns": 2},
                    ),
                ],
            )
        ],
    )
)

# 13 ── Seaside Studio: salt air and arched windows ───────────────────────────────────────────
T.append(
    template(
        "seaside-studio",
        "Seaside Studio",
        "Breezy blues: a wide ocean-gradient cover, a row of arched windows and a gentle wave.",
        ("DM Serif Display", "Trebuchet MS"),
        ["#F1F9FC", "#FFFFFF", "#0F3550", "#17699E", "#4C6F85"],
        1100,
        28,
        [
            S(
                "shore",
                [
                    B("identity", "profileHeader", profile("row"), {"paddingTop": 28, "paddingBottom": 20}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "Salt air, slow mornings.",
                            "Homeware for rooms with open windows.",
                            "seed_hero_4",
                            "A pendant lamp against a teal wall",
                            "Step inside",
                            "centered",
                        ),
                        {"fontSize": 60, "gradient": "ocean", "borderRadius": 44, "paddingTop": 52, "paddingBottom": 52, "paddingLeft": 40, "paddingRight": 40, "textAlign": "center"},
                        m={"fontSize": 38, "paddingLeft": 20, "paddingRight": 20},
                    ),
                    B("hello", "announcement", {"text": "Free delivery on orders over RM150", "variant": "pill"}, {"fontSize": 13, "paddingTop": 32, "paddingBottom": 24}),
                    B(
                        "postcard",
                        "image",
                        {"imageAssetId": "seed_product_8", "alt": "White vases with blossoms against a sky-blue chair", "caption": "Postcard from the studio", "variant": "polaroid"},
                        {"aspectRatio": "4:5", "maxWidth": 340, "paddingTop": 12, "paddingBottom": 40},
                    ),
                    B(
                        "windows",
                        "gallery",
                        gallery(
                            "Through the windows",
                            [
                                ("seed_product_1", "Blue plates on a timber shelf"),
                                ("seed_product_2", "A black lamp against a sage wall"),
                                ("seed_product_12", "A pendant lamp against teal"),
                            ],
                            "grid",
                        ),
                        {"columns": 3, "gap": 24, "aspectRatio": "3:4", "shape": "arch", "fontSize": 40, "paddingBottom": 40},
                        m={"columns": 2},
                    ),
                    B("wave", "divider", {"variant": "wave"}, {"borderColor": "#17699E", "paddingTop": 8, "paddingBottom": 24}),
                    B("products", "productGrid", products("Washed ashore", 6, "grid"), {"columns": 3, "gap": 22, "fontSize": 40, "paddingBottom": 48}, m={"columns": 2}),
                    B("visit", "button", {"label": "Visit the studio", "url": "#products", "variant": "outline"}, {"paddingBottom": 72, "textAlign": "center"}),
                ],
            )
        ],
    )
)

# 14 ── Terrazzo Studio: colour blocks and cut-paper shapes ───────────────────────────────────
T.append(
    template(
        "terrazzo-studio",
        "Terrazzo Studio",
        "Cut-paper colour blocks: arch, circle and pill photos on mustard, terracotta and teal.",
        ("Archivo Black", "Georgia"),
        ["#FFF3E2", "#FFFFFF", "#2A1F1A", "#00796B", "#6B5A4F"],
        1160,
        36,
        [
            S(
                "blocks",
                [
                    B("identity", "profileHeader", profile("banner"), {"paddingTop": 28, "paddingBottom": 20, "fontSize": 38}),
                    B(
                        "hero",
                        "hero",
                        hero(
                            "hero",
                            "Colour is a very good idea.",
                            "Paint-splattered prints, bright objects and gifts that look like confetti.",
                            "seed_product_23",
                            "Bright paint and a brush on white paper",
                            "See what's new",
                            "split",
                        ),
                        {"fontSize": 60, "backgroundColor": "#F5B83D", "borderRadius": 52, "shape": "pill", "paddingTop": 44, "paddingBottom": 44, "paddingLeft": 44, "paddingRight": 44, "minHeight": 420},
                        m={"fontSize": 38, "paddingLeft": 22, "paddingRight": 22},
                    ),
                    B(
                        "shapes",
                        "columns",
                        {"variant": "even"},
                        {"columns": 3, "gap": 20, "paddingTop": 24, "paddingBottom": 24},
                        kids=[
                            B("a", "image", {"imageAssetId": "seed_product_8", "alt": "White vases with blossoms"}, {"aspectRatio": "3:4", "shape": "arch", "backgroundColor": "#F7C6C0", "paddingLeft": 0, "paddingRight": 0}),
                            B("b", "image", {"imageAssetId": "seed_product_20", "alt": "A perfume bottle against blue sky"}, {"aspectRatio": "1:1", "shape": "circle", "paddingLeft": 0, "paddingRight": 0}),
                            B("c", "image", {"imageAssetId": "seed_product_1", "alt": "Blue plates on timber"}, {"aspectRatio": "3:4", "shape": "pill", "paddingLeft": 0, "paddingRight": 0}),
                        ],
                        m={"columns": 1},
                    ),
                    B(
                        "ticker",
                        "announcement",
                        {"text": "Colour-blocked ✦ Cut-paper ✦ Handmade in small batches ✦", "variant": "marquee"},
                        {"backgroundColor": "#E4572E", "textColor": "#FFF3E2", "fontSize": 13, "fontWeight": 700, "paddingTop": 12, "paddingBottom": 12, "paddingLeft": 0, "paddingRight": 0, "marginTop": 16},
                    ),
                    B("products", "productGrid", products("Fresh cuts", 6, "mosaic"), {"gap": 22, "paddingTop": 48, "paddingBottom": 32, "fontSize": 36}, m={"fontSize": 28}),
                    B(
                        "note",
                        "text",
                        {"headline": "A studio full of scraps", "text": "Every colour starts as an offcut. We cut, sort and re-glue them into things that make small rooms feel louder.", "variant": "note"},
                        {"backgroundColor": "#BFE6DE", "fontSize": 34, "paddingBottom": 48},
                    ),
                    B("dots", "divider", {"variant": "dots"}, {"borderColor": "#E4572E", "paddingBottom": 56}),
                ],
                backgroundColor="#FFF3E2",
                pattern="checker",
                patternColor="#FBE7C6",
            )
        ],
    )
)

out = ROOT / "packages/storefront-schema/fixtures/themes.json"
out.write_text(json.dumps(T, indent=2, ensure_ascii=False) + "\n")
print(f"wrote {len(T)} templates")
