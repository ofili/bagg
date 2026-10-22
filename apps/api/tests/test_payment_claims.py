import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.helpers import create_sent_invoice


async def setup_claimable_invoice(amount_minor: int = 50_000_00):
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")
    email = f"claims-{uuid.uuid4().hex[:8]}@studio.ng"
    req = await client.post("/auth/magic-link", json={"email": email})
    verify = await client.post(
        "/auth/verify", json={"email": email, "code": req.json()["dev_code"]}
    )
    client.cookies.set("bagg_session", verify.cookies["bagg_session"])
    created_client = await client.post(
        "/clients", json={"name": "Claims Test Ltd", "preferred_currency": "NGN"}
    )
    invoice = await create_sent_invoice(
        client,
        {
            "client_id": created_client.json()["id"],
            "currency": "NGN",
            "due_date": "2026-12-31",
            "items": [
                {
                    "description": "Claim test",
                    "quantity": 1,
                    "unit_price_minor": amount_minor,
                }
            ],
        },
    )
    return client, invoice


@pytest.mark.asyncio
async def test_claim_submission_marks_invoice_payment_claimed():
    client, invoice = await setup_claimable_invoice()
    try:
        response = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": invoice["total_minor"],
                "reference": "NIP/CLAIM/001",
                "proof_file_url": "https://storage.bagg.africa/proof.png",
            },
        )

        assert response.status_code == 201
        assert response.json()["status"] == "pending"
        assert response.json()["reference"] == "NIP/CLAIM/001"

        current = await client.get(f"/invoices/{invoice['id']}")
        assert current.json()["status"] == "payment_claimed"
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_claim_amount_must_be_positive_and_within_balance():
    client, invoice = await setup_claimable_invoice()
    try:
        zero = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={"amount_minor": 0, "reference": "NIP/ZERO"},
        )
        negative = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={"amount_minor": -100, "reference": "NIP/NEGATIVE"},
        )
        over_balance = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": invoice["total_minor"] + 1,
                "reference": "NIP/OVER",
            },
        )

        assert zero.status_code == 400
        assert negative.status_code == 400
        assert over_balance.status_code == 400
        assert "exceeds" in over_balance.json()["detail"].lower()

        current = await client.get(f"/invoices/{invoice['id']}")
        assert current.json()["status"] == "sent"
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_rejecting_a_non_pending_claim_is_rejected():
    client, invoice = await setup_claimable_invoice()
    try:
        claim = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={"amount_minor": invoice["total_minor"], "reference": "NIP/REJECT"},
        )
        claim_id = claim.json()["id"]

        first = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/reject",
            json={"rejection_reason": "Funds not received"},
        )
        assert first.status_code == 200

        second = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/reject",
            json={"rejection_reason": "Duplicate attempt"},
        )
        assert second.status_code == 400
        assert "already" in second.json()["detail"].lower()
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_confirming_an_already_confirmed_claim_is_rejected():
    client, invoice = await setup_claimable_invoice()
    try:
        claim = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={"amount_minor": 10_000_00, "reference": "NIP/PARTIAL"},
        )
        claim_id = claim.json()["id"]

        first = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/confirm",
            json={"amount_paid_minor": 10_000_00},
        )
        assert first.status_code == 200

        duplicate = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/confirm",
            json={"amount_paid_minor": 10_000_00},
        )
        assert duplicate.status_code == 400
        assert "already" in duplicate.json()["detail"].lower()

        receipts = await client.get(f"/receipts?invoice_id={invoice['id']}")
        assert len(receipts.json()) == 1
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_confirm_amount_cannot_exceed_outstanding_balance():
    client, invoice = await setup_claimable_invoice()
    try:
        claim = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={"amount_minor": 1_000_00, "reference": "NIP/OVERCONFIRM"},
        )
        claim_id = claim.json()["id"]

        response = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/confirm",
            json={"amount_paid_minor": invoice["total_minor"] + 1},
        )

        assert response.status_code == 400
        assert "exceed" in response.json()["detail"].lower()

        current = await client.get(f"/invoices/{invoice['id']}")
        assert current.json()["status"] == "payment_claimed"
        assert current.json()["amount_paid_minor"] == 0

        claim_state = await client.get(f"/invoices/{invoice['id']}/claims")
        assert claim_state.json()[0]["status"] == "pending"
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_partial_then_final_claim_payments():
    client, invoice = await setup_claimable_invoice()
    try:
        partial_amount = invoice["total_minor"] // 2
        partial = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={"amount_minor": partial_amount, "reference": "NIP/HALF"},
        )
        partial_confirm = await client.post(
            f"/invoices/{invoice['id']}/claims/{partial.json()['id']}/confirm"
        )
        assert partial_confirm.status_code == 200

        partly_paid = await client.get(f"/invoices/{invoice['id']}")
        assert partly_paid.json()["status"] == "partially_paid"
        assert partly_paid.json()["amount_paid_minor"] == partial_amount

        remaining = invoice["total_minor"] - partial_amount
        final = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={"amount_minor": remaining, "reference": "NIP/FINAL"},
        )
        final_confirm = await client.post(
            f"/invoices/{invoice['id']}/claims/{final.json()['id']}/confirm"
        )
        assert final_confirm.status_code == 200

        paid = await client.get(f"/invoices/{invoice['id']}")
        assert paid.json()["status"] == "paid"
        assert paid.json()["amount_paid_minor"] == invoice["total_minor"]

        receipts = await client.get(f"/receipts?invoice_id={invoice['id']}")
        assert len(receipts.json()) == 2
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_claim_cannot_be_submitted_for_paid_invoice():
    client, invoice = await setup_claimable_invoice()
    try:
        claim = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={"amount_minor": invoice["total_minor"], "reference": "NIP/FULL"},
        )
        await client.post(f"/invoices/{invoice['id']}/claims/{claim.json()['id']}/confirm")

        response = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={"amount_minor": 1, "reference": "NIP/AFTERPAID"},
        )

        assert response.status_code == 400
        assert "paid" in response.json()["detail"].lower()
    finally:
        await client.aclose()
