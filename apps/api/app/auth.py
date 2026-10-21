from datetime import datetime, timedelta, timezone
from typing import Annotated, Any
import copy, json, re
from uuid import uuid4
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from .config import settings, ROOT
from .db import get_db, SessionLocal
from .models import Profile, Shop, Draft, SessionToken

passwords = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)
jwks = jwt.PyJWKClient(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json") if settings.supabase_url else None
DB = Annotated[Session, Depends(get_db)]


def token_for(profile: Profile) -> str:
    if not settings.local_auth_secret:
        raise RuntimeError("Set LOCAL_AUTH_SECRET with setup.py")
    session_id = str(uuid4())
    with SessionLocal() as db:
        db.add(SessionToken(id=session_id, user_id=profile.id, revoked=False))
        db.commit()
    return jwt.encode(
        {
            "jti": session_id,
            "sub": profile.id,
            "iss": "lilac-development",
            "aud": "authenticated",
            "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        },
        settings.local_auth_secret,
        algorithm="HS256",
    )


def current_user(db: DB, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> Profile:
    if not credentials:
        raise HTTPException(401, "Please sign in to continue.")
    try:
        claims: dict[str, Any]
        if settings.auth_mode == "supabase" and jwks:
            key = jwks.get_signing_key_from_jwt(credentials.credentials)
            claims = jwt.decode(
                credentials.credentials,
                key.key,
                algorithms=["ES256", "RS256"],
                issuer=f"{settings.supabase_url}/auth/v1",
                audience="authenticated",
            )
        else:
            claims = jwt.decode(
                credentials.credentials,
                settings.local_auth_secret,
                algorithms=["HS256"],
                issuer="lilac-development",
                audience="authenticated",
            )
        if settings.auth_mode == "supabase":
            db.execute(text("select pg_advisory_xact_lock(hashtextextended(:id,0))"), {"id": str(claims["sub"])})
        user = db.get(Profile, claims["sub"])
        if settings.auth_mode == "local":
            session = db.get(SessionToken, claims.get("jti", ""))
            if not session or session.revoked:
                raise HTTPException(401, "Your session has ended. Please sign in again.")
        if not user and settings.auth_mode == "supabase":
            handle = f"space_{str(claims['sub']).replace('-', '')[:16]}"
            metadata = claims.get("user_metadata", {})
            requested = str(metadata.get("handle", "")).lower()
            if (
                re.fullmatch(r"[a-z0-9_.]{3,30}", requested)
                and requested not in ["admin", "api", "settings", "support", "lilac", "nook"]
                and not db.scalar(select(Profile.id).where(Profile.handle == requested))
            ):
                handle = requested
            display_name = re.sub(r"<[^>]*>", "", str(metadata.get("display_name", handle)))[:80] or handle
            user = Profile(
                id=claims["sub"],
                email=claims.get("email", f"{handle}@supabase.local"),
                handle=handle,
                display_name=display_name,
            )
            db.add(user)
            db.flush()
            shop = Shop(owner_user_id=user.id, slug=handle, name=display_name)
            db.add(shop)
            db.flush()
            doc = copy.deepcopy(
                json.loads((ROOT / "packages/storefront-schema/fixtures/themes.json").read_text())[0]["document"]
            )
            doc["shopId"] = shop.id
            doc["sections"][0]["children"][0]["props"]["headline"] = display_name
            db.add(Draft(shop_id=shop.id, document=doc))
            db.commit()
        if not user or user.disabled:
            raise HTTPException(401, "Your session is no longer available.")
        return user
    except jwt.PyJWTError as exc:
        raise HTTPException(401, "Your session expired. Please sign in again.") from exc


User = Annotated[Profile, Depends(current_user)]
