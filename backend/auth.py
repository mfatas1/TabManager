import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

import jwt
import requests
from fastapi import Header, HTTPException
from jwt import PyJWKClient

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: Optional[str] = None


def get_supabase_url() -> str:
    return (
        os.getenv("SUPABASE_URL")
        or os.getenv("VITE_SUPABASE_URL")
        or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        or ""
    ).rstrip("/")


def get_supabase_publishable_key() -> str:
    return (
        os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("VITE_SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or ""
    )


@lru_cache(maxsize=1)
def get_jwks_client() -> PyJWKClient:
    supabase_url = get_supabase_url()
    if not supabase_url:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL is not configured on the backend",
        )

    return PyJWKClient(f"{supabase_url}/auth/v1/.well-known/jwks.json")


def current_user_from_payload(payload: dict) -> CurrentUser:
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid auth token")

    return CurrentUser(
        id=user_id,
        email=payload.get("email"),
    )


def verify_token_with_jwks(token: str) -> CurrentUser:
    supabase_url = get_supabase_url()
    signing_key = get_jwks_client().get_signing_key_from_jwt(token).key
    payload = jwt.decode(
        token,
        signing_key,
        algorithms=["RS256", "ES256"],
        audience=os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"),
        issuer=f"{supabase_url}/auth/v1",
    )
    return current_user_from_payload(payload)


def verify_token_with_auth_api(token: str) -> CurrentUser:
    supabase_url = get_supabase_url()
    publishable_key = get_supabase_publishable_key()
    if not supabase_url or not publishable_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase auth verification is not configured on the backend",
        )

    response = requests.get(
        f"{supabase_url}/auth/v1/user",
        headers={
            "apikey": publishable_key,
            "Authorization": f"Bearer {token}",
        },
        timeout=10,
    )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid auth token")

    payload = response.json()
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid auth token")

    return CurrentUser(
        id=user_id,
        email=payload.get("email"),
    )


def get_current_user(authorization: Optional[str] = Header(default=None)) -> CurrentUser:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    try:
        return verify_token_with_jwks(token)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("JWKS token verification failed, falling back to Supabase Auth API: %s", exc)
        try:
            return verify_token_with_auth_api(token)
        except HTTPException:
            raise
        except Exception as fallback_exc:
            logger.warning("Supabase Auth API verification failed: %s", fallback_exc)
            raise HTTPException(status_code=401, detail="Invalid auth token") from fallback_exc
