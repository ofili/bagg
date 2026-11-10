"""Shared test helpers for the issued/sent split.

Helpers encapsulate create -> finalize -> send so callers don't have to repeat
the three-step flow after draft-send was blocked.
"""
import hashlib
import hmac
import json
import re
from typing import Any, Dict

from httpx import AsyncClient


def sign_paystack(payload: Dict[str, Any], secret: str) -> tuple[bytes, str]:
    """Serializes a webhook payload and returns its exact body and HMAC-SHA512 signature."""
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha512).hexdigest()
    return body, signature


_CAPTURED_LOGIN_CODES: dict[str, str] = {}

_LOGIN_CODE_IN_HTML = re.compile(
    r"letter-spacing:\s*\d+px\b[^>]*>\s*(\d{6})\s*</p>"
)


def reset_captured_login_codes() -> None:
    """Clears codes captured from previous test cases."""
    _CAPTURED_LOGIN_CODES.clear()


def install_login_code_capture(monkeypatch) -> dict[str, str]:
    """Capture OTP codes at the outbox boundary.

    Auth no longer calls the email provider directly; it encrypts the message
    into the outbox. The plaintext HTML still contains the code, so wrap the
    enqueue call and record it while delegating to the real implementation.
    """
    from app.domains.email import service as email_service

    original_enqueue = email_service.enqueue_email

    def capturing_enqueue(db, *, message_type, aggregate_id, payload):
        if message_type == "login_otp":
            match = _LOGIN_CODE_IN_HTML.search(payload.get("html", ""))
            if match:
                _CAPTURED_LOGIN_CODES[
                    payload["to_email"].lower().strip()
                ] = match.group(1)
        return original_enqueue(
            db,
            message_type=message_type,
            aggregate_id=aggregate_id,
            payload=payload,
        )

    monkeypatch.setattr(email_service, "enqueue_email", capturing_enqueue)
    return _CAPTURED_LOGIN_CODES


def capture_login_codes(monkeypatch) -> dict[str, str]:
    """Opt-in variant of the capture installed by the autouse test fixture."""
    reset_captured_login_codes()
    return install_login_code_capture(monkeypatch)


def login_code_for(email: str) -> str:
    """Returns the most recent login code delivered to an address."""
    key = email.lower().strip()
    if key not in _CAPTURED_LOGIN_CODES:
        raise AssertionError(f"No login code was captured for {email!r}")
    return _CAPTURED_LOGIN_CODES[key]


async def set_workspace_tier(workspace_id: str, tier: str = "creator_pro") -> None:
    """Sets a workspace tier directly for tests that are not about metering."""
    from sqlalchemy import update

    from app.core.database import AsyncSessionLocal
    from app.domains.workspaces.models import Workspace

    async with AsyncSessionLocal() as session:
        await session.execute(
            update(Workspace).where(Workspace.id == workspace_id).values(tier=tier)
        )
        await session.commit()


async def create_sent_invoice(client: AsyncClient, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Create a draft invoice, finalize it, then send it. Returns the sent invoice JSON."""
    inv_res = await client.post("/invoices", json=payload)
    assert inv_res.status_code == 201, inv_res.text
    inv = inv_res.json()

    fin_res = await client.post(f"/invoices/{inv['id']}/finalize")
    assert fin_res.status_code == 200, fin_res.text

    send_res = await client.post(
        f"/invoices/{inv['id']}/send",
        json={"send_email": False},
    )
    assert send_res.status_code == 200, send_res.text
    return send_res.json()["invoice"]


async def create_sent_quote(
    client: AsyncClient,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Create, finalize, and send a quote; return its full current representation."""
    q_res = await client.post("/quotes", json=payload)
    assert q_res.status_code == 201, q_res.text
    quote = q_res.json()

    quote_id = quote["id"]

    fin_res = await client.post(f"/quotes/{quote_id}/finalize")
    assert fin_res.status_code == 200, fin_res.text

    send_res = await client.post(f"/quotes/{quote_id}/send")
    assert send_res.status_code == 200, send_res.text

    detail_res = await client.get(f"/quotes/{quote_id}")
    assert detail_res.status_code == 200, detail_res.text

    return detail_res.json()
