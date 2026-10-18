"""Short transactional reservation expiry; run periodically as a separate worker."""

from datetime import datetime, timezone
from sqlalchemy import select
from .db import SessionLocal
from .models import Order
from .main import transition


def expire_reservations() -> int:
    with SessionLocal() as db:
        orders = list(
            db.scalars(
                select(Order)
                .where(Order.state == "pending_payment", Order.expires_at < datetime.now(timezone.utc))
                .with_for_update(skip_locked=True)
                .limit(100)
            )
        )
        for order in orders:
            transition(db, order, "cancelled", "reservation-worker")
        db.commit()
        return len(orders)


if __name__ == "__main__":
    print(f"Released {expire_reservations()} expired sandbox reservations.")
