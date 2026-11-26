import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import select
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.domains.lifecycle.models import DocumentStatusEvent
from tests.helpers import authenticate_test_user, create_sent_invoice


async def authenticated_client():
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")

    email = f"reversal-{uuid.uuid4().hex[:8]}@studio.ng"

    await authenticate_test_user(
        client,
        email,
        full_name="Reversal Test User",
    )

    client_response = await client.post(
        "/clients",
        json={
            "name": "Reversal Test Client",
            "preferred_currency": "NGN",
        },
    )
    assert client_response.status_code == 201, client_response.text

    return client, client_response.json()["id"]


async def create_paid_invoice(client, client_id, amount_minor=100_000):
    invoice = await create_sent_invoice(
        client,
        {
            "client_id": client_id,
            "currency": "NGN",
            "due_date": str(date.today() + timedelta(days=30)),
            "items": [
                {
                    "description": "Reversal test service",
                    "quantity": 1,
                    "unit_price_minor": amount_minor,
                }
            ],
        },
    )

    payment = await client.post(
        f"/receipts/invoice/{invoice['id']}",
        json={
            "amount_paid_minor": invoice["total_minor"],
            "confirm_received": True,
            "payment_method": "bank_transfer",
            "reference": f"PAY-{uuid.uuid4().hex[:10]}",
        },
    )
    assert payment.status_code == 201

    return invoice, payment.json()


