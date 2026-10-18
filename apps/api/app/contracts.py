from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AuthInput(StrictModel):
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(min_length=10, max_length=128)
    handle: str = Field(default="", max_length=30)
    display_name: str = Field(default="", max_length=80)


class ProfileInput(StrictModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    bio: str | None = Field(default=None, max_length=600)
    handle: str | None = Field(default=None, pattern=r"^[a-z0-9_.]{3,30}$")
    preferences: dict[str, bool] | None = None


class DraftInput(StrictModel):
    document: dict[str, Any]
    baseRevision: int = Field(ge=1)
    clientMutationId: str = Field(min_length=1, max_length=100)


class PublishInput(StrictModel):
    expectedRevision: int = Field(ge=1)
    note: str = Field(default="", max_length=300)


class RestoreInput(StrictModel):
    versionId: str
    expectedRevision: int


class VariantInput(StrictModel):
    sku: str = Field(min_length=1, max_length=80)
    options: dict[str, str] = Field(default_factory=dict)
    price_minor: int = Field(ge=0, le=100000000)
    stock: int = Field(ge=0, le=1000000)


class ProductInput(StrictModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=6000)
    price_minor: int = Field(ge=0, le=100000000)
    image: str = Field(default="seed_product_0", max_length=120)
    category: Literal["Fashion", "Home & living", "Art & prints", "Jewelry", "Beauty", "Lifestyle"] = "Lifestyle"
    status: Literal["draft", "published", "archived"] = "draft"
    variants: list[VariantInput] = Field(min_length=1, max_length=100)

    @field_validator("variants")
    @classmethod
    def unique_skus(cls, value: list[VariantInput]) -> list[VariantInput]:
        if len({v.sku for v in value}) != len(value):
            raise ValueError("Variant SKUs must be unique")
        return value


class QuantityInput(StrictModel):
    quantity: int = Field(ge=0, le=99)


class CheckoutItem(StrictModel):
    variant_id: str
    quantity: int = Field(ge=1, le=99)


class QuoteInput(StrictModel):
    items: list[CheckoutItem] = Field(min_length=1, max_length=50)


class Address(StrictModel):
    name: str = Field(min_length=2, max_length=120)
    line1: str = Field(min_length=3, max_length=200)
    city: str = Field(min_length=2, max_length=100)
    postcode: str = Field(pattern=r"^\d{5}$")
    country: Literal["MY"] = "MY"


class CheckoutInput(QuoteInput):
    address: Address


class ShipInput(StrictModel):
    tracking: str = Field(min_length=3, max_length=160)


class ReportInput(StrictModel):
    target_id: str = Field(max_length=120)
    target_type: Literal["shop", "product", "profile"]
    reason: str = Field(min_length=10, max_length=1000)


class SellerInput(StrictModel):
    accepted_terms: Literal[True]


class CollectionInput(StrictModel):
    title: str = Field(min_length=1, max_length=160)
    product_ids: list[str] = Field(max_length=100)

    @field_validator("product_ids")
    @classmethod
    def unique_products(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("A product may appear only once in a collection")
        return value


class RefreshInput(StrictModel):
    refresh_token: str = Field(min_length=1, max_length=8000)


class ShopInput(StrictModel):
    name: str = Field(min_length=1, max_length=100)
    bio: str = Field(max_length=600)
    location: str = Field(max_length=100)
    shipping_minor: int = Field(ge=0, le=100000)
    return_policy: str = Field(min_length=10, max_length=1000)
