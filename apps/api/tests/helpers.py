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