@pytest.mark.asyncio
async def test_accounting_correction_posts_immediately_and_reopens_invoice():
    client, client_id = await authenticated_client()

    try:
        invoice, receipt = await create_paid_invoice(client, client_id)

        reversal = await client.post(
            f"/receipts/{receipt['id']}/reversals",
            json={
                "amount_minor": 25_000,
                "reversal_type": "correction",
                "reason": "Correct an overstated payment entry",
                "idempotency_key": f"correction-{uuid.uuid4().hex[:12]}",
            },
        )

        assert reversal.status_code == 201
        assert reversal.json()["status"] == "posted"

        updated_invoice = await client.get(f"/invoices/{invoice['id']}")
        assert updated_invoice.status_code == 200
        assert updated_invoice.json()["amount_paid_minor"] == (
            invoice["total_minor"] - 25_000
        )
        assert updated_invoice.json()["status"] == "partially_paid"

        receipt_detail = await client.get(f"/receipts/{receipt['id']}")
        assert receipt_detail.status_code == 200
        assert len(receipt_detail.json()["reversals"]) == 1

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_refund_remains_pending_until_evidence_is_supplied():
    client, client_id = await authenticated_client()

    try:
        invoice, receipt = await create_paid_invoice(client, client_id)

        reversal = await client.post(
            f"/receipts/{receipt['id']}/reversals",
            json={
                "amount_minor": 20_000,
                "reversal_type": "refund",
                "reason": "Refund agreed with client",
                "idempotency_key": f"refund-{uuid.uuid4().hex[:12]}",
            },
        )

        assert reversal.status_code == 201
        reversal_data = reversal.json()
        assert reversal_data["status"] == "pending"

        # A pending refund must not change the invoice balance.
        unchanged = await client.get(f"/invoices/{invoice['id']}")
        assert unchanged.json()["amount_paid_minor"] == invoice["total_minor"]
        assert unchanged.json()["status"] == "paid"

        missing_evidence = await client.post(
            f"/receipts/reversals/{reversal_data['id']}/post",
            json={},
        )
        assert missing_evidence.status_code == 400

        posted = await client.post(
            f"/receipts/reversals/{reversal_data['id']}/post",
            json={"evidence_reference": "refund-provider-reference-001"},
        )

        assert posted.status_code == 200
        assert posted.json()["status"] == "posted"

        updated = await client.get(f"/invoices/{invoice['id']}")
        assert updated.json()["amount_paid_minor"] == (
            invoice["total_minor"] - 20_000
        )
        assert updated.json()["status"] == "partially_paid"

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_cumulative_reversals_cannot_exceed_original_receipt():
    client, client_id = await authenticated_client()

    try:
        invoice, receipt = await create_paid_invoice(client, client_id)

        first = await client.post(
            f"/receipts/{receipt['id']}/reversals",
            json={
                "amount_minor": 80_000,
                "reversal_type": "correction",
                "reason": "First accounting correction",
                "idempotency_key": f"first-{uuid.uuid4().hex[:12]}",
            },
        )
        assert first.status_code == 201

        second = await client.post(
            f"/receipts/{receipt['id']}/reversals",
            json={
                "amount_minor": 30_000,
                "reversal_type": "correction",
                "reason": "Second accounting correction",
                "idempotency_key": f"second-{uuid.uuid4().hex[:12]}",
            },
        )

        assert second.status_code == 400

        updated = await client.get(f"/invoices/{invoice['id']}")
        assert updated.json()["amount_paid_minor"] == (
            invoice["total_minor"] - 80_000
        )

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_reversal_idempotency_returns_existing_record():
    client, client_id = await authenticated_client()

    try:
        _, receipt = await create_paid_invoice(client, client_id)
        key = f"idem-{uuid.uuid4().hex[:12]}"

        payload = {
            "amount_minor": 10_000,
            "reversal_type": "correction",
            "reason": "Duplicate request test",
            "idempotency_key": key,
        }

        first = await client.post(
            f"/receipts/{receipt['id']}/reversals",
            json=payload,
        )
        second = await client.post(
            f"/receipts/{receipt['id']}/reversals",
            json=payload,
        )

        assert first.status_code == 201
        assert second.status_code == 201
        assert first.json()["id"] == second.json()["id"]

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_immediate_correction_records_initial_posted_lifecycle_event(
    db_session,
):
    client, client_id = await authenticated_client()

    try:
        _, receipt = await create_paid_invoice(client, client_id)

        current_user = await client.get("/auth/me")
        assert current_user.status_code == 200
        actor_id = current_user.json()["user"]["id"]

        response = await client.post(
            f"/receipts/{receipt['id']}/reversals",
            json={
                "amount_minor": 10_000,
                "reversal_type": "correction",
                "reason": "Accounting correction",
                "idempotency_key": f"correction-event-{uuid.uuid4().hex[:12]}",
            },
        )

        assert response.status_code == 201, response.text
        reversal_id = response.json()["id"]

        db_session.expire_all()

        result = await db_session.execute(
            select(DocumentStatusEvent).where(
                DocumentStatusEvent.document_type == "receipt_reversal",
                DocumentStatusEvent.document_id == reversal_id,
            )
        )
        events = list(result.scalars().all())

        assert len(events) == 1

        event = events[0]
        assert event.from_status is None
        assert event.to_status == "posted"
        assert event.actor_type == "issuer"
        assert event.actor_id == actor_id
        assert event.source == "receipt_reversal_created"
        assert event.event_metadata["receipt_id"] == receipt["id"]
        assert event.event_metadata["amount_minor"] == 10_000

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_pending_refund_records_creation_and_posting_events(db_session):
    client, client_id = await authenticated_client()

    try:
        _, receipt = await create_paid_invoice(client, client_id)

        current_user = await client.get("/auth/me")
        assert current_user.status_code == 200
        actor_id = current_user.json()["user"]["id"]

        response = await client.post(
            f"/receipts/{receipt['id']}/reversals",
            json={
                "amount_minor": 10_000,
                "reversal_type": "refund",
                "reason": "Refund agreed with client",
                "idempotency_key": f"refund-event-{uuid.uuid4().hex[:12]}",
            },
        )

        assert response.status_code == 201, response.text
        reversal_id = response.json()["id"]

        posted = await client.post(
            f"/receipts/reversals/{reversal_id}/post",
            json={"evidence_reference": "REFUND-EVIDENCE-001"},
        )

        assert posted.status_code == 200, posted.text

        db_session.expire_all()

        result = await db_session.execute(
            select(DocumentStatusEvent).where(
                DocumentStatusEvent.document_type == "receipt_reversal",
                DocumentStatusEvent.document_id == reversal_id,
            )
        )
        events = list(result.scalars().all())

        assert len(events) == 2

        created = next(event for event in events if event.to_status == "pending")
        assert created.from_status is None
        assert created.actor_type == "issuer"
        assert created.actor_id == actor_id
        assert created.source == "receipt_reversal_created"

        posted_event = next(event for event in events if event.to_status == "posted")
        assert posted_event.from_status == "pending"
        assert posted_event.actor_type == "issuer"
        assert posted_event.actor_id == actor_id
        assert posted_event.source == "receipt_reversal_posted"
        assert (
            posted_event.event_metadata["evidence_reference"] == "REFUND-EVIDENCE-001"
        )

    finally:
        await client.aclose()
