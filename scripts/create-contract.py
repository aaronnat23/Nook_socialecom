import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]


def obj(properties, required=None):
    return {
        "type": "object",
        "additionalProperties": False,
        "properties": properties,
        "required": required or [],
    }


def string(n=500):
    return {"type": "string", "maxLength": n}


def integer(lo, hi):
    return {"type": "integer", "minimum": lo, "maximum": hi}


color = {"type": "string", "pattern": "^#[0-9a-fA-F]{6}$"}
fonts = {"enum": ["Inter", "Georgia", "Arial", "Courier New", "Trebuchet MS"]}
style = obj(
    {
        **{
            k: integer(0, 160)
            for k in [
                "paddingTop",
                "paddingBottom",
                "paddingLeft",
                "paddingRight",
                "marginTop",
                "marginBottom",
                "gap",
            ]
        },
        "fontFamily": fonts,
        "fontSize": integer(10, 96),
        "fontWeight": {"enum": [400, 500, 600, 700, 800]},
        "lineHeight": {"type": "number", "minimum": 1, "maximum": 2.2},
        "letterSpacing": {"type": "number", "minimum": -2, "maximum": 10},
        "textAlign": {"enum": ["left", "center", "right"]},
        "textColor": color,
        "backgroundColor": color,
        "borderColor": color,
        "borderWidth": integer(0, 8),
        "borderRadius": integer(0, 64),
        "columns": integer(1, 4),
        "maxWidth": integer(280, 1440),
        "minHeight": integer(0, 800),
        "imageFit": {"enum": ["cover", "contain"]},
        "aspectRatio": {"enum": ["1:1", "4:3", "3:4", "16:9", "auto"]},
        "focalX": integer(0, 100),
        "focalY": integer(0, 100),
        "visibility": {"enum": ["visible", "hidden"]},
        "shadow": {"enum": ["none", "soft", "lifted"]},
        "gradient": {"enum": ["none", "lilac", "sunset", "forest"]},
        "uppercase": {"type": "boolean"},
        "width": {"enum": ["full", "contained"]},
        "order": integer(0, 80),
    }
)
url = {
    "type": "string",
    "maxLength": 2048,
    "pattern": r"^(https://[^\s<>]+|/(shop|product|u)/[a-zA-Z0-9_.-]+|#[a-zA-Z0-9_-]+)$",
}
asset = {
    "type": "string",
    "maxLength": 120,
    "pattern": r"^(seed_[a-zA-Z0-9_-]+|[a-f0-9-]{36})$",
}
link = obj({"label": string(80), "url": url}, ["label", "url"])
textnodes = {
    "type": "array",
    "maxItems": 100,
    "items": obj(
        {
            "type": {
                "enum": ["paragraph", "h2", "h3", "bold", "italic", "link", "listItem"]
            },
            "text": string(5000),
            "url": url,
        },
        ["type", "text"],
    ),
}


def props(p, r=None):
    return obj(p, r)


blocks = {
    "hero": props(
        {
            "headline": string(200),
            "subtitle": string(600),
            "imageAssetId": asset,
            "alt": string(300),
            "cta": link,
        },
        ["headline"],
    ),
    "profileHeader": props(
        {
            "headline": string(200),
            "subtitle": string(600),
            "imageAssetId": asset,
            "alt": string(300),
        },
        ["headline"],
    ),
    "announcement": props({"text": string(600)}, ["text"]),
    "text": props({"headline": string(200), "text": string(6000), "nodes": textnodes}),
    "image": props(
        {"imageAssetId": asset, "alt": string(300), "caption": string(300)},
        ["imageAssetId", "alt"],
    ),
    "gallery": props(
        {
            "headline": string(200),
            "images": {
                "type": "array",
                "maxItems": 20,
                "items": obj(
                    {"imageAssetId": asset, "alt": string(300)}, ["imageAssetId", "alt"]
                ),
            },
        },
        ["images"],
    ),
    "productGrid": props(
        {
            "headline": string(200),
            "source": {"enum": ["all", "collection"]},
            "collectionId": string(80),
            "limit": integer(1, 24),
            "sort": {"enum": ["newest", "price_asc", "price_desc"]},
        }
    ),
    "featuredProduct": props(
        {"headline": string(200), "productId": string(80)}, ["productId"]
    ),
    "button": props({"label": string(80), "url": url}, ["label", "url"]),
    "divider": props({}),
    "spacer": props({}),
    "socialLinks": props(
        {"links": {"type": "array", "maxItems": 8, "items": link}}, ["links"]
    ),
    "columns": props({"headline": string(200)}),
}
block_schemas = []
for kind, p in blocks.items():
    fields = {
        "id": {"type": "string", "pattern": "^[a-zA-Z0-9_-]{1,80}$"},
        "type": {"const": kind},
        "props": p,
        "style": {"$ref": "#/$defs/style"},
        "responsive": obj(
            {x: obj({"style": {"$ref": "#/$defs/style"}}) for x in ["mobile", "tablet"]}
        ),
    }
    if kind == "columns":
        fields["children"] = {
            "type": "array",
            "maxItems": 3,
            "items": {"$ref": "#/$defs/block"},
        }
    block_schemas.append(obj(fields, ["id", "type", "props"]))
schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "https://lilac.local/schema/storefront-v1.json",
    **obj(
        {
            "schemaVersion": {"const": 1},
            "shopId": string(80),
            "pageId": string(80),
            "theme": obj(
                {
                    "fontHeading": fonts,
                    "fontBody": fonts,
                    "colors": obj(
                        {
                            k: color
                            for k in [
                                "background",
                                "surface",
                                "text",
                                "accent",
                                "muted",
                            ]
                        },
                        ["background", "surface", "text", "accent", "muted"],
                    ),
                    "contentWidth": integer(280, 1440),
                    "radius": integer(0, 64),
                },
                ["fontHeading", "fontBody", "colors", "contentWidth", "radius"],
            ),
            "sections": {
                "type": "array",
                "maxItems": 80,
                "items": obj(
                    {
                        "id": string(80),
                        "type": {"const": "section"},
                        "style": {"$ref": "#/$defs/style"},
                        "children": {
                            "type": "array",
                            "maxItems": 80,
                            "items": {"$ref": "#/$defs/block"},
                        },
                    },
                    ["id", "type", "children"],
                ),
            },
        },
        ["schemaVersion", "shopId", "pageId", "theme", "sections"],
    ),
    "$defs": {"style": style, "block": {"oneOf": block_schemas}},
}
(root / "packages/storefront-schema/storefront.v1.json").write_text(
    json.dumps(schema, indent=2)
)
names = [
    "Minimal Studio",
    "Vintage Film",
    "Y2K Diary",
    "Dark Editorial",
    "Handmade Market",
    "Streetwear Drop",
    "Botanical",
    "Art Gallery",
]
palettes = [
    ["#FAF9F6", "#FFFFFF", "#29252F", "#7550B5", "#77717F"],
    ["#F6EDE1", "#FFFAF3", "#493725", "#925E45", "#786B60"],
    ["#F6EEFF", "#FFFFFF", "#38234A", "#8753CD", "#7C688E"],
    ["#18171B", "#242229", "#F8F5FB", "#C8ADFA", "#B6AEBF"],
    ["#FFF7EE", "#FFFFFF", "#493128", "#BB694A", "#836E60"],
    ["#F0F0ED", "#FFFFFF", "#171717", "#5F35C9", "#70706B"],
    ["#F0F4EA", "#FAFCF6", "#2F432E", "#55784D", "#6B7E63"],
    ["#FCFAF8", "#FFFFFF", "#29252A", "#8D4B7B", "#8C7C87"],
]
headlines = [
    "Everyday things, thoughtfully made.",
    "A little old soul. A lot of character.",
    "Welcome to my little universe.",
    "Quiet objects. Bold intentions.",
    "Made slowly. Loved for a long time.",
    "Wear your own story.",
    "A slower kind of beautiful.",
    "Objects with a point of view.",
]
fixtures = []
for i, name in enumerate(names):
    slug = name.lower().replace(" ", "-")
    c = palettes[i]
    blocks = [
        {
            "id": "identity",
            "type": "profileHeader",
            "props": {
                "headline": name,
                "subtitle": "Independent design, from our corner of Malaysia.",
            },
            "style": {"paddingTop": 24, "paddingBottom": 24},
        },
        {
            "id": "hero",
            "type": "hero",
            "props": {
                "headline": headlines[i],
                "subtitle": "A collection of little things that feel like you.",
                "imageAssetId": f"seed_hero_{i}",
                "alt": "Independent creative studio collection",
                "cta": {"label": "Explore the collection", "url": "#products"},
            },
            "style": {
                "backgroundColor": c[1],
                "fontSize": 48,
                "minHeight": 320,
                "borderRadius": 12,
                "paddingTop": 32,
                "paddingBottom": 32,
            },
            "responsive": {"mobile": {"style": {"fontSize": 30, "minHeight": 240}}},
        },
        {
            "id": "products",
            "type": "productGrid",
            "props": {
                "headline": "The latest little things",
                "source": "all",
                "limit": 12,
            },
            "style": {"columns": 3, "gap": 20, "paddingTop": 32},
            "responsive": {"mobile": {"style": {"columns": 2, "gap": 12}}},
        },
        {
            "id": "story",
            "type": "text",
            "props": {
                "headline": "Behind the little things",
                "text": "We believe the things you bring into your life should mean something. Every piece in this collection is chosen with care, and sent with a little love from Malaysia.",
            },
            "style": {
                "textAlign": "center",
                "paddingTop": 48,
                "paddingBottom": 48,
                "maxWidth": 680,
            },
        },
        {
            "id": "photos",
            "type": "gallery",
            "props": {
                "headline": "From our studio",
                "images": [
                    {"imageAssetId": f"seed_hero_{i}", "alt": "Our studio collection"},
                    {
                        "imageAssetId": f"seed_product_{i * 3}",
                        "alt": "A detail from our collection",
                    },
                ],
            },
            "style": {"columns": 2, "gap": 16, "borderRadius": 12},
        },
    ]
    if i in [1, 4, 6]:
        blocks.insert(
            0,
            {
                "id": "announce",
                "type": "announcement",
                "props": {"text": "Small batches. Good intentions. Made in Malaysia."},
                "style": {
                    "backgroundColor": c[3],
                    "textColor": "#FFFFFF",
                    "paddingTop": 12,
                    "paddingBottom": 12,
                    "textAlign": "center",
                    "fontSize": 13,
                },
            },
        )
    if i in [2, 7]:
        blocks[2:4] = blocks[2:4][::-1]
    if i == 5:
        blocks[1]["style"].update(
            {
                "uppercase": True,
                "fontFamily": "Arial",
                "fontWeight": 800,
                "fontSize": 64,
                "borderRadius": 0,
            }
        )
    if i == 3:
        blocks[1]["style"].update({"backgroundColor": c[0], "textColor": c[2]})
    doc = {
        "schemaVersion": 1,
        "shopId": "template",
        "pageId": f"page_{slug}",
        "theme": {
            "fontHeading": [
                "Georgia",
                "Georgia",
                "Trebuchet MS",
                "Georgia",
                "Georgia",
                "Arial",
                "Georgia",
                "Georgia",
            ][i],
            "fontBody": "Inter",
            "colors": dict(
                zip(["background", "surface", "text", "accent", "muted"], c)
            ),
            "contentWidth": 1100,
            "radius": [8, 4, 24, 0, 16, 0, 12, 4][i],
        },
        "sections": [{"id": "main", "type": "section", "children": blocks}],
    }
    fixtures.append(
        {
            "id": slug,
            "name": name,
            "description": [
                "Less, but lovelier.",
                "Nostalgia, beautifully collected.",
                "A playful corner of the internet.",
                "Contrast with confidence.",
                "For the things made by hand.",
                "Your next drop starts here.",
                "Rooted in the natural world.",
                "A canvas for your point of view.",
            ][i],
            "document": doc,
        }
    )
(root / "packages/storefront-schema/fixtures/themes.json").write_text(
    json.dumps(fixtures, indent=2)
)
