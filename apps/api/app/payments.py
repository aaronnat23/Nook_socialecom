import hashlib, hmac, json, time
from typing import Any, Protocol
from fastapi import HTTPException
from .config import settings


class PaymentProvider(Protocol):
    def create_checkout(self, order_id: str) -> dict[str, Any]: ...
    def verify_webhook(self, body: bytes, signature: str, timestamp: str) -> dict[str, Any]: ...
    def refund(self, order_id: str) -> dict[str, Any]: ...
    def get_payment_status(self, order_id: str) -> str: ...
    def get_connected_account_status(self, shop_id: str) -> str: ...


class SandboxPaymentProvider:
    def create_checkout(self, order_id: str) -> dict[str, Any]:
        return {"provider": "sandbox", "sandbox": True, "order_id": order_id}

    def sign(self, body: bytes, timestamp: str) -> str:
        return hmac.new(
            settings.sandbox_webhook_secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256
        ).hexdigest()

    def verify_webhook(self, body: bytes, signature: str, timestamp: str) -> dict[str, Any]:
        try:
            if abs(time.time() - int(timestamp)) > 300:
                raise ValueError("Expired")
        except ValueError as exc:
            raise HTTPException(400, "Invalid webhook timestamp.") from exc
        if not hmac.compare_digest(self.sign(body, timestamp), signature):
            raise HTTPException(400, "Invalid webhook signature.")
        try:
            payload = json.loads(body)
            if not isinstance(payload, dict):
                raise ValueError("Expected an event object")
            return dict(payload)
        except (ValueError, TypeError) as exc:
            raise HTTPException(400, "Invalid payment event payload.") from exc

    def refund(self, order_id: str) -> dict[str, Any]:
        return {"order_id": order_id, "status": "sandbox_refunded"}

    def get_payment_status(self, order_id: str) -> str:
        return "sandbox_only"

    def get_connected_account_status(self, shop_id: str) -> str:
        return "sandbox_only"


provider = SandboxPaymentProvider()
