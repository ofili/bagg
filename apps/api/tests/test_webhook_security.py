import json
import os
import subprocess
import sys
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.domains.webhooks.security import (
    paystack_event_reference,
    paystack_idempotency_key,
    verify_paystack_signature,
)
from app.main import app
from tests.helpers import sign_paystack

WEBHOOK_SECRET = "sk_test_webhook_security_secret"


async def authenticated_client() -> tuple[AsyncClient, str]:
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    email = f"webhook-security-{uuid.uuid4().hex[:8]}@studio.ng"
    request = await client.post("/auth/magic-link", json={"email": email})
    verify = await client.post(
        "/auth/verify", json={"email": email, "code": request.json()["dev_code"]}
    )
    client.cookies.set("bagg_session", verify.cookies["bagg_session"])
    workspace = await client.get("/workspaces/current")
    return client, workspace.json()["id"]


def signed_headers(payload: dict, secret: str = WEBHOOK_SECRET) -> tuple[bytes, dict]:
    body, signature = sign_paystack(payload, secret)
    return body, {
        "content-type": "application/json",
        "x-paystack-signature": signature,
    }


@pytest.mark.asyncio
async def test_webhook_rejects_when_secret_is_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_SECRET_KEY", None)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/webhooks/paystack",
            json={"event": "charge.success", "data": {}},
        )

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_webhook_rejects_missing_signature(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_SECRET_KEY", WEBHOOK_SECRET)
    client, workspace_id = await authenticated_client()
    try:
        response = await client.post(
            "/webhooks/paystack",
            json={
                "event": "charge.success",
                "data": {
                    "reference": f"unsigned_{uuid.uuid4().hex[:8]}",
                    "metadata": {
                        "workspace_id": workspace_id,
                        "type": "credit_pack",
                        "credits": 200,
                    },
                },
            },
        )

        assert response.status_code == 400
        assert "signature" in response.json()["detail"].lower()
        assert (await client.get("/billing/credits")).json()["balance"] == 0
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_webhook_rejects_invalid_signature(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_SECRET_KEY", WEBHOOK_SECRET)
    client, workspace_id = await authenticated_client()
    try:
        body, headers = signed_headers(
            {
                "event": "charge.success",
                "data": {
                    "reference": f"forged_{uuid.uuid4().hex[:8]}",
                    "metadata": {
                        "workspace_id": workspace_id,
                        "type": "credit_pack",
                        "credits": 200,
                    },
                },
            }
        )
        headers["x-paystack-signature"] = "0" * 128

        response = await client.post("/webhooks/paystack", content=body, headers=headers)

        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()
        assert (await client.get("/billing/credits")).json()["balance"] == 0
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_signed_credit_pack_is_granted_once(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_SECRET_KEY", WEBHOOK_SECRET)
    client, workspace_id = await authenticated_client()
    try:
        payload = {
            "event": "charge.success",
            "data": {
                "reference": f"pack_secure_{uuid.uuid4().hex[:8]}",
                "amount": 200000,
                "currency": "NGN",
                "metadata": {
                    "workspace_id": workspace_id,
                    "type": "credit_pack",
                    "credits": 200,
                },
            },
        }
        body, headers = signed_headers(payload)

        first = await client.post("/webhooks/paystack", content=body, headers=headers)
        assert first.status_code == 200
        assert first.json()["status"] == "success"
        assert (await client.get("/billing/credits")).json()["balance"] == 200

        replay = await client.post("/webhooks/paystack", content=body, headers=headers)
        assert replay.status_code == 200
        assert replay.json()["status"] == "already_processed"
        assert (await client.get("/billing/credits")).json()["balance"] == 200
    finally:
        await client.aclose()


def test_idempotency_fallback_is_stable_across_processes():
    payload = {"event": "charge.success", "data": {}}
    raw_body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    code = (
        "from app.domains.webhooks.security import paystack_idempotency_key;"
        "print(paystack_idempotency_key('charge.success', {}, {}, "
        f"{raw_body!r}))"
    )
    outputs = []
    for seed in ("1", "2"):
        env = {**os.environ, "PYTHONHASHSEED": seed}
        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=os.path.dirname(os.path.dirname(__file__)),
            env=env,
            capture_output=True,
            text=True,
            check=True,
        )
        outputs.append(result.stdout.strip())

    assert outputs[0] == outputs[1]
    assert len(outputs[0].rsplit(":", 1)[-1]) == 64


def test_no_reference_events_do_not_collide():
    first_body = b'{"event":"charge.success","data":{"amount":100}}'
    second_body = b'{"event":"charge.success","data":{"amount":200}}'

    first_ref = paystack_event_reference({}, {}, first_body)
    second_ref = paystack_event_reference({}, {}, second_body)

    assert first_ref != second_ref
    assert first_ref == paystack_event_reference({}, {}, first_body)
    assert paystack_idempotency_key("charge.success", {}, {}, first_body) != (
        paystack_idempotency_key("charge.success", {}, {}, second_body)
    )


def test_verifier_requires_signature_and_secret():
    with pytest.raises(Exception) as missing_secret:
        verify_paystack_signature(b"{}", None, None)
    assert "not configured" in str(missing_secret.value)

    with pytest.raises(Exception) as missing_signature:
        verify_paystack_signature(b"{}", None, "secret")
    assert "Missing" in str(missing_signature.value)
