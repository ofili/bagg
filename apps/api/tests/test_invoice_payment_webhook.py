import hashlib
import hmac
import json
import uuid
from datetime import date, timedelta
from types import SimpleNamespace

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.domains.sharing import router as sharing_router
from app.main import app
from tests.helpers import create_sent_invoice

WEBHOOK_SECRET = "sk_test_invoice_webhook_secret"


class FakePaystackResponse:
    status_code = 200

    def json(self):
        return {
            "status": True,
            "data": {"authorization_url": "https://checkout.paystack.test/authorize"},
        }


class FakePaystackClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, *args, **kwargs):
        return FakePaystackResponse()


def sign(payload: dict) -> str:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return hmac.new(WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha512).hexdigest()


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
            "customer": {"first_name": "Ada", "last_name": "Okafor"},
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
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/webhooks/paystack/invoice-payments",
            json={"event": "charge.success", "data": {}},
        )

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invoice_payment_webhook_rejects_invalid_signature(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_INVOICE_WEBHOOK_SECRET", WEBHOOK_SECRET)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await post_webhook(
            client,
            {"event": "charge.success", "data": {"reference": "forged"}},
            "0" * 128,
        )

    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invoice_payment_webhook_confirms_once(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_INVOICE_WEBHOOK_SECRET", WEBHOOK_SECRET)
    monkeypatch.setattr(
        sharing_router,
        "httpx",
        SimpleNamespace(AsyncClient=FakePaystackClient, HTTPError=httpx.HTTPError),
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = f"webhook-{uuid.uuid4().hex[:8]}@studio.ng"
        req = await client.post("/auth/magic-link", json={"email": email})
        verify = await client.post(
            "/auth/verify", json={"email": email, "code": req.json()["dev_code"]}
        )
        client.cookies.set("bagg_session", verify.cookies["bagg_session"])

        created_client = await client.post(
            "/clients",
            json={"name": "Webhook Client Ltd", "preferred_currency": "NGN"},
        )
        assert created_client.status_code == 201

        invoice_data = await create_sent_invoice(
            client,
            {
                "client_id": created_client.json()["id"],
                "currency": "NGN",
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [
                    {"description": "Webhook settlement test", "quantity": 1, "unit_price_minor": 125_000_00}
                ],
            },
        )
        invoice_id = invoice_data["id"]
        token = invoice_data["share_token"]

        unconfirmed_receipt = await client.post(
            f"/receipts/invoice/{invoice_id}",
            json={"amount_paid_minor": invoice_data["total_minor"], "confirm_received": False},
        )
        assert unconfirmed_receipt.status_code == 400
        assert "confirmation" in unconfirmed_receipt.json()["detail"].lower()

        async with AsyncClient(transport=transport, base_url="http://test") as payer:
            checkout = await payer.post(f"/share/{token}/checkout", json={})
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

        unsigned = await post_webhook(client, payload)
        assert unsigned.status_code == 400
        assert "signature" in unsigned.json()["detail"].lower()

        wrong_currency = webhook_body(
            reference=reference,
            invoice_id=invoice_id,
            workspace_id=invoice_data["workspace_id"],
            invoice_number=invoice_data["invoice_number"],
            amount_minor=invoice_data["total_minor"],
            currency="USD",
        )
        mismatch = await post_webhook(client, wrong_currency, sign(wrong_currency))
        assert mismatch.status_code == 400
        assert "currency" in mismatch.json()["detail"].lower()

        overpay = webhook_body(
            reference=reference,
            invoice_id=invoice_id,
            workspace_id=invoice_data["workspace_id"],
            invoice_number=invoice_data["invoice_number"],
            amount_minor=invoice_data["total_minor"] + 100,
            currency="NGN",
        )
        overpaid = await post_webhook(client, overpay, sign(overpay))
        assert overpaid.status_code == 400
        assert "exceed" in overpaid.json()["detail"].lower()

        before = await client.get(f"/invoices/{invoice_id}")
        assert before.json()["status"] != "paid"
        assert before.json()["amount_paid_minor"] == 0

        confirmed = await post_webhook(client, payload, sign(payload))
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

        receipts = await client.get(f"/receipts?invoice_id={invoice_id}")
        assert receipts.status_code == 200
        assert len(receipts.json()) == 1
        assert receipts.json()[0]["provider_reference"] == reference

        events = await client.get(f"/invoices/{invoice_id}/status-events")
        assert events.status_code == 200
        assert any(event["source"] == "webhook_paystack" for event in events.json())

        duplicate = await post_webhook(client, payload, sign(payload))
        assert duplicate.status_code == 200
        assert duplicate.json()["status"] == "already_processed"
        assert len((await client.get(f"/receipts?invoice_id={invoice_id}")).json()) == 1


@pytest.mark.asyncio
async def test_invoice_payment_webhook_rejects_reference_for_another_checkout(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_INVOICE_WEBHOOK_SECRET", WEBHOOK_SECRET)
    monkeypatch.setattr(
        sharing_router,
        "httpx",
        SimpleNamespace(AsyncClient=FakePaystackClient, HTTPError=httpx.HTTPError),
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = f"webhook-ref-{uuid.uuid4().hex[:8]}@studio.ng"
        req = await client.post("/auth/magic-link", json={"email": email})
        verify = await client.post(
            "/auth/verify", json={"email": email, "code": req.json()["dev_code"]}
        )
        client.cookies.set("bagg_session", verify.cookies["bagg_session"])

        created_client = await client.post(
            "/clients",
            json={"name": "Reference Guard Ltd", "preferred_currency": "NGN"},
        )
        invoice_data = await create_sent_invoice(
            client,
            {
                "client_id": created_client.json()["id"],
                "currency": "NGN",
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [{"description": "Reference guard", "quantity": 1, "unit_price_minor": 50_000_00}],
            },
        )
        token = invoice_data["share_token"]

        async with AsyncClient(transport=transport, base_url="http://test") as payer:
            checkout = await payer.post(f"/share/{token}/checkout", json={})
            assert checkout.status_code == 201

        payload = webhook_body(
            reference="bagg_pay_attacker_reference",
            invoice_id=invoice_data["id"],
            workspace_id=invoice_data["workspace_id"],
            invoice_number=invoice_data["invoice_number"],
            amount_minor=invoice_data["total_minor"],
            currency="NGN",
        )
        rejected = await post_webhook(client, payload, sign(payload))
        assert rejected.status_code == 400
        assert "does not match" in rejected.json()["detail"].lower()

        unchanged = await client.get(f"/invoices/{invoice_data['id']}")
        assert unchanged.json()["status"] != "paid"
        assert unchanged.json()["amount_paid_minor"] == 0
