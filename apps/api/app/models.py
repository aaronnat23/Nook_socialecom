from datetime import datetime, timezone
from typing import Any
from uuid import uuid4
from sqlalchemy import (
    LargeBinary,
    String,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    Index,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base


def uid() -> str:
    return str(uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


class Record:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Profile(Record, Base):
    __tablename__ = "profiles"
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text, default="")
    handle: Mapped[str] = mapped_column(String(30), unique=True)
    display_name: Mapped[str] = mapped_column(String(80))
    bio: Mapped[str] = mapped_column(String(600), default="")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    preferences: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    disabled: Mapped[bool] = mapped_column(Boolean, default=False)


class Shop(Record, Base):
    __tablename__ = "shops"
    owner_user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), unique=True)
    slug: Mapped[str] = mapped_column(String(60), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    bio: Mapped[str] = mapped_column(String(600), default="")
    category: Mapped[str] = mapped_column(String(40), default="Lifestyle")
    location: Mapped[str] = mapped_column(String(100), default="Malaysia")
    avatar: Mapped[str] = mapped_column(String(120), default="seed_hero_0")
    cover: Mapped[str] = mapped_column(String(120), default="seed_hero_0")
    theme: Mapped[str] = mapped_column(String(50), default="minimal-studio")
    seller_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(24), default="active")
    shipping_minor: Mapped[int] = mapped_column(Integer, default=800)
    return_policy: Mapped[str] = mapped_column(
        String(1000), default="Contact the shop within 7 days of delivery to request a return. Items must be unused."
    )
    __table_args__ = (CheckConstraint("shipping_minor >= 0"),)


class Draft(Base):
    __tablename__ = "storefront_drafts"
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), primary_key=True)
    document: Mapped[dict[str, Any]] = mapped_column(JSONB)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class Version(Record, Base):
    __tablename__ = "storefront_versions"
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), index=True)
    version_no: Mapped[int] = mapped_column(Integer)
    document: Mapped[dict[str, Any]] = mapped_column(JSONB)
    checksum: Mapped[str] = mapped_column(String(64))
    author_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"))
    note: Mapped[str] = mapped_column(String(300), default="")
    __table_args__ = (UniqueConstraint("shop_id", "version_no"),)


class Publication(Base):
    __tablename__ = "shop_publications"
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), primary_key=True)
    version_id: Mapped[str] = mapped_column(ForeignKey("storefront_versions.id"))


class Product(Record, Base):
    __tablename__ = "products"
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), index=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(6000), default="")
    price_minor: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="MYR")
    image: Mapped[str] = mapped_column(String(120), default="seed_product_0")
    category: Mapped[str] = mapped_column(String(40), default="Lifestyle")
    status: Mapped[str] = mapped_column(String(24), default="draft")
    tags: Mapped[list[str]] = mapped_column(JSONB, default=list)
    stage: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    __table_args__ = (
        CheckConstraint("price_minor >= 0"),
        Index("ix_products_public", "status", "category", "created_at"),
    )


class Variant(Record, Base):
    __tablename__ = "product_variants"
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    sku: Mapped[str] = mapped_column(String(80))
    options: Mapped[dict[str, str]] = mapped_column(JSONB, default=dict)
    price_minor: Mapped[int] = mapped_column(Integer)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    __table_args__ = (
        UniqueConstraint("product_id", "sku"),
        CheckConstraint("stock >= 0"),
        CheckConstraint("price_minor >= 0"),
    )


class Follow(Base):
    __tablename__ = "shop_followers"
    user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), primary_key=True)
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), primary_key=True, index=True)


class Favorite(Base):
    __tablename__ = "product_favorites"
    user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), primary_key=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), primary_key=True, index=True)


class Collection(Record, Base):
    __tablename__ = "collections"
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), index=True)
    title: Mapped[str] = mapped_column(String(160))
    product_ids: Mapped[list[str]] = mapped_column(JSONB, default=list)


class Asset(Record, Base):
    __tablename__ = "assets"
    owner_user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), index=True)
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), index=True)
    path: Mapped[str] = mapped_column(String(250))
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    size_bytes: Mapped[int] = mapped_column(Integer)
    checksum: Mapped[str] = mapped_column(String(64))
    alt: Mapped[str] = mapped_column(String(300))


class CartItem(Base):
    __tablename__ = "cart_items"
    user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), primary_key=True)
    variant_id: Mapped[str] = mapped_column(ForeignKey("product_variants.id"), primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer)
    __table_args__ = (CheckConstraint("quantity BETWEEN 1 AND 99"),)


class Order(Record, Base):
    __tablename__ = "orders"
    shop_id: Mapped[str] = mapped_column(ForeignKey("shops.id"), index=True)
    buyer_user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), index=True)
    state: Mapped[str] = mapped_column(String(32), default="pending_payment")
    currency: Mapped[str] = mapped_column(String(3), default="MYR")
    subtotal_minor: Mapped[int] = mapped_column(Integer)
    shipping_minor: Mapped[int] = mapped_column(Integer)
    total_minor: Mapped[int] = mapped_column(Integer)
    address: Mapped[dict[str, Any]] = mapped_column(JSONB)
    items: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    idempotency_key: Mapped[str] = mapped_column(String(100))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    tracking: Mapped[str] = mapped_column(String(160), default="")
    __table_args__ = (
        UniqueConstraint("buyer_user_id", "idempotency_key"),
        CheckConstraint("total_minor = subtotal_minor + shipping_minor"),
        CheckConstraint("subtotal_minor >= 0 AND shipping_minor >= 0"),
    )


class WebhookEvent(Base):
    __tablename__ = "payment_webhook_events"
    external_event_id: Mapped[str] = mapped_column(String(120), primary_key=True)
    payload_hash: Mapped[str] = mapped_column(String(64))
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Audit(Record, Base):
    __tablename__ = "audit_logs"
    actor_id: Mapped[str] = mapped_column(String(36))
    action: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str] = mapped_column(String(120), index=True)
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)


class Report(Record, Base):
    __tablename__ = "reports"
    reporter_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), index=True)
    target_id: Mapped[str] = mapped_column(String(120))
    target_type: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(String(1000))
    status: Mapped[str] = mapped_column(String(20), default="open")


class SessionToken(Record, Base):
    __tablename__ = "auth_sessions"
    user_id: Mapped[str] = mapped_column(ForeignKey("profiles.id"), index=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class AssetBlob(Base):
    """Image bytes for deployments that keep uploads in PostgreSQL (STORAGE_BACKEND=database).

    Deliberately not a foreign key: the bytes are written before the asset row is committed.
    """

    __tablename__ = "asset_blobs"
    asset_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    data: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
