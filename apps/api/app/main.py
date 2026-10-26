from __future__ import annotations
import copy, hashlib, io, json, logging, re, time
from contextlib import asynccontextmanager
from collections import defaultdict, deque
from datetime import timedelta
from typing import Any, Annotated
from collections.abc import AsyncIterator, Awaitable, Callable
from sqlalchemy.orm import Session
from uuid import uuid4
import httpx
import jwt
from fastapi import FastAPI, HTTPException, Header, Request, Response, UploadFile, File, Form
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import select, func, update, delete, or_, text, Text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from .auth import DB, User, passwords, token_for
from .config import settings, CONTRACT
from .contracts import (
    AuthInput,
    ProfileInput,
    DraftInput,
    PublishInput,
    RestoreInput,
    ProductInput,
    QuantityInput,
    QuoteInput,
    CheckoutInput,
    ShipInput,
    ReportInput,
    SellerInput,
    CollectionInput,
    RefreshInput,
    ShopInput,
    CutoutInput,
)
from .models import (
    Profile,
    Shop,
    Draft,
    Version,
    Publication,
    Product,
    Variant,
    Follow,
    Favorite,
    Collection,
    Asset,
    CartItem,
    Order,
    WebhookEvent,
    Audit,
    Report,
    SessionToken,
    now,
)
from .validation import validate_document
from .payments import provider
from . import storage, cutout
from .bootstrap import bootstrap


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    if settings.auto_migrate:
        try:
            bootstrap()
        except Exception:  # keep serving so /health can report the database problem instead of every route failing
            logging.getLogger("nook").exception("Database bootstrap failed")
    yield


app = FastAPI(title=f"{settings.app_name} Commerce API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "If-Match", "Idempotency-Key"],
    expose_headers=["ETag"],
)
P = "/api/v1"
THEMES = json.loads((CONTRACT / "themes.json").read_text())
Image.MAX_IMAGE_PIXELS = 36000000
rate_buckets: dict[str, deque[float]] = defaultdict(deque)


@app.middleware("http")
async def limits(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    start = time.monotonic()
    key = f"{request.client.host if request.client else 'local'}:{request.url.path}"
    bucket = rate_buckets[key]
    while bucket and bucket[0] < start - 60:
        bucket.popleft()
    cap = 20 if request.method == "POST" and "/auth/" in request.url.path else 120
    if request.method == "POST" and request.url.path.endswith("/cutouts"):
        cap = 12
    if len(bucket) >= cap:
        return JSONResponse(
            {"error": {"code": "RATE_LIMIT", "message": "Please wait a moment and try again."}}, status_code=429
        )
    bucket.append(start)
    response = await call_next(request)
    response.headers["X-Request-ID"] = str(uuid4())
    return response


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, dict) else {"message": exc.detail}
    return JSONResponse(
        {
            "error": {
                "code": detail.get("code", f"HTTP_{exc.status_code}"),
                "message": detail.get("message", "Invalid request."),
                "details": detail,
                "requestId": str(uuid4()),
            }
        },
        status_code=exc.status_code,
    )


