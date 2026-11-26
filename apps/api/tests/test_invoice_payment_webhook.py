import hashlib
import hmac
import json
import uuid
from datetime import date, timedelta

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.domains.audit.models import AuditEvent
from app.domains.invoices.models import Invoice
from app.domains.payments import checkout_service as payments_checkout_service
from app.main import app
from tests.helpers import create_sent_invoice, login_code_for

WEBHOOK_SECRET = "sk_test_invoice_webhook_secret"


async def enable_direct_checkout(invoice_id: str) -> None:
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Invoice)
            .where(Invoice.id == invoice_id)
            .values(direct_checkout_enabled=True)
        )
        await db.commit()


class FakePaystackProvider:
    async def initialize_payment(self, **kwargs):
        return {
            "authorization_url": "https://checkout.paystack.test/authorize",
            "reference": kwargs["reference"],
            "access_code": "test_access_code",
        }


def sign(payload: dict) -> str:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha512,
    ).hexdigest()


def webhook_body(
    *,
    reference: str,
    invoice_id: str,
    workspace_id: str,
    invoice_number: str,
    amount_minor: int,
    currency: str,
    event: str = "charge.success",
) -> dict:
    return {
        "event": event,
        "data": {
            "reference": reference,
            "amount": amount_minor,
            "currency": currency,
            "channel": "card",
            "status": "success",
            "customer": {
                "first_name": "Ada",
                "last_name": "Okafor",
            },
            "metadata": {
                "type": "direct_invoice_payment",
                "invoice_id": invoice_id,
                "invoice_number": invoice_number,
                "workspace_id": workspace_id,
            },
        },
    }


async def post_webhook(
    client: AsyncClient,
    payload: dict,
    signature: str | None = None,
) -> httpx.Response:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    headers = {"content-type": "application/json"}

    if signature is not None:
        headers["x-paystack-signature"] = signature

    return await client.post(
        "/webhooks/paystack/invoice-payments",
        content=body,
        headers=headers,
    )


