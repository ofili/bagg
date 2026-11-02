"""Shared test helpers for the issued/sent split.

Helpers encapsulate create -> finalize -> send so callers don't have to repeat
the three-step flow after draft-send was blocked.
"""
import hashlib
import hmac
import json
from typing import Any, Dict

from httpx import AsyncClient


def sign_paystack(payload: Dict[str, Any], secret: str) -> tuple[bytes, str]:
    """Serializes a webhook payload and returns its exact body and HMAC-SHA512 signature."""
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), body, hashlib.sha512).hexdigest()
    return body, signature


_CAPTURED_LOGIN_CODES: dict[str, str] = {}


def reset_captured_login_codes() -> None:
    """Clears codes captured from previous test cases."""
    _CAPTURED_LOGIN_CODES.clear()


def install_login_code_capture(monkeypatch) -> dict[str, str]:
    """Patch the auth email sender and return a map of email -> issued code.

    The API no longer exposes dev codes in HTTP responses, so tests capture the
    code at the email boundary instead.
    """

    async def fake_send_login_code_email(
        self,
        to_email: str,
        code: str,
        expires_in_minutes: int = 10,
    ) -> bool:
        _CAPTURED_LOGIN_CODES[to_email.lower().strip()] = code
        return True

    monkeypatch.setattr(
        "app.domains.auth.service.EmailSender.send_login_code_email",
        fake_send_login_code_email,
    )
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
