"""Phase 0 integrity regression tests.

Covers the six correctness fixes that must precede the activation funnel:
signup signal, stable numbering, honest delivery states, and atomic metering.
"""
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from tests.helpers import capture_login_codes, sign_paystack


async def _verify(client: AsyncClient, delivered: dict[str, str], email: str) -> dict:
    res = await client.post("/auth/magic-link", json={"email": email})
    assert res.status_code == 200, res.text
    code = delivered[email.lower().strip()]
    verify = await client.post("/auth/verify", json={"email": email, "code": code})
    assert verify.status_code == 200, verify.text
    client.cookies.set("bagg_session", verify.cookies["bagg_session"])
    return verify.json()


async def _auth(client: AsyncClient, monkeypatch) -> tuple[str, dict, dict]:
    email = f"phase0-{uuid.uuid4().hex[:10]}@example.com"
    delivered = capture_login_codes(monkeypatch)
    payload = await _verify(client, delivered, email)
    return email, delivered, payload


async def _create_client(client: AsyncClient, *, email: str | None = None) -> str:
    res = await client.post(
        "/clients",
        json={
            "name": "Phase Zero Client",
            "email": email or f"client-{uuid.uuid4().hex[:8]}@example.com",
            "preferred_currency": "NGN",
            "default_payment_terms_days": 14,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


async def _create_invoice(client: AsyncClient, client_id: str) -> dict:
    res = await client.post(
        "/invoices",
        json={
            "client_id": client_id,
            "currency": "NGN",
            "items": [
                {
                    "description": "Activation audit",
                    "quantity": 1,
                    "unit_price_minor": 1_000_000,
                }
            ],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


async def _finalize_invoice(client: AsyncClient, invoice_id: str) -> dict:
    res = await client.post(f"/invoices/{invoice_id}/finalize")
    assert res.status_code == 200, res.text
    return res.json()


async def _create_quote(client: AsyncClient, client_id: str) -> dict:
    res = await client.post(
        "/quotes",
        json={
            "client_id": client_id,
            "currency": "NGN",
            "validity_days": 14,
            "items": [
                {
                    "description": "Activation audit",
                    "quantity": 1,
                    "unit_price_minor": 1_000_000,
                }
            ],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


async def _buy_credits(
    client: AsyncClient,
    monkeypatch,
    workspace_id: str,
    credits: int = 200,
) -> None:
    secret = "sk_test_phase0_secret"
    monkeypatch.setattr(settings, "PAYSTACK_SECRET_KEY", secret)

    checkout = await client.post(
        "/billing/credits/buy",
        json={"pack": "200_credits", "currency": "NGN"},
    )
    assert checkout.status_code == 200, checkout.text
    reference = checkout.json()["reference"]

    payload = {
        "event": "charge.success",
        "data": {
            "reference": reference,
            "amount": 200000,
            "currency": "NGN",
            "metadata": {
                "workspace_id": workspace_id,
                "type": "credit_pack",
                "credits": credits,
            },
        },
    }
    body, signature = sign_paystack(payload, secret)
    res = await client.post(
        "/webhooks/paystack",
        content=body,
        headers={
            "content-type": "application/json",
            "x-paystack-signature": signature,
        },
    )
    assert res.status_code == 200, res.text


@pytest.mark.asyncio
async def test_signup_signal_and_session(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = f"phase0-signup-{uuid.uuid4().hex[:10]}@example.com"
        delivered = capture_login_codes(monkeypatch)

        first = await _verify(client, delivered, email)
        assert first["is_new_user"] is True

        me = await client.get("/auth/me")
        assert me.status_code == 200, me.text
        assert me.json()["is_new_user"] is False

        second = await _verify(client, delivered, email)
        assert second["is_new_user"] is False


@pytest.mark.asyncio
async def test_invoice_number_is_stable_through_finalize(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await _auth(client, monkeypatch)
        client_id = await _create_client(client)

        first = await _create_invoice(client, client_id)
        assert first["invoice_number"] == "INV-0001"

        finalized = await _finalize_invoice(client, first["id"])
        assert finalized["invoice_number"] == "INV-0001"
        assert finalized["sequence_number"] == 1

        second = await _create_invoice(client, client_id)
        assert second["invoice_number"] == "INV-0002"

        finalized_second = await _finalize_invoice(client, second["id"])
        assert finalized_second["invoice_number"] == "INV-0002"
        assert finalized_second["sequence_number"] == 2


@pytest.mark.asyncio
async def test_quote_number_is_stable_through_finalize(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await _auth(client, monkeypatch)
        client_id = await _create_client(client)

        first = await _create_quote(client, client_id)
        assert first["quote_number"] == "QOT-0001"

        finalized = await client.post(f"/quotes/{first['id']}/finalize")
        assert finalized.status_code == 200, finalized.text
        body = finalized.json()
        assert body["quote_number"] == "QOT-0001"
        assert body["sequence_number"] == 1


@pytest.mark.asyncio
async def test_failed_email_does_not_mark_sent(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await _auth(client, monkeypatch)
        client_id = await _create_client(client)
        invoice = await _create_invoice(client, client_id)
        await _finalize_invoice(client, invoice["id"])

        async def fail_send(self, **kwargs):
            return False

        monkeypatch.setattr(
            "app.domains.invoices.service.EmailSender.send_invoice_email",
            fail_send,
        )

        res = await client.post(
            f"/invoices/{invoice['id']}/send",
            json={"send_email": True},
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["email_sent"] is False
        assert body["invoice"]["status"] == "issued"
        assert body["invoice"]["sent_at"] is None
        assert body["invoice"]["email_delivery_status"] == "failed"

        public = await client.get(f"/share/{invoice['share_token']}")
        assert public.status_code == 200, public.text
        assert public.json()["invoice"]["status"] == "issued"


@pytest.mark.asyncio
async def test_link_handoff_marks_sent_and_public_view(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await _auth(client, monkeypatch)
        client_id = await _create_client(client)
        invoice = await _create_invoice(client, client_id)
        await _finalize_invoice(client, invoice["id"])

        res = await client.post(
            f"/invoices/{invoice['id']}/send",
            json={"send_email": False},
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["email_sent"] is False
        assert body["invoice"]["status"] == "sent"
        assert body["invoice"]["sent_at"] is not None

        public = await client.get(f"/share/{invoice['share_token']}")
        assert public.status_code == 200, public.text
        assert public.json()["invoice"]["status"] == "viewed"


@pytest.mark.asyncio
async def test_fourth_send_requires_credit_and_debits_after_purchase(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        _, _, auth = await _auth(client, monkeypatch)
        workspace_id = auth["workspace"]["id"]
        client_id = await _create_client(client)

        invoices = []
        for _ in range(4):
            invoice = await _create_invoice(client, client_id)
            await _finalize_invoice(client, invoice["id"])
            invoices.append(invoice)

        for invoice in invoices[:3]:
            res = await client.post(
                f"/invoices/{invoice['id']}/send",
                json={"send_email": False},
            )
            assert res.status_code == 200, res.text

        blocked = await client.post(
            f"/invoices/{invoices[3]['id']}/send",
            json={"send_email": False},
        )
        assert blocked.status_code == 402, blocked.text

        await _buy_credits(client, monkeypatch, workspace_id)
        assert (await client.get("/billing/credits")).json()["balance"] == 200

        allowed = await client.post(
            f"/invoices/{invoices[3]['id']}/send",
            json={"send_email": False},
        )
        assert allowed.status_code == 200, allowed.text
        assert allowed.json()["invoice"]["status"] == "sent"
        assert (await client.get("/billing/credits")).json()["balance"] == 199


@pytest.mark.asyncio
async def test_failed_email_refunds_reserved_credit(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        _, _, auth = await _auth(client, monkeypatch)
        workspace_id = auth["workspace"]["id"]
        client_id = await _create_client(client)

        for _ in range(3):
            invoice = await _create_invoice(client, client_id)
            await _finalize_invoice(client, invoice["id"])
            res = await client.post(
                f"/invoices/{invoice['id']}/send",
                json={"send_email": False},
            )
            assert res.status_code == 200, res.text

        await _buy_credits(client, monkeypatch, workspace_id)
        invoice = await _create_invoice(client, client_id)
        await _finalize_invoice(client, invoice["id"])

        async def fail_send(self, **kwargs):
            return False

        monkeypatch.setattr(
            "app.domains.invoices.service.EmailSender.send_invoice_email",
            fail_send,
        )

        res = await client.post(
            f"/invoices/{invoice['id']}/send",
            json={"send_email": True},
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["invoice"]["status"] == "issued"
        assert body["invoice"]["email_delivery_status"] == "failed"
        assert (await client.get("/billing/credits")).json()["balance"] == 200
