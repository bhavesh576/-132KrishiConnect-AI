"""JWT auth + demo OTP logic (Section 9).

DEMO ONLY: the OTP for every account is hardcoded to "1234".
There is NO real SMS dispatch — /auth/otp/request merely acknowledges.
"""
import os
from fastapi import Depends, HTTPException, Header
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone

# DEMO ONLY — not real OTP. Never do this outside a hackathon prototype.
DEMO_OTP = "1234"

SECRET_KEY = os.environ.get("KC_JWT_SECRET", "krishiconnect-demo-secret-not-for-production")
ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24


def create_token(user_id: int, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(authorization: str = Header(default="")) -> dict:
    """Accepts 'Bearer <jwt>'. Prototype endpoints are demo-safe; routers that
    need the caller use this dependency, read-only browse endpoints do not."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return decode_token(authorization.split(" ", 1)[1])