@pytest.mark.asyncio
async def test_invoice_payment_webhook_requires_configured_secret(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_INVOICE_WEBHOOK_SECRET", None)
    monkeypatch.setattr(settings, "PAYSTACK_SECRET_KEY", None)

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/webhooks/paystack/invoice-payments",
            json={
                "event": "charge.success",
                "data": {},
            },
        )

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invoice_payment_webhook_rejects_invalid_signature(monkeypatch):
    monkeypatch.setattr(
        settings,
        "PAYSTACK_INVOICE_WEBHOOK_SECRET",
        WEBHOOK_SECRET,
    )

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await post_webhook(
            client,
            {
                "event": "charge.success",
                "data": {"reference": "forged"},
            },
            "0" * 128,
        )

    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invoice_payment_webhook_confirms_once(monkeypatch):
    monkeypatch.setattr(
        settings,
        "PAYSTACK_INVOICE_WEBHOOK_SECRET",
        WEBHOOK_SECRET,
    )
    monkeypatch.setattr(
        settings,
        "DIRECT_INVOICE_CHECKOUT_ENABLED",
        True,
    )

    monkeypatch.setattr(
        payments_checkout_service,
        "PaystackClient",
        FakePaystackProvider,
    )

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        email = f"webhook-{uuid.uuid4().hex[:8]}@studio.ng"

        await client.post(
            "/auth/magic-link",
            json={"email": email},
        )

        verify = await client.post(
            "/auth/verify",
            json={
                "email": email,
                "code": login_code_for(email),
                "intent": "signup",
                "full_name": "Webhook Test User",
            },
        )

        assert verify.status_code == 200, verify.text
        assert "bagg_session" in verify.cookies

        client.cookies.set(
            "bagg_session",
            verify.cookies["bagg_session"],
        )

        created_client = await client.post(
            "/clients",
            json={
                "name": "Webhook Client Ltd",
                "preferred_currency": "NGN",
            },
        )

        assert created_client.status_code == 201

        invoice_data = await create_sent_invoice(
            client,
            {
                "client_id": created_client.json()["id"],
                "currency": "NGN",
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [
                    {
                        "description": "Webhook settlement test",
                        "quantity": 1,
                        "unit_price_minor": 125_000_00,
                    }
                ],
            },
        )

        invoice_id = invoice_data["id"]
        token = invoice_data["share_token"]

        await enable_direct_checkout(invoice_id)

        unconfirmed_receipt = await client.post(
            f"/receipts/invoice/{invoice_id}",
            json={
                "amount_paid_minor": invoice_data["total_minor"],
                "confirm_received": False,
            },
        )

        assert unconfirmed_receipt.status_code == 400
        assert "confirmation" in unconfirmed_receipt.json()["detail"].lower()

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as payer:
            checkout = await payer.post(
                f"/share/{token}/checkout",
                json={"payer_email": email},
            )

            assert checkout.status_code == 201
            reference = checkout.json()["reference"]

        payload = webhook_body(
            reference=reference,
            invoice_id=invoice_id,
            workspace_id=invoice_data["workspace_id"],
            invoice_number=invoice_data["invoice_number"],
            amount_minor=invoice_data["total_minor"],
            currency="NGN",
        )

        # Unsigned webhook must be rejected.
        unsigned = await post_webhook(client, payload)

        assert unsigned.status_code == 400
        assert "signature" in unsigned.json()["detail"].lower()

        # Wrong currency must be rejected.
        wrong_currency = webhook_body(
            reference=reference,
            invoice_id=invoice_id,
            workspace_id=invoice_data["workspace_id"],
            invoice_number=invoice_data["invoice_number"],
            amount_minor=invoice_data["total_minor"],
            currency="USD",
        )

        mismatch = await post_webhook(
            client,
            wrong_currency,
            sign(wrong_currency),
        )

        assert mismatch.status_code == 400
        assert "currency" in mismatch.json()["detail"].lower()

        # Missing currency must be rejected.
        missing_currency = webhook_body(
            reference=reference,
            invoice_id=invoice_id,
            workspace_id=invoice_data["workspace_id"],
            invoice_number=invoice_data["invoice_number"],
            amount_minor=invoice_data["total_minor"],
            currency="NGN",
        )

        del missing_currency["data"]["currency"]

        missing_currency_response = await post_webhook(
            client,
            missing_currency,
            sign(missing_currency),
        )

        assert missing_currency_response.status_code == 400
        assert "currency" in missing_currency_response.json()["detail"].lower()

        # Overpayment must be rejected.
        overpay = webhook_body(
            reference=reference,
            invoice_id=invoice_id,
            workspace_id=invoice_data["workspace_id"],
            invoice_number=invoice_data["invoice_number"],
            amount_minor=invoice_data["total_minor"] + 100,
            currency="NGN",
        )

        overpaid = await post_webhook(
            client,
            overpay,
            sign(overpay),
        )

        assert overpaid.status_code == 400
        assert "exceed" in overpaid.json()["detail"].lower()

        # Invalid events must not change the invoice.
        before = await client.get(f"/invoices/{invoice_id}")

        assert before.json()["status"] != "paid"
        assert before.json()["amount_paid_minor"] == 0

        # Valid signed webhook confirms payment.
        confirmed = await post_webhook(
            client,
            payload,
            sign(payload),
        )

        assert confirmed.status_code == 200
        assert confirmed.json()["status"] == "success"

        after = await client.get(f"/invoices/{invoice_id}")
        paid = after.json()

        assert paid["status"] == "paid"
        assert paid["effective_status"] == "paid"
        assert paid["payment_state"] == "paid"
        assert paid["amount_paid_minor"] == invoice_data["total_minor"]

        assert paid["latest_receipt"]["confirmation_source"] == "webhook_paystack"
        assert paid["latest_receipt"]["provider"] == "paystack"
        assert paid["latest_receipt"]["reference"] == reference

        # Verify receipt creation.
        receipts = await client.get(f"/receipts?invoice_id={invoice_id}")

        assert receipts.status_code == 200

        receipt_items = receipts.json()["items"]

        assert len(receipt_items) == 1
        assert receipt_items[0]["provider_reference"] == reference

        # Verify the business audit event created by the Paystack webhook.
        receipt = receipt_items[0]

        async with AsyncSessionLocal() as db:
            audit_result = await db.execute(
                select(AuditEvent).where(
                    AuditEvent.entity_type == "receipt",
                    AuditEvent.entity_id == receipt["id"],
                    AuditEvent.action == "payment.confirmed",
                )
            )

            payment_audit = audit_result.scalar_one()

            assert payment_audit.actor_type == "webhook"
            assert payment_audit.actor_id == "paystack"
            assert payment_audit.outcome == "success"

            assert (
                payment_audit.after_state["amount_paid_minor"]
                == invoice_data["total_minor"]
            )
            assert payment_audit.after_state["currency"] == "NGN"

            assert payment_audit.metadata_json["invoice_id"] == invoice_id
            assert payment_audit.metadata_json["provider"] == "paystack"
            assert (
                payment_audit.metadata_json["confirmation_source"] == "webhook_paystack"
            )
            assert payment_audit.metadata_json["late_payment"] is False

        # Verify invoice lifecycle event.
        events = await client.get(f"/invoices/{invoice_id}/status-events")

        assert events.status_code == 200
        assert any(event["source"] == "webhook_paystack" for event in events.json())

        # Replaying the webhook must not create another receipt.
        duplicate = await post_webhook(
            client,
            payload,
            sign(payload),
        )

        assert duplicate.status_code == 200
        assert duplicate.json()["status"] == "already_processed"

        receipts_after_duplicate = await client.get(
            f"/receipts?invoice_id={invoice_id}"
        )

        assert len(receipts_after_duplicate.json()["items"]) == 1

        # Replaying the webhook must not create another audit event.
        async with AsyncSessionLocal() as db:
            audit_result = await db.execute(
                select(AuditEvent).where(
                    AuditEvent.entity_type == "receipt",
                    AuditEvent.entity_id == receipt["id"],
                    AuditEvent.action == "payment.confirmed",
                )
            )

            assert len(audit_result.scalars().all()) == 1


