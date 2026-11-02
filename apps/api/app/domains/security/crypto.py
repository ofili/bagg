import hashlib
import hmac
import json
import secrets
from typing import Any

from app.core.config import settings


def _security_secret() -> bytes:
    secret = getattr(settings, "OTP_HASH_SECRET", None)

    if not secret:
        if settings.is_production:
            raise RuntimeError(
                "OTP_HASH_SECRET must be configured for security operations"
            )

        secret = settings.SECRET_KEY

    return secret.encode("utf-8")


def generate_verification_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def generate_recovery_code() -> str:
    return secrets.token_urlsafe(24)


def hash_verification_code(
    code: str,
    *,
    purpose: str,
    user_id: str,
) -> str:
    message = f"{purpose}:{user_id}:{code.strip()}".encode("utf-8")

    return hmac.new(
        _security_secret(),
        message,
        hashlib.sha256,
    ).hexdigest()


def hash_recovery_code(code: str) -> str:
    message = f"recovery:{code.strip()}".encode("utf-8")

    return hmac.new(
        _security_secret(),
        message,
        hashlib.sha256,
    ).hexdigest()


def canonical_json(payload: dict[str, Any]) -> str:
    return json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def payload_digest(payload: dict[str, Any]) -> str:
    return hashlib.sha256(
        canonical_json(payload).encode("utf-8")
    ).hexdigest()


def constant_time_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(left, right)