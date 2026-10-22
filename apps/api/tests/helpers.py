"""Shared test helpers for the issued/sent split.

Helpers encapsulate create -> finalize -> send so callers don't have to repeat
the three-step flow after draft-send was blocked.
"""
from typing import Any, Dict

from httpx import AsyncClient


async def create_sent_invoice(client: AsyncClient, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Create a draft invoice, finalize it, then send it. Returns the sent invoice JSON."""
    inv_res = await client.post("/invoices", json=payload)
    assert inv_res.status_code == 201, inv_res.text
    inv = inv_res.json()

    fin_res = await client.post(f"/invoices/{inv['id']}/finalize")
    assert fin_res.status_code == 200, fin_res.text

    send_res = await client.post(f"/invoices/{inv['id']}/send")
    assert send_res.status_code == 200, send_res.text
    return send_res.json()["invoice"]


async def create_sent_quote(client: AsyncClient, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Create a draft quote, finalize it, then send it. Returns the sent quote JSON."""
    q_res = await client.post("/quotes", json=payload)
    assert q_res.status_code == 201, q_res.text
    q = q_res.json()

    fin_res = await client.post(f"/quotes/{q['id']}/finalize")
    assert fin_res.status_code == 200, fin_res.text

    send_res = await client.post(f"/quotes/{q['id']}/send")
    assert send_res.status_code == 200, send_res.text
    return send_res.json()