@pytest.mark.asyncio
async def test_invoice_payment_webhook_rejects_reference_for_another_checkout(
    monkeypatch,
):
    monkeypatch.setattr(
        settings,
        "PAYSTACK_INVOICE_WEBHOOK_SECRET",
        WEBHOOK_SECRET,
    )
    monkeypatch.setattr(
        settings,
        "DIRECT_INVOICE_CHECKOUT_ENABLED",
        True,
    )

    monkeypatch.setattr(
        payments_checkout_service,
        "PaystackClient",
        FakePaystackProvider,
    )

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        email = f"webhook-ref-{uuid.uuid4().hex[:8]}@studio.ng"

        await client.post(
            "/auth/magic-link",
            json={"email": email},
        )

        verify = await client.post(
            "/auth/verify",
            json={
                "email": email,
                "code": login_code_for(email),
                "intent": "signup",
                "full_name": "Webhook Test User",
            },
        )

        assert verify.status_code == 200, verify.text
        assert "bagg_session" in verify.cookies

        client.cookies.set(
            "bagg_session",
            verify.cookies["bagg_session"],
        )

        created_client = await client.post(
            "/clients",
            json={
                "name": "Reference Guard Ltd",
                "preferred_currency": "NGN",
            },
        )

        invoice_data = await create_sent_invoice(
            client,
            {
                "client_id": created_client.json()["id"],
                "currency": "NGN",
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [
                    {
                        "description": "Reference guard",
                        "quantity": 1,
                        "unit_price_minor": 50_000_00,
                    }
                ],
            },
        )

        token = invoice_data["share_token"]

        await enable_direct_checkout(invoice_data["id"])

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as payer:
            checkout = await payer.post(
                f"/share/{token}/checkout",
                json={"payer_email": email},
            )

            assert checkout.status_code == 201

        # Deliberately submit a different reference from the checkout.
        payload = webhook_body(
            reference="bagg_pay_attacker_reference",
            invoice_id=invoice_data["id"],
            workspace_id=invoice_data["workspace_id"],
            invoice_number=invoice_data["invoice_number"],
            amount_minor=invoice_data["total_minor"],
            currency="NGN",
        )

        rejected = await post_webhook(
            client,
            payload,
            sign(payload),
        )

        assert rejected.status_code == 400
        assert "does not match" in rejected.json()["detail"].lower()

        unchanged = await client.get(f"/invoices/{invoice_data['id']}")

        assert unchanged.json()["status"] != "paid"
        assert unchanged.json()["amount_paid_minor"] == 0