@app.exception_handler(RequestValidationError)
async def input_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [{"path": list(e["loc"]), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(
        {"error": {"code": "VALIDATION_ERROR", "message": errors[0]["message"], "details": errors}}, status_code=422
    )


@app.exception_handler(IntegrityError)
async def integrity_error(request: Request, exc: IntegrityError) -> JSONResponse:
    return JSONResponse(
        {"error": {"code": "CONFLICT", "message": "That handle, item or request already exists."}}, status_code=409
    )


def owned(db: Session, user: Profile, shop_id: str) -> Shop:
    s = db.get(Shop, shop_id)
    if not s or s.owner_user_id != user.id:
        raise HTTPException(404, "Space not found.")
    return s


def shop_data(db: Session, s: Shop, doc: bool = False) -> dict[str, Any]:
    result = {
        k: getattr(s, k)
        for k in [
            "id",
            "slug",
            "name",
            "bio",
            "category",
            "location",
            "avatar",
            "cover",
            "seller_enabled",
            "theme",
            "shipping_minor",
            "return_policy",
        ]
    }
    result["followers"] = db.scalar(select(func.count()).select_from(Follow).where(Follow.shop_id == s.id)) or 0
    if doc:
        pub = db.get(Publication, s.id)
        v = db.get(Version, pub.version_id) if pub else None
        result["document"] = v.document if v else None
    return result


def product_data(db: Session, p: Product) -> dict[str, Any]:
    s = db.get(Shop, p.shop_id)
    assert s is not None
    return {
        **{
            k: getattr(p, k)
            for k in [
                "id",
                "slug",
                "shop_id",
                "title",
                "description",
                "price_minor",
                "currency",
                "image",
                "category",
                "status",
            ]
        },
        "stage": p.stage,
        "created_at": p.created_at.isoformat(),
        "shop_name": s.name,
        "shop_slug": s.slug,
        "shipping_minor": s.shipping_minor,
        "return_policy": s.return_policy,
        "variants": [
            {"id": v.id, "sku": v.sku, "options": v.options, "price_minor": v.price_minor, "stock": v.stock}
            for v in db.scalars(select(Variant).where(Variant.product_id == p.id).order_by(Variant.sku))
        ],
    }


def order_data(db: Session, o: Order) -> dict[str, Any]:
    s = db.get(Shop, o.shop_id)
    assert s is not None
    return {
        **{
            k: getattr(o, k)
            for k in [
                "id",
                "shop_id",
                "state",
                "currency",
                "subtotal_minor",
                "shipping_minor",
                "total_minor",
                "items",
                "tracking",
            ]
        },
        "shop_name": s.name,
        "created_at": o.created_at.isoformat(),
        "sandbox": True,
    }


def me_data(db: Session, u: Profile) -> dict[str, Any]:
    s = db.scalar(select(Shop).where(Shop.owner_user_id == u.id))
    assert s is not None
    return {
        **{k: getattr(u, k) for k in ["id", "email", "handle", "display_name", "bio", "is_admin", "preferences"]},
        "seller_enabled": s.seller_enabled,
        "shop": shop_data(db, s),
        "favorites": list(db.scalars(select(Favorite.product_id).where(Favorite.user_id == u.id))),
        "following": list(db.scalars(select(Follow.shop_id).where(Follow.user_id == u.id))),
    }


def draft_data(d: Draft) -> dict[str, Any]:
    return {"document": d.document, "revision": d.revision, "updated_at": d.updated_at.isoformat()}


def audit(db: Session, u: str, action: str, res: str, data: dict[str, Any] | None = None) -> None:
    db.add(Audit(actor_id=u, action=action, resource_id=res, data=data or {}))


@app.get("/health")
def health(db: DB) -> dict[str, Any]:
    db.execute(text("select 1"))
    return {"status": "ok", "database": "postgresql", "auth": settings.auth_mode, "payments": "sandbox"}


def supabase_auth(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(503, "Supabase authentication is not configured.")
    try:
        with httpx.Client(timeout=15) as client:
            r = client.post(
                f"{settings.supabase_url}/auth/v1/{path}",
                json=payload,
                headers={"apikey": settings.supabase_publishable_key},
            )
        data = r.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(502, "Sign-in service is unavailable. Please retry.") from exc
    if r.status_code >= 300:
        raise HTTPException(401, "Sign-in failed. Check your details and email confirmation.")
    if not data.get("access_token"):
        raise HTTPException(409, "Check your email to confirm your account, then sign in.")
    return {"token": data["access_token"], "refresh_token": data.get("refresh_token"), "mode": "supabase"}


@app.get(P + "/auth/config")
def auth_config() -> dict[str, Any]:
    return {"mode": settings.auth_mode, "demo_available": settings.auth_mode == "local"}


@app.post(P + "/auth/session-refresh")
def session_refresh(data: RefreshInput) -> dict[str, Any]:
    if settings.auth_mode != "supabase":
        raise HTTPException(400, "Refresh tokens are used only with Supabase.")
    return supabase_auth("token?grant_type=refresh_token", {"refresh_token": data.refresh_token})


@app.post(P + "/auth/logout")
def logout(db: DB, user: User, authorization: Annotated[str, Header()]) -> dict[str, bool]:
    raw = authorization.removeprefix("Bearer ")
    if settings.auth_mode == "local":
        claims = jwt.decode(
            raw, settings.local_auth_secret, algorithms=["HS256"], issuer="lilac-development", audience="authenticated"
        )
        session = db.get(SessionToken, claims["jti"])
        if session:
            session.revoked = True
        db.commit()
    else:
        with httpx.Client(timeout=15) as client:
            r = client.post(
                f"{settings.supabase_url}/auth/v1/logout",
                headers={"apikey": settings.supabase_publishable_key, "Authorization": authorization},
            )
        if r.status_code >= 300:
            raise HTTPException(502, "Could not revoke your provider session. Please retry.")
    return {"signed_out": True}


@app.post(P + "/auth/register")
def register(data: AuthInput, db: DB) -> dict[str, Any]:
    if settings.auth_mode == "supabase":
        return supabase_auth(
            "signup",
            {
                "email": data.email,
                "password": data.password,
                "data": {"display_name": data.display_name, "handle": data.handle},
            },
        )
    handle = data.handle.lower()
    if not re.fullmatch(r"[a-z0-9_.]{3,30}", handle) or handle in [
        "admin",
        "api",
        "settings",
        "support",
        "lilac",
        "nook",
    ]:
        raise HTTPException(422, "Choose a handle with 3–30 letters, numbers, dots or underscores.")
    u = Profile(
        email=data.email.lower(),
        password_hash=passwords.hash(data.password),
        handle=handle,
        display_name=data.display_name or handle,
    )
    db.add(u)
    db.flush()
    s = Shop(owner_user_id=u.id, slug=handle, name=u.display_name)
    db.add(s)
    db.flush()
    doc = copy.deepcopy(THEMES[0]["document"])
    doc["shopId"] = s.id
    doc["sections"][0]["children"][0]["props"]["headline"] = u.display_name
    db.add(Draft(shop_id=s.id, document=doc))
    db.commit()
    return {"token": token_for(u), "user": me_data(db, u), "mode": "local-development"}


@app.post(P + "/auth/login")
def login(data: AuthInput, db: DB) -> dict[str, Any]:
    if settings.auth_mode == "supabase":
        return supabase_auth("token?grant_type=password", {"email": data.email, "password": data.password})
    u = db.scalar(select(Profile).where(Profile.email == data.email.lower()))
    if not u or u.disabled or not passwords.verify(data.password, u.password_hash):
        raise HTTPException(401, "Email or password does not match.")
    return {"token": token_for(u), "user": me_data(db, u), "mode": "local-development"}


@app.post(P + "/auth/refresh")
def refresh(user: User) -> dict[str, str]:
    if settings.auth_mode != "local":
        raise HTTPException(400, "Use the Supabase session refresh endpoint.")
    return {"token": token_for(user)}


@app.get(P + "/me")
def me(db: DB, user: User) -> dict[str, Any]:
    return me_data(db, user)


@app.patch(P + "/me")
def edit_me(data: ProfileInput, db: DB, user: User) -> dict[str, Any]:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(user, k, v)
    db.commit()
    return me_data(db, user)


@app.post(P + "/me/seller-onboarding")
def seller_onboarding(data: SellerInput, db: DB, user: User) -> dict[str, Any]:
    s = db.scalar(select(Shop).where(Shop.owner_user_id == user.id))
    assert s is not None
    s.seller_enabled = True
    audit(db, user.id, "seller.sandbox_enabled", s.id)
    db.commit()
    return me_data(db, user)


@app.get(P + "/me/seller-onboarding/status")
def seller_status(db: DB, user: User) -> dict[str, Any]:
    return {"sandbox": True, "live_payments_enabled": False, "seller_enabled": me_data(db, user)["seller_enabled"]}


@app.get(P + "/users/{handle}")
def profile(handle: str, db: DB) -> dict[str, Any]:
    u = db.scalar(select(Profile).where(Profile.handle == handle.lower(), Profile.disabled.is_(False)))
    if not u:
        raise HTTPException(404, "Profile not found.")
    s = db.scalar(select(Shop).where(Shop.owner_user_id == u.id))
    assert s is not None
    return {"handle": u.handle, "display_name": u.display_name, "bio": u.bio, "shop": shop_data(db, s, True)}


@app.get(P + "/themes")
def themes() -> dict[str, Any]:
    return {"items": THEMES, "hasMore": False}


@app.get(P + "/shops/{slug}")
def public_shop(slug: str, db: DB) -> dict[str, Any]:
    s = db.scalar(select(Shop).where(or_(Shop.slug == slug, Shop.id == slug), Shop.status == "active"))
    if not s:
        raise HTTPException(404, "Space not found.")
    result = shop_data(db, s, True)
    if not result["document"]:
        raise HTTPException(404, "This space has not been published yet.")
    result["collections"] = [
        {"id": c.id, "title": c.title, "product_ids": c.product_ids}
        for c in db.scalars(select(Collection).where(Collection.shop_id == s.id))
    ]
    result["products"] = [
        product_data(db, p)
        for p in db.scalars(
            select(Product)
            .where(Product.shop_id == s.id, Product.status == "published")
            .order_by(Product.created_at.desc())
        )
    ]
    return result


@app.patch(P + "/shops/{shop_id}")
def shop_settings(shop_id: str, data: ShopInput, db: DB, user: User) -> dict[str, Any]:
    s = owned(db, user, shop_id)
    for k, v in data.model_dump().items():
        setattr(s, k, v)
    audit(db, user.id, "shop.settings_updated", shop_id)
    db.commit()
    return shop_data(db, s)


@app.get(P + "/shops/{shop_id}/published")
def published(shop_id: str, db: DB, response: Response) -> dict[str, Any]:
    pub = db.get(Publication, shop_id)
    s = db.get(Shop, shop_id)
    if not pub or not s or s.status != "active":
        raise HTTPException(404, "Published page not found.")
    v = db.get(Version, pub.version_id)
    assert v is not None
    response.headers["ETag"] = f'"{v.checksum}"'
    return {"document": v.document, "versionNo": v.version_no}


@app.get(P + "/shops/{shop_id}/draft")
def get_draft(shop_id: str, db: DB, user: User, response: Response) -> dict[str, Any]:
    owned(db, user, shop_id)
    d = db.get(Draft, shop_id)
    assert d is not None
    response.headers["ETag"] = f'"{d.revision}"'
    return draft_data(d)


@app.patch(P + "/shops/{shop_id}/draft")
def save_draft(
    shop_id: str,
    data: DraftInput,
    db: DB,
    user: User,
    response: Response,
    if_match: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    owned(db, user, shop_id)
    if if_match is None or if_match.strip('"') != str(data.baseRevision):
        raise HTTPException(428, "Send the draft revision in If-Match.")
    warnings = validate_document(data.document, shop_id, db)
    d = db.scalar(
        update(Draft)
        .where(Draft.shop_id == shop_id, Draft.revision == data.baseRevision)
        .values(document=data.document, revision=Draft.revision + 1, updated_at=now())
        .returning(Draft)
    )
    if not d:
        current = db.get(Draft, shop_id)
        assert current is not None
        raise HTTPException(
            409,
            {
                "code": "REVISION_CONFLICT",
                "message": "This space changed elsewhere. Reload the latest version or save a local copy.",
                "currentRevision": current.revision,
            },
        )
    db.commit()
    response.headers["ETag"] = f'"{d.revision}"'
    return {**draft_data(d), "validationWarnings": warnings}


@app.post(P + "/shops/{shop_id}/publish")
def publish(shop_id: str, data: PublishInput, db: DB, user: User) -> dict[str, Any]:
    owned(db, user, shop_id)
    d = db.scalar(select(Draft).where(Draft.shop_id == shop_id).with_for_update())
    assert d is not None
    if d.revision != data.expectedRevision:
        raise HTTPException(409, "This space changed elsewhere. Save the latest draft before publishing.")
    validate_document(d.document, shop_id, db, True)
    n = (db.scalar(select(func.max(Version.version_no)).where(Version.shop_id == shop_id)) or 0) + 1
    v = Version(
        shop_id=shop_id,
        version_no=n,
        document=copy.deepcopy(d.document),
        checksum=hashlib.sha256(json.dumps(d.document, sort_keys=True).encode()).hexdigest(),
        author_id=user.id,
        note=data.note,
    )
    db.add(v)
    db.flush()
    db.execute(
        insert(Publication)
        .values(shop_id=shop_id, version_id=v.id)
        .on_conflict_do_update(index_elements=["shop_id"], set_={"version_id": v.id})
    )
    audit(db, user.id, "storefront.publish", shop_id, {"version": n})
    db.commit()
    return {"versionId": v.id, "versionNo": n, "publishedAt": v.created_at.isoformat()}


@app.post(P + "/shops/{shop_id}/snapshots")
def draft_snapshot(shop_id: str, data: PublishInput, db: DB, user: User) -> dict[str, Any]:
    owned(db, user, shop_id)
    d = db.scalar(select(Draft).where(Draft.shop_id == shop_id).with_for_update())
    assert d is not None
    if d.revision != data.expectedRevision:
        raise HTTPException(409, "Reload the latest draft before creating a backup.")
    n = (db.scalar(select(func.max(Version.version_no)).where(Version.shop_id == shop_id)) or 0) + 1
    v = Version(
        shop_id=shop_id,
        version_no=n,
        document=copy.deepcopy(d.document),
        checksum=hashlib.sha256(json.dumps(d.document, sort_keys=True).encode()).hexdigest(),
        author_id=user.id,
        note=f"Draft backup: {data.note}"[:300],
    )
    db.add(v)
    audit(db, user.id, "storefront.backup", shop_id, {"version": n})
    db.commit()
    return {"versionId": v.id, "versionNo": n, "draftBackup": True}


@app.get(P + "/shops/{shop_id}/versions")
def versions(shop_id: str, db: DB, user: User) -> dict[str, Any]:
    owned(db, user, shop_id)
    return {
        "items": [
            {
                "id": v.id,
                "versionNo": v.version_no,
                "note": v.note,
                "created_at": v.created_at.isoformat(),
                "checksum": v.checksum,
            }
            for v in db.scalars(select(Version).where(Version.shop_id == shop_id).order_by(Version.version_no.desc()))
        ]
    }


@app.post(P + "/shops/{shop_id}/restore")
def restore(shop_id: str, data: RestoreInput, db: DB, user: User) -> dict[str, Any]:
    owned(db, user, shop_id)
    v = db.get(Version, data.versionId)
    if not v or v.shop_id != shop_id:
        raise HTTPException(404, "Version not found.")
    d = db.scalar(
        update(Draft)
        .where(Draft.shop_id == shop_id, Draft.revision == data.expectedRevision)
        .values(document=copy.deepcopy(v.document), revision=Draft.revision + 1, updated_at=now())
        .returning(Draft)
    )
    if not d:
        raise HTTPException(409, "This space changed elsewhere. Reload before restoring.")
    audit(db, user.id, "storefront.restore", shop_id, {"version": v.version_no})
    db.commit()
    return draft_data(d)


@app.get(P + "/discover")
def discover(db: DB) -> dict[str, Any]:
    shops = list(db.scalars(select(Shop).join(Publication).where(Shop.status == "active").order_by(Shop.created_at)))
    products = list(
        db.scalars(
            select(Product)
            .join(Shop)
            .where(Product.status == "published", Shop.status == "active")
            .order_by(Product.created_at)
            .limit(24)
        )
    )
    return {
        "shops": [shop_data(db, s) for s in shops],
        "products": [product_data(db, p) for p in products],
        "categories": ["All finds", "Fashion", "Home & living", "Art & prints", "Jewelry", "Beauty", "Lifestyle"],
        "sandbox": True,
    }


@app.get(P + "/search")
def search(
    db: DB,
    q: str = "",
    category: str = "",
    sort: str = "newest",
    priceMin: int = 0,
    priceMax: int = 100000000,
    inStock: bool = False,
    cursor: int = 0,
) -> dict[str, Any]:
    if cursor < 0 or len(q) > 200:
        raise HTTPException(422, "Invalid search.")
    stmt = (
        select(Product)
        .join(Shop)
        .where(
            Product.status == "published",
            Shop.status == "active",
            Product.price_minor >= priceMin,
            Product.price_minor <= priceMax,
        )
    )
    if q:
        stmt = stmt.where(
            or_(Product.title.ilike(f"%{q}%"), Product.description.ilike(f"%{q}%"), Shop.name.ilike(f"%{q}%"))
        )
    if category and category != "All finds":
        stmt = stmt.where(Product.category == category)
    if inStock:
        stmt = stmt.where(Product.id.in_(select(Variant.product_id).where(Variant.stock > 0)))
    ordering = (
        Product.price_minor.asc()
        if sort == "price_asc"
        else Product.price_minor.desc()
        if sort == "price_desc"
        else Product.created_at.desc()
    )
    products = list(db.scalars(stmt.order_by(ordering, Product.id).offset(cursor).limit(25)))
    has_more = len(products) > 24
    shops = list(
        db.scalars(
            select(Shop)
            .join(Publication)
            .where(Shop.status == "active", or_(Shop.name.ilike(f"%{q}%"), Shop.slug.ilike(f"%{q}%")))
            .limit(8)
        )
    )
    return {
        "items": [product_data(db, p) for p in products[:24]],
        "shops": [shop_data(db, s) for s in shops],
        "hasMore": has_more,
        "cursor": cursor + 24 if has_more else None,
    }


@app.get(P + "/products/{slug}")
def get_product(slug: str, db: DB) -> dict[str, Any]:
    p = db.scalar(
        select(Product)
        .join(Shop)
        .where(or_(Product.id == slug, Product.slug == slug), Product.status == "published", Shop.status == "active")
    )
    if not p:
        raise HTTPException(404, "Product not found.")
    return product_data(db, p)


@app.get(P + "/shops/{shop_id}/products")
def seller_products(shop_id: str, db: DB, user: User) -> dict[str, Any]:
    owned(db, user, shop_id)
    return {
        "items": [
            product_data(db, p)
            for p in db.scalars(select(Product).where(Product.shop_id == shop_id).order_by(Product.created_at.desc()))
        ]
    }


SEED_IMAGE = re.compile(r"seed_(hero_[0-7]|product_([0-9]|1[0-9]|2[0-3])|cutout_([0-9]|1[0-9]|2[0-3]))")


def owned_image(db: Session, shop_id: str, ref: str) -> None:
    """Accepts a bundled sample image or an asset that belongs to this shop."""
    if ref.startswith("seed_"):
        if not SEED_IMAGE.fullmatch(ref):
            raise HTTPException(422, "Unknown sample image.")
        return
    a = db.get(Asset, ref) if re.fullmatch(r"[a-f0-9-]{36}", ref) else None
    if not a or a.shop_id != shop_id:
        raise HTTPException(422, "Choose an image owned by this shop.")


def validated_stage(db: Session, shop_id: str, data: ProductInput) -> dict[str, Any] | None:
    if data.stage is None:
        return None
    stage = data.stage
    if stage.cutout:
        owned_image(db, shop_id, stage.cutout)
    if stage.backdrop.kind == "photo":
        if not stage.backdrop.asset_id:
            raise HTTPException(422, "Choose a photo for the backdrop.")
        owned_image(db, shop_id, stage.backdrop.asset_id)
    elif stage.backdrop.asset_id:
        raise HTTPException(422, "Only photo backdrops use an image.")
    return stage.model_dump()


def apply_product(db: Session, p: Product, data: ProductInput) -> None:
    for k in ["title", "description", "image", "category", "status"]:
        setattr(p, k, getattr(data, k))
    p.price_minor = min(v.price_minor for v in data.variants)
    if not re.fullmatch(r"seed_(hero_[0-7]|product_([0-9]|1[0-9]|2[0-3]))|[a-f0-9-]{36}", data.image):
        raise HTTPException(422, "Choose a valid product photo.")
    if not data.image.startswith("seed_"):
        a = db.get(Asset, data.image)
        if not a or a.shop_id != p.shop_id:
            raise HTTPException(422, "Choose an image owned by this shop.")
    p.stage = validated_stage(db, p.shop_id, data)
    existing = {
        v.sku: v
        for v in db.scalars(select(Variant).where(Variant.product_id == p.id).order_by(Variant.id).with_for_update())
    }
    for v in data.variants:
        row = existing.pop(v.sku, None)
        if row:
            row.options = v.options
            row.price_minor = v.price_minor
            row.stock = v.stock
        else:
            db.add(Variant(product_id=p.id, **v.model_dump()))
    if existing:
        raise HTTPException(422, "Existing variant SKUs cannot be removed; set stock to zero instead.")


@app.post(P + "/shops/{shop_id}/products", status_code=201)
def create_product(shop_id: str, data: ProductInput, db: DB, user: User) -> dict[str, Any]:
    s = owned(db, user, shop_id)
    if not s.seller_enabled:
        raise HTTPException(403, "Enable sandbox selling first.")
    slug = re.sub(r"[^a-z0-9]+", "-", data.title.lower()).strip("-")[:140]
    p = Product(shop_id=shop_id, slug=f"{slug}-{str(uuid4())[:8]}", title=data.title, price_minor=data.price_minor)
    db.add(p)
    db.flush()
    apply_product(db, p, data)
    db.commit()
    return product_data(db, p)


@app.patch(P + "/products/{product_id}")
def edit_product(product_id: str, data: ProductInput, db: DB, user: User) -> dict[str, Any]:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found.")
    owned(db, user, p.shop_id)
    apply_product(db, p, data)
    db.commit()
    return product_data(db, p)


@app.post(P + "/products/{product_id}/{action}")
def product_action(product_id: str, action: str, db: DB, user: User) -> dict[str, Any]:
    if action not in ["publish", "archive", "favorite"]:
        raise HTTPException(404, "Action not found.")
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found.")
    if action == "favorite":
        if p.status != "published":
            raise HTTPException(404, "Product not found.")
        db.execute(insert(Favorite).values(user_id=user.id, product_id=p.id).on_conflict_do_nothing())
        db.commit()
        return {"saved": True}
    owned(db, user, p.shop_id)
    p.status = "published" if action == "publish" else "archived"
    db.commit()
    return product_data(db, p)


@app.delete(P + "/products/{product_id}/favorite")
def unfavorite(product_id: str, db: DB, user: User) -> dict[str, bool]:
    db.execute(delete(Favorite).where(Favorite.user_id == user.id, Favorite.product_id == product_id))
    db.commit()
    return {"saved": False}


@app.post(P + "/shops/{shop_id}/follow")
def follow(shop_id: str, db: DB, user: User) -> dict[str, bool]:
    s = db.get(Shop, shop_id)
    if not s or s.status != "active" or not db.get(Publication, shop_id):
        raise HTTPException(404, "Space not found.")
    db.execute(insert(Follow).values(user_id=user.id, shop_id=shop_id).on_conflict_do_nothing())
    db.commit()
    return {"following": True}


@app.delete(P + "/shops/{shop_id}/follow")
def unfollow(shop_id: str, db: DB, user: User) -> dict[str, bool]:
    db.execute(delete(Follow).where(Follow.user_id == user.id, Follow.shop_id == shop_id))
    db.commit()
    return {"following": False}


@app.get(P + "/shops/{shop_id}/collections")
def collections(shop_id: str, db: DB) -> dict[str, Any]:
    return {
        "items": [
            {"id": c.id, "title": c.title, "product_ids": c.product_ids}
            for c in db.scalars(select(Collection).where(Collection.shop_id == shop_id))
        ]
    }


@app.post(P + "/shops/{shop_id}/collections")
def add_collection(shop_id: str, data: CollectionInput, db: DB, user: User) -> dict[str, Any]:
    owned(db, user, shop_id)
    for pid in data.product_ids:
        p = db.get(Product, pid)
        if not p or p.shop_id != shop_id:
            raise HTTPException(422, "Every product must belong to this shop.")
    c = Collection(shop_id=shop_id, **data.model_dump())
    db.add(c)
    db.commit()
    return {"id": c.id, "title": c.title, "product_ids": c.product_ids}


@app.patch(P + "/shops/{shop_id}/collections/{collection_id}")
def edit_collection(shop_id: str, collection_id: str, data: CollectionInput, db: DB, user: User) -> dict[str, Any]:
    owned(db, user, shop_id)
    c = db.get(Collection, collection_id)
    if not c or c.shop_id != shop_id:
        raise HTTPException(404, "Collection not found.")
    for pid in data.product_ids:
        p = db.get(Product, pid)
        if not p or p.shop_id != shop_id:
            raise HTTPException(422, "Every product must belong to this shop.")
    c.title = data.title
    c.product_ids = data.product_ids
    audit(db, user.id, "collection.updated", c.id)
    db.commit()
    return {"id": c.id, "title": c.title, "product_ids": c.product_ids}


@app.post(P + "/uploads", status_code=201)
async def upload(
    db: DB,
    user: User,
    file: Annotated[UploadFile, File()],
    shop_id: Annotated[str, Form()],
    alt: Annotated[str, Form()],
    keep_alpha: Annotated[bool, Form()] = False,
) -> dict[str, Any]:
    owned(db, user, shop_id)
    if len(alt) < 1 or len(alt) > 300:
        raise HTTPException(422, "Add a short image description.")
    raw = await file.read(10 * 1024 * 1024 + 1)
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(413, "Images must be smaller than 10 MB.")
    used = db.scalar(select(func.sum(Asset.size_bytes)).where(Asset.shop_id == shop_id)) or 0
    if used + len(raw) > 500 * 1024 * 1024:
        raise HTTPException(413, "This shop has reached its 500 MB image allowance.")
    try:
        im: Image.Image = Image.open(io.BytesIO(raw))
        if im.format not in ["JPEG", "PNG", "WEBP"] or im.width > 6000 or im.height > 6000:
            raise ValueError("Unsupported image")
        # Transparent PNG/WebP files are kept as they are when the seller says the photo is already cut out.
        im = ImageOps.exif_transpose(im).convert("RGBA" if keep_alpha else "RGB")
        im.thumbnail((2400, 2400))
        output = io.BytesIO()
        im.save(output, format="WEBP", quality=88)
    except (UnidentifiedImageError, ValueError, OSError, Image.DecompressionBombError) as exc:
        raise HTTPException(422, "Use a JPG, PNG or WebP image up to 6000 × 6000 pixels.") from exc
    payload = output.getvalue()
    asset_id = str(uuid4())
    path = f"{shop_id}/{asset_id}.webp"
    storage.store(asset_id, path, payload)
    a = Asset(
        id=asset_id,
        owner_user_id=user.id,
        shop_id=shop_id,
        path=path,
        width=im.width,
        height=im.height,
        size_bytes=len(payload),
        checksum=hashlib.sha256(payload).hexdigest(),
        alt=alt,
    )
    db.add(a)
    db.commit()
    return {"id": a.id, "width": a.width, "height": a.height, "alt": a.alt, "url": f"/media/{a.id}.webp"}


@app.post(P + "/shops/{shop_id}/cutouts", status_code=201)
def make_cutout(shop_id: str, data: CutoutInput, db: DB, user: User) -> dict[str, Any]:
    """Removes the background from one of this shop's uploaded photos and stores the result."""
    owned(db, user, shop_id)
    source = db.get(Asset, data.asset_id)
    if not source or source.shop_id != shop_id:
        raise HTTPException(404, "Photo not found.")
    used = db.scalar(select(func.sum(Asset.size_bytes)).where(Asset.shop_id == shop_id)) or 0
    if used > 480 * 1024 * 1024:
        raise HTTPException(413, "This shop has reached its 500 MB image allowance.")
    try:
        original = Image.open(storage.local_path(source))
        result = cutout.remove_background(ImageOps.exif_transpose(original))
    except cutout.CutoutUnavailable as exc:
        raise HTTPException(503, "Background removal isn't available on this server yet.") from exc
    except cutout.CutoutFailed as exc:
        raise HTTPException(422, str(exc)) from exc
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(422, "We couldn't read that photo.") from exc
    output = io.BytesIO()
    result.save(output, format="WEBP", quality=92, method=4)
    payload = output.getvalue()
    asset_id = str(uuid4())
    path = f"{shop_id}/{asset_id}.webp"
    storage.store(asset_id, path, payload)
    a = Asset(
        id=asset_id,
        owner_user_id=user.id,
        shop_id=shop_id,
        path=path,
        width=result.width,
        height=result.height,
        size_bytes=len(payload),
        checksum=hashlib.sha256(payload).hexdigest(),
        alt=f"{source.alt} (cut out)"[:300],
    )
    db.add(a)
    db.commit()
    return {"id": a.id, "width": a.width, "height": a.height, "alt": a.alt, "url": f"/media/{a.id}.webp"}


@app.get("/media/{filename}")
def media(filename: str, db: DB) -> FileResponse:
    if not re.fullmatch(r"[a-f0-9-]{36}\.webp", filename):
        raise HTTPException(404, "Image not found.")
    a = db.get(Asset, filename[:-5])
    if not a:
        raise HTTPException(404, "Image not found.")
    shop = db.get(Shop, a.shop_id)
    if not shop or shop.status != "active":
        raise HTTPException(404, "Image not found.")
    # Only published assets are public. Owners access draft images via the asset endpoint.
    published_docs = list(
        db.scalars(
            select(Version.document)
            .join(Publication, Publication.version_id == Version.id)
            .where(Version.shop_id == a.shop_id)
        )
    )
    p = db.scalar(
        select(Product.id).where(
            Product.status == "published",
            or_(Product.image == a.id, func.cast(Product.stage, Text).contains(a.id)),
        )
    )
    if not p and not any(a.id in json.dumps(doc) for doc in published_docs):
        raise HTTPException(404, "This image is private.")
    path = storage.local_path(a)
    return FileResponse(path, media_type="image/webp", headers={"Cache-Control": "public, max-age=86400"})


@app.get(P + "/assets/{asset_id}")
def private_asset(asset_id: str, db: DB, user: User) -> FileResponse:
    a = db.get(Asset, asset_id)
    if not a or a.owner_user_id != user.id:
        raise HTTPException(404, "Image not found.")
    return FileResponse(storage.local_path(a), media_type="image/webp", headers={"Cache-Control": "private, no-store"})


@app.get(P + "/cart")
def cart(db: DB, user: User) -> dict[str, Any]:
    groups: dict[str, Any] = {}
    for c in db.scalars(select(CartItem).where(CartItem.user_id == user.id)):
        v = db.get(Variant, c.variant_id)
        assert v is not None
        p = db.get(Product, v.product_id)
        assert p is not None
        s = db.get(Shop, p.shop_id)
        assert s is not None
        if s.id not in groups:
            groups[s.id] = {"shop": shop_data(db, s), "items": []}
        groups[s.id]["items"].append(
            {
                "variant": {"id": v.id, "price_minor": v.price_minor, "stock": v.stock, "options": v.options},
                "product": product_data(db, p),
                "quantity": c.quantity,
            }
        )
    return {"groups": list(groups.values())}


@app.put(P + "/cart/items/{variant_id}")
def cart_update(variant_id: str, data: QuantityInput, db: DB, user: User) -> dict[str, bool]:
    v = db.get(Variant, variant_id)
    p = db.get(Product, v.product_id) if v else None
    if not v or not p or p.status != "published":
        raise HTTPException(404, "Product variant not found.")
    if data.quantity > v.stock:
        raise HTTPException(409, "There is not enough stock for that quantity.")
    if data.quantity == 0:
        db.execute(delete(CartItem).where(CartItem.user_id == user.id, CartItem.variant_id == variant_id))
    else:
        db.execute(
            insert(CartItem)
            .values(user_id=user.id, variant_id=variant_id, quantity=data.quantity)
            .on_conflict_do_update(index_elements=["user_id", "variant_id"], set_={"quantity": data.quantity})
        )
    db.commit()
    return {"updated": True}


def quote_items(db: Session, data: QuoteInput, lock: bool = False) -> tuple[Shop, list[dict[str, Any]], int]:
    if len({i.variant_id for i in data.items}) != len(data.items):
        raise HTTPException(422, "Combine duplicate cart items.")
    items = []
    shop: Shop | None = None
    subtotal = 0
    for i in sorted(data.items, key=lambda x: x.variant_id):
        stmt = select(Variant).where(Variant.id == i.variant_id)
        if lock:
            stmt = stmt.with_for_update()
        v = db.scalar(stmt)
        p = db.get(Product, v.product_id) if v else None
        s = db.get(Shop, p.shop_id) if p else None
        if not v or not p or not s or p.status != "published" or s.status != "active" or not s.seller_enabled:
            raise HTTPException(422, "A product is no longer available.")
        if shop and s.id != shop.id:
            raise HTTPException(422, "Check out from one shop at a time.")
        if v.stock < i.quantity:
            raise HTTPException(409, f"Not enough stock for {p.title}.")
        shop = s
        subtotal += v.price_minor * i.quantity
        items.append(
            {
                "variant_id": v.id,
                "product_id": p.id,
                "title": p.title,
                "sku": v.sku,
                "quantity": i.quantity,
                "unit_price_minor": v.price_minor,
            }
        )
    assert shop is not None
    return shop, items, subtotal


@app.post(P + "/checkout/quote")
def quote(data: QuoteInput, db: DB, user: User) -> dict[str, Any]:
    s, items, subtotal = quote_items(db, data)
    return {
        "shop_id": s.id,
        "items": items,
        "subtotal_minor": subtotal,
        "shipping_minor": s.shipping_minor,
        "total_minor": subtotal + s.shipping_minor,
        "currency": "MYR",
        "sandbox": True,
        "return_policy": s.return_policy,
    }


@app.post(P + "/checkout/session", status_code=201)
def checkout(
    data: CheckoutInput, db: DB, user: User, idempotency_key: Annotated[str | None, Header()] = None
) -> dict[str, Any]:
    if not idempotency_key or len(idempotency_key) > 100:
        raise HTTPException(428, "An Idempotency-Key is required.")
    db.execute(text("select pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": f"{user.id}:{idempotency_key}"})
    previous = db.scalar(select(Order).where(Order.buyer_user_id == user.id, Order.idempotency_key == idempotency_key))
    if previous:
        return order_data(db, previous)
    s, items, subtotal = quote_items(db, data, True)
    for item in items:
        db.execute(
            update(Variant).where(Variant.id == item["variant_id"]).values(stock=Variant.stock - item["quantity"])
        )
    o = Order(
        shop_id=s.id,
        buyer_user_id=user.id,
        subtotal_minor=subtotal,
        shipping_minor=s.shipping_minor,
        total_minor=subtotal + s.shipping_minor,
        address=data.address.model_dump(),
        items=items,
        idempotency_key=idempotency_key,
        expires_at=now() + timedelta(minutes=15),
    )
    db.add(o)
    db.flush()
    provider.create_checkout(o.id)
    audit(db, user.id, "order.reserved", o.id)
    db.commit()
    return order_data(db, o)


def transition(db: Session, o: Order, state: str, actor: str) -> None:
    old = o.state
    allowed = {
        "pending_payment": ["paid", "payment_failed", "cancelled"],
        "paid": ["shipped", "refunded"],
        "shipped": ["delivered"],
    }
    if state not in allowed.get(old, []):
        raise HTTPException(409, f"Cannot change an order from {old} to {state}.")
    if state in ["payment_failed", "cancelled", "refunded"]:
        for item in sorted(o.items, key=lambda i: i["variant_id"]):
            db.execute(
                update(Variant).where(Variant.id == item["variant_id"]).values(stock=Variant.stock + item["quantity"])
            )
    o.state = state
    audit(db, actor, "order.transition", o.id, {"from": old, "to": state})


def process_payment(db: Session, event: dict[str, Any], payload: bytes) -> dict[str, Any]:
    if event.get("status") not in ["paid", "payment_failed"]:
        raise HTTPException(422, "Unsupported payment status.")
    event_id = str(event.get("id", ""))
    if not event_id or len(event_id) > 120:
        raise HTTPException(422, "Invalid event ID.")
    # Claim the event in the same transaction as the inventory/order transition.
    inserted = db.scalar(
        insert(WebhookEvent)
        .values(external_event_id=event_id, payload_hash=hashlib.sha256(payload).hexdigest())
        .on_conflict_do_nothing()
        .returning(WebhookEvent.external_event_id)
    )
    if not inserted:
        return {"processed": True, "duplicate": True}
    o = db.scalar(select(Order).where(Order.id == event.get("order_id")).with_for_update())
    if not o:
        raise HTTPException(404, "Order not found.")
    if o.state != "pending_payment":
        return {"processed": True, "duplicate": True}
    if o.expires_at < now():
        transition(db, o, "cancelled", "system")
        return {"processed": True, "expired": True}
    if event.get("amount_minor") != o.total_minor or event.get("currency") != o.currency:
        raise HTTPException(422, "Payment does not match the order amount.")
    transition(db, o, event["status"], "sandbox-webhook")
    if o.state == "paid":
        for i in o.items:
            db.execute(
                delete(CartItem).where(CartItem.user_id == o.buyer_user_id, CartItem.variant_id == i["variant_id"])
            )
    return {"processed": True, "state": o.state}


@app.post(P + "/webhooks/payments/sandbox")
async def webhook(
    request: Request, db: DB, x_signature: Annotated[str, Header()] = "", x_timestamp: Annotated[str, Header()] = ""
) -> dict[str, Any]:
    body = await request.body()
    event = provider.verify_webhook(body, x_signature, x_timestamp)
    result = process_payment(db, event, body)
    db.commit()
    return result


@app.post(P + "/orders/{order_id}/sandbox-pay")
def sandbox_pay(order_id: str, db: DB, user: User) -> dict[str, Any]:
    o = db.get(Order, order_id)
    if not o or o.buyer_user_id != user.id:
        raise HTTPException(404, "Order not found.")
    event = {
        "id": f"sandbox_paid_{o.id}",
        "order_id": o.id,
        "status": "paid",
        "amount_minor": o.total_minor,
        "currency": o.currency,
    }
    body = json.dumps(event).encode()
    stamp = str(int(time.time()))
    verified = provider.verify_webhook(body, provider.sign(body, stamp), stamp)
    process_payment(db, verified, body)
    db.commit()
    db.refresh(o)
    return order_data(db, o)


@app.get(P + "/orders")
def orders(db: DB, user: User) -> dict[str, Any]:
    return {
        "items": [
            order_data(db, o)
            for o in db.scalars(select(Order).where(Order.buyer_user_id == user.id).order_by(Order.created_at.desc()))
        ]
    }


@app.get(P + "/orders/{order_id}")
def order_detail(order_id: str, db: DB, user: User) -> dict[str, Any]:
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "Order not found.")
    s = db.get(Shop, o.shop_id)
    if not s or (o.buyer_user_id != user.id and s.owner_user_id != user.id):
        raise HTTPException(404, "Order not found.")
    result = order_data(db, o)
    if s.owner_user_id == user.id:
        result["address"] = o.address
    return result


@app.get(P + "/shops/{shop_id}/orders")
def seller_orders(shop_id: str, db: DB, user: User) -> dict[str, Any]:
    owned(db, user, shop_id)
    return {
        "items": [
            {**order_data(db, o), "address": o.address}
            for o in db.scalars(select(Order).where(Order.shop_id == shop_id).order_by(Order.created_at.desc()))
        ]
    }


@app.post(P + "/shops/{shop_id}/orders/{order_id}/ship")
def ship(shop_id: str, order_id: str, data: ShipInput, db: DB, user: User) -> dict[str, Any]:
    owned(db, user, shop_id)
    o = db.scalar(select(Order).where(Order.id == order_id, Order.shop_id == shop_id).with_for_update())
    if not o:
        raise HTTPException(404, "Order not found.")
    transition(db, o, "shipped", user.id)
    o.tracking = data.tracking
    db.commit()
    return order_data(db, o)


@app.post(P + "/orders/{order_id}/cancel-request")
def cancel(order_id: str, db: DB, user: User) -> dict[str, Any]:
    o = db.scalar(select(Order).where(Order.id == order_id, Order.buyer_user_id == user.id).with_for_update())
    if not o:
        raise HTTPException(404, "Order not found.")
    if o.state == "pending_payment":
        transition(db, o, "cancelled", user.id)
    elif o.state == "paid":
        provider.refund(o.id)
        transition(db, o, "refunded", user.id)
    else:
        raise HTTPException(409, "Please contact support for an order already shipped or closed.")
    db.commit()
    return order_data(db, o)


@app.post(P + "/reports", status_code=201)
def report(data: ReportInput, db: DB, user: User) -> dict[str, str]:
    r = Report(reporter_id=user.id, **data.model_dump())
    db.add(r)
    db.commit()
    return {"id": r.id, "status": "open"}


@app.get(P + "/admin/reports")
def admin_reports(db: DB, user: User) -> dict[str, Any]:
    if not user.is_admin:
        raise HTTPException(403, "Moderator access required.")
    return {
        "items": [
            {"id": r.id, "target_id": r.target_id, "target_type": r.target_type, "reason": r.reason, "status": r.status}
            for r in db.scalars(select(Report).order_by(Report.created_at.desc()))
        ]
    }


@app.post(P + "/admin/shops/{shop_id}/suspend")
def suspend(shop_id: str, db: DB, user: User) -> dict[str, str]:
    if not user.is_admin:
        raise HTTPException(403, "Moderator access required.")
    s = db.get(Shop, shop_id)
    if not s:
        raise HTTPException(404, "Shop not found.")
    s.status = "suspended"
    audit(db, user.id, "shop.suspended", shop_id)
    db.commit()
    return {"status": "suspended"}
