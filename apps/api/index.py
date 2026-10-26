"""Entrypoint for hosts that look for a top-level ASGI app (Vercel); locally use `uvicorn app.main:app`."""

from app.main import app

__all__ = ["app"]
