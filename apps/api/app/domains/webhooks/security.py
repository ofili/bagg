import hashlib
import hmac
from typing import Any, Mapping, Optional

from fastapi import HTTPException


def verify_paystack_signature(
    raw_body: bytes,
    signature: Optional[str],
    secret: Optional[str],
) -> None:
    """Rejects unverifiable Paystack webhooks instead of silently accepting them."""
    if not secret or not secret.strip():
        raise HTTPException(
            status_code=503,
            detail="Paystack webhook secret is not configured",
        )
    if not signature:
        raise HTTPException(status_code=400, detail="Missing webhook signature")

    expected = hmac.new(
        secret.strip().encode("utf-8"),
        raw_body,
        hashlib.sha512,
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")


def paystack_event_reference(
    data: Mapping[str, Any],
    payload: Mapping[str, Any],
    raw_body: bytes,
) -> str:
    """Returns a stable external reference, falling back to a SHA-256 digest."""
    external_id = data.get("reference") or data.get("id") or payload.get("id")
    if external_id in (None, ""):
        return hashlib.sha256(raw_body).hexdigest()
    return str(external_id)


def paystack_idempotency_key(
    event_type: Optional[str],
    data: Mapping[str, Any],
    payload: Mapping[str, Any],
    raw_body: bytes,
) -> str:
    """Builds a deterministic key without relying on Python's salted hash()."""
    event_ref = paystack_event_reference(data, payload, raw_body)
    return f"paystack:{event_type}:{event_ref}"
