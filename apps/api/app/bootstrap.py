"""Brings a fresh database up to date when the API starts: migrations, then the sample catalog once.

A container can run `alembic upgrade head && python -m app.seed` itself, but a serverless function has no release
step, so it asks for this at startup (AUTO_MIGRATE=true). An advisory lock makes simultaneous cold starts take turns.
"""

import logging
from alembic import command
from alembic.config import Config
from sqlalchemy import select, text
from .config import API_DIR
from .db import SessionLocal, engine
from .models import Shop

log = logging.getLogger("nook.bootstrap")
LOCK_ID = 7_414_201


def bootstrap() -> None:
    with engine.connect() as lock:
        lock.execute(text("select pg_advisory_lock(:id)"), {"id": LOCK_ID})
        try:
            config = Config(str(API_DIR / "alembic.ini"))
            config.set_main_option("script_location", str(API_DIR / "alembic"))
            command.upgrade(config, "head")
            with SessionLocal() as db:
                empty = db.scalar(select(Shop.id).limit(1)) is None
            if empty:
                from .seed import seed

                log.info("Loading the sample catalog")
                seed()
        finally:
            lock.execute(text("select pg_advisory_unlock(:id)"), {"id": LOCK_ID})
            lock.commit()
