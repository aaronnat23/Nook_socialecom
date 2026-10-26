"""Writes packages/storefront-schema/storefront.v1.json.

The template fixtures (themes.json) are built by scripts/build-templates.py."""
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
FONTS = [
    "Inter",
    "Georgia",
    "Arial",
    "Courier New",
    "Trebuchet MS",
    "Caprasimo",
    "Caveat",
    "DM Serif Display",
    "Archivo Black",
    "Space Mono",
]
GRADIENTS = [
    "none",
    "lilac",
    "sunset",
    "forest",
    "peach",
    "candy",
    "ocean",
    "night",
    "sage",
    "butter",
]
ASPECTS = ["1:1", "4:3", "3:4", "4:5", "3:2", "16:9", "21:9", "auto"]
PATTERNS = ["none", "dots", "grid", "stripes", "checker"]
SHAPES = ["rect", "arch", "pill", "circle"]
# Layout variants a block can take (the first is the default). Keep in sync with
# packages/storefront-schema/src/index.ts.
VARIANTS = {
    "hero": ["split", "flip", "centered", "overlay", "poster", "stack"],
    "profileHeader": ["row", "centered", "banner", "minimal"],
    "text": ["plain", "quote", "note", "letter"],
    "image": ["plain", "framed", "polaroid"],
    "gallery": ["grid", "filmstrip", "polaroid", "masonry"],
    "productGrid": ["grid", "list", "carousel", "mosaic", "lookbook"],
    "featuredProduct": ["card", "spotlight"],
    "announcement": ["bar", "marquee", "pill"],
    "divider": ["line", "dots", "wave", "stars", "ornament"],
    "button": ["solid", "outline", "link"],
    "socialLinks": ["links", "chips"],
    "columns": ["even", "wideLeft", "wideRight"],
}
fonts = {"enum": FONTS}
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
        "fontSize": integer(10, 160),
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
        "aspectRatio": {"enum": ASPECTS},
        "focalX": integer(0, 100),
        "focalY": integer(0, 100),
        "visibility": {"enum": ["visible", "hidden"]},
        "shadow": {"enum": ["none", "soft", "lifted"]},
        "gradient": {"enum": GRADIENTS},
        "pattern": {"enum": PATTERNS},
        "patternColor": color,
        "shape": {"enum": SHAPES},
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
    if kind in VARIANTS:
        p = {**p, "properties": {**p["properties"], "variant": {"enum": VARIANTS[kind]}}}
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
