import json, re
from typing import Any
from jsonschema import Draft7Validator
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .config import ROOT
from .models import Asset, Product, Collection

SCHEMA = json.loads((ROOT / "packages/storefront-schema/storefront.v1.json").read_text())
validator = Draft7Validator(SCHEMA)


def validate_document(doc: dict[str, Any], shop_id: str, db: Session, publish: bool = False) -> list[str]:
    errors = list(validator.iter_errors(doc))
    if errors:
        raise HTTPException(
            422, {"code": "INVALID_DOCUMENT", "message": errors[0].message, "path": list(errors[0].path)}
        )
    if doc["shopId"] != shop_id:
        raise HTTPException(422, "Document belongs to a different shop.")
    if len(json.dumps(doc).encode()) > 250000:
        raise HTTPException(422, "Page exceeds 250 KB.")
    ids: set[str] = {s["id"] for s in doc["sections"]}
    count = 0
    if len(ids) != len(doc["sections"]):
        raise HTTPException(422, "Section IDs must be unique.")
    images = 0
    identity = False
    catalog = False
    warnings: list[str] = []

    def walk(blocks: list[dict[str, Any]], depth: int) -> None:
        nonlocal count, images, identity, catalog
        if depth > 3:
            raise HTTPException(422, "Maximum block nesting depth is 3.")
        for b in blocks:
            count += 1
            if b["id"] in ids:
                raise HTTPException(422, "Duplicate block IDs.")
            ids.add(b["id"])
            p = b["props"]
            styles = [b.get("style", {}), *[v.get("style", {}) for v in b.get("responsive", {}).values()]]
            if b["type"] in ["hero", "profileHeader"] and all(s.get("visibility") != "hidden" for s in styles):
                identity = True
            if b["type"] == "productGrid" and all(s.get("visibility") != "hidden" for s in styles):
                catalog = True
            if b.get("responsive", {}).get("mobile", {}).get("style", {}).get("columns", 1) > 2:
                raise HTTPException(422, "Phone layouts support at most two columns.")
            if b.get("responsive", {}).get("tablet", {}).get("style", {}).get("columns", 1) > 3:
                raise HTTPException(422, "Tablet layouts support at most three columns.")
            for sty in styles:
                foreground = sty.get("textColor", doc["theme"]["colors"]["text"])
                background = sty.get("backgroundColor", doc["theme"]["colors"]["background"])
                if (
                    b["type"] not in ["image", "divider", "spacer", "gallery", "columns"]
                    and contrast_ratio(foreground, background) < 3
                ):
                    if publish:
                        raise HTTPException(
                            422, f"Improve the text/background contrast for {b['id']} before publishing."
                        )
                    warnings.append(f"{b['id']}: text is difficult to read against this background")
            raw = json.dumps(p)
            if re.search(r"<\s*/?\s*[a-z]|javascript:|data:text/html", raw, re.I):
                raise HTTPException(422, "Executable content and HTML are not allowed.")
            refs = [p["imageAssetId"]] if p.get("imageAssetId") else []
            refs += [x["imageAssetId"] for x in p.get("images", [])]
            images += len(refs)
            for ref in refs:
                if ref.startswith("seed_"):
                    valid = bool(
                        re.fullmatch(
                            r"seed_(hero_[0-7]|product_([0-9]|1[0-9]|2[0-3])|cutout_(0|1|2|3|4|8|9|12|18|20))", ref
                        )
                    )
                    if not valid:
                        raise HTTPException(422, "Unknown sample image.")
                else:
                    asset = db.get(Asset, ref)
                    if not asset or asset.shop_id != shop_id:
                        raise HTTPException(422, "Image is missing or belongs to another shop.")
            if b["type"] in ["hero", "image", "profileHeader"] and p.get("imageAssetId") and not p.get("alt"):
                if publish:
                    raise HTTPException(422, "Add alternative text for every image before publishing.")
                warnings.append(f"{b['id']}: add image alternative text")
            if p.get("source") == "collection":
                collection = db.get(Collection, p.get("collectionId", ""))
                if not collection or collection.shop_id != shop_id:
                    raise HTTPException(422, "Choose a collection owned by this shop.")
            if p.get("productId"):
                product = db.get(Product, p["productId"])
                if not product or product.shop_id != shop_id:
                    raise HTTPException(422, "Featured product belongs to another shop.")
            if b.get("children"):
                walk(b["children"], depth + 1)

    for section in doc["sections"]:
        walk(section["children"], 1)
    if count > 80 or images > 40:
        raise HTTPException(422, "Page exceeds the 80-block or 40-image limit.")
    if publish and not identity:
        raise HTTPException(422, "Keep at least one visible profile header or hero.")
    if publish and not catalog:
        raise HTTPException(422, "Keep a visible product grid so buyers can reach your catalog.")
    return warnings


def contrast_ratio(foreground: str, background: str) -> float:
    def luminance(color: str) -> float:
        values = [int(color[i : i + 2], 16) / 255 for i in [1, 3, 5]]
        linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in values]
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]

    a, b = luminance(foreground), luminance(background)
    return (max(a, b) + 0.05) / (min(a, b) + 0.05)
