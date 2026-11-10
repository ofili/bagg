"""Phase 0 integrity regression tests.

Covers the six correctness fixes that must precede the activation funnel:
signup signal, stable numbering, honest delivery states, and atomic metering.
"""
import uuid
from datetime import datetime, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.domains.billing.models import BillingCheckout
from app.integrations.email_delivery import DeliveryOutcome, DeliveryResult
from app.integrations.email_models import EmailOutbox
from app.jobs.worker import WORKER_ID, record_result
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

    async def fake_initialize(self, **kwargs):
        return {
            "authorization_url": "https://checkout.test/authorize",
            "reference": kwargs["reference"],
        }

    monkeypatch.setattr(
        "app.domains.billing.checkout_service.PaystackClient.initialize_payment",
        fake_initialize,
    )

    checkout = await client.post(
        "/billing/credits/buy",
        json={"pack": "200_credits", "currency": "NGN"},
    )
    assert checkout.status_code in {200, 201}, checkout.text
    reference = checkout.json()["reference"]

    async with AsyncSessionLocal() as session:
        stored = (
            await session.execute(
                select(BillingCheckout).where(
                    BillingCheckout.provider_reference == reference
                )
            )
        ).scalar_one()

    payload = {
        "event": "charge.success",
        "data": {
            "reference": reference,
            "amount": 200000,
            "currency": "NGN",
            "status": "success",
            "metadata": {
                "type": "bagg_billing_checkout",
                "billing_checkout_id": stored.id,
                "workspace_id": workspace_id,
                "purchase_type": "credit_pack",
                "pack": stored.pack_code,
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


async def _claim_message(message_id: str) -> None:
    """Simulate the email worker claiming an outbox message."""
    async with AsyncSessionLocal() as session:
        message = await session.get(EmailOutbox, message_id)
        assert message is not None
        message.status = "processing"
        message.locked_by = WORKER_ID
        message.locked_at = datetime.now(timezone.utc)
        message.attempts = 1
        await session.commit()


async def _latest_message(invoice_id: str) -> EmailOutbox:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(EmailOutbox)
            .where(
                EmailOutbox.message_type == "invoice_email",
                EmailOutbox.aggregate_id == invoice_id,
            )
            .order_by(
                EmailOutbox.created_at.desc(),
                EmailOutbox.id.desc(),
            )
            .limit(1)
        )
        return result.scalar_one()


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
        assert first["invoice_number"] is None

        finalized = await _finalize_invoice(client, first["id"])
        assert finalized["invoice_number"] == "INV-0001"
        assert finalized["sequence_number"] == 1

        second = await _create_invoice(client, client_id)
        assert second["invoice_number"] is None

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
async def test_email_dispatch_queues_without_synchronous_delivery(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await _auth(client, monkeypatch)
        client_id = await _create_client(client)
        invoice = await _create_invoice(client, client_id)
        await _finalize_invoice(client, invoice["id"])

        res = await client.post(
            f"/invoices/{invoice['id']}/send",
            json={"send_email": True},
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["email_queued"] is True
        assert body["email_sent"] is False
        assert body["invoice"]["status"] == "sent"
        assert body["invoice"]["sent_at"] is not None
        assert body["invoice"]["email_delivery_status"] == "queued"

        public = await client.get(f"/share/{invoice['share_token']}")
        assert public.status_code == 200, public.text
        assert public.json()["invoice"]["status"] == "viewed"


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

        res = await client.post(
            f"/invoices/{invoice['id']}/send",
            json={"send_email": True},
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["invoice"]["email_delivery_status"] == "queued"
        assert (await client.get("/billing/credits")).json()["balance"] == 199

        # Simulate the worker claiming the message and receiving a permanent
        # provider failure. The metered deduction must be refunded once.
        async with AsyncSessionLocal() as session:
            message = (
                await session.execute(
                    select(EmailOutbox).where(
                        EmailOutbox.message_type == "invoice_email",
                        EmailOutbox.aggregate_id == invoice["id"],
                    )
                )
            ).scalar_one()
            message.status = "processing"
            message.locked_by = WORKER_ID
            message.locked_at = datetime.now(timezone.utc)
            message.attempts = 1
            message_id = message.id
            await session.commit()

        await record_result(
            message_id,
            1,
            DeliveryResult(
                outcome=DeliveryOutcome.PERMANENT,
                provider="smtp",
                error_code="test_permanent_failure",
            ),
        )

        assert (await client.get("/billing/credits")).json()["balance"] == 200
        invoice_after = await client.get(f"/invoices/{invoice['id']}")
        assert invoice_after.status_code == 200
        assert invoice_after.json()["email_delivery_status"] == "failed"


@pytest.mark.asyncio
async def test_failed_resend_is_metered_again(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        _, _, auth = await _auth(client, monkeypatch)
        workspace_id = auth["workspace"]["id"]
        client_id = await _create_client(client)

        # Exhaust the free monthly dispatch allowance with link shares.
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

        first = await client.post(
            f"/invoices/{invoice['id']}/send",
            json={"send_email": True},
        )
        assert first.status_code == 200, first.text
        assert (await client.get("/billing/credits")).json()["balance"] == 199

        first_message = await _latest_message(invoice["id"])
        await _claim_message(first_message.id)
        await record_result(
            first_message.id,
            1,
            DeliveryResult(
                outcome=DeliveryOutcome.PERMANENT,
                provider="smtp",
                error_code="test_permanent_failure",
            ),
        )
        assert (await client.get("/billing/credits")).json()["balance"] == 200

        # A resend after terminal failure is a new metered message.
        second = await client.post(
            f"/invoices/{invoice['id']}/send",
            json={"send_email": True},
        )
        assert second.status_code == 200, second.text
        assert second.json()["email_queued"] is True
        assert (await client.get("/billing/credits")).json()["balance"] == 199

        second_message = await _latest_message(invoice["id"])
        assert second_message.id != first_message.id
        await _claim_message(second_message.id)
        await record_result(
            second_message.id,
            1,
            DeliveryResult(
                outcome=DeliveryOutcome.ACCEPTED,
                provider="smtp",
            ),
        )

        # A resend after successful delivery stays unmetered.
        third = await client.post(
            f"/invoices/{invoice['id']}/send",
            json={"send_email": True},
        )
        assert third.status_code == 200, third.text
        assert third.json()["email_queued"] is True
        assert (await client.get("/billing/credits")).json()["balance"] == 199

        async with AsyncSessionLocal() as session:
            messages = (
                await session.execute(
                    select(EmailOutbox)
                    .where(
                        EmailOutbox.message_type == "invoice_email",
                        EmailOutbox.aggregate_id == invoice["id"],
                    )
                    .order_by(EmailOutbox.created_at.asc())
                )
            ).scalars().all()
            assert len(messages) == 3
