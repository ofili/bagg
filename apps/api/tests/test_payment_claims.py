import uuid
import pytest
from sqlalchemy import select

from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.helpers import create_sent_invoice, login_code_for

from app.domains.audit.models import AuditEvent
from app.domains.lifecycle.models import DocumentStatusEvent
from app.domains.reminders.models import ReminderJob

async def setup_claimable_invoice(amount_minor: int = 50_000_00):
    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://test")

    email = f"claims-{uuid.uuid4().hex[:8]}@studio.ng"

    req = await client.post(
        "/auth/magic-link",
        json={"email": email},
    )
    assert req.status_code == 200, req.text

    verify = await client.post(
        "/auth/verify",
        json={
            "email": email,
            "code": login_code_for(email),
            "intent": "signup",
            "full_name": "Payment Claims Test",
        },
    )
    assert verify.status_code == 200, verify.text

    session_cookie = verify.cookies.get("bagg_session")
    assert session_cookie, "Signup did not return a session cookie."

    client.cookies.set("bagg_session", session_cookie)

    created_client = await client.post(
        "/clients",
        json={
            "name": "Claims Test Ltd",
            "preferred_currency": "NGN",
        },
    )
    assert created_client.status_code == 201, created_client.text

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
        assert len(receipts.json()["items"]) == 1
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
            json={
                "amount_minor": remaining,
                "reference": "NIP/FINAL",
            },
        )

        assert final.status_code == 201, (
            f"Final claim submission failed: "
            f"status={final.status_code}, body={final.text}"
        )

        final_confirm = await client.post(
            f"/invoices/{invoice['id']}/claims/{final.json()['id']}/confirm"
        )
        assert final_confirm.status_code == 200

        paid = await client.get(f"/invoices/{invoice['id']}")
        assert paid.json()["status"] == "paid"
        assert paid.json()["amount_paid_minor"] == invoice["total_minor"]

        receipts = await client.get(f"/receipts?invoice_id={invoice['id']}")
        assert len(receipts.json()["items"]) == 2
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


@pytest.mark.asyncio
async def test_second_pending_claim_is_rejected_without_superseding_first():
    client, invoice = await setup_claimable_invoice()

    try:
        first = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": 10_000_00,
                "reference": "NIP/FIRST",
            },
        )

        assert first.status_code == 201
        first_claim_id = first.json()["id"]

        second = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": 15_000_00,
                "reference": "NIP/SECOND",
            },
        )

        assert second.status_code == 409

        claims = await client.get(f"/invoices/{invoice['id']}/claims")

        assert claims.status_code == 200
        assert len(claims.json()) == 1
        assert claims.json()[0]["id"] == first_claim_id
        assert claims.json()[0]["status"] == "pending"

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_confirmed_amount_cannot_exceed_claimed_amount():
    client, invoice = await setup_claimable_invoice()

    try:
        claim = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": 10_000_00,
                "reference": "NIP/CLAIM-LIMIT",
            },
        )

        claim_id = claim.json()["id"]

        response = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/confirm",
            json={
                "amount_paid_minor": 10_000_01,
            },
        )

        assert response.status_code == 400
        assert "claim" in response.json()["detail"].lower()

        current_claim = await client.get(f"/invoices/{invoice['id']}/claims")

        assert current_claim.json()[0]["status"] == "pending"

        receipts = await client.get(f"/receipts?invoice_id={invoice['id']}")

        assert len(receipts.json()["items"]) == 0

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_partial_confirmation_records_claimed_and_confirmed_amounts():
    client, invoice = await setup_claimable_invoice()

    try:
        claim = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": 20_000_00,
                "reference": "NIP/PARTIAL-CLAIM",
            },
        )

        claim_id = claim.json()["id"]

        response = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/confirm",
            json={
                "amount_paid_minor": 15_000_00,
            },
        )

        assert response.status_code == 200

        result = response.json()

        assert result["status"] == "confirmed"
        assert result["amount_minor"] == 20_000_00
        assert result["confirmed_amount_minor"] == 15_000_00
        assert result["confirmed_by_user_id"]

        receipts = await client.get(f"/receipts?invoice_id={invoice['id']}")

        assert len(receipts.json()["items"]) == 1
        assert receipts.json()["items"][0]["amount_paid_minor"] == 15_000_00

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_rejected_claim_records_reviewer_and_reason():
    client, invoice = await setup_claimable_invoice()

    try:
        claim = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": 10_000_00,
                "reference": "NIP/REVIEW",
            },
        )

        claim_id = claim.json()["id"]

        current_user = await client.get("/auth/me")
        assert current_user.status_code == 200

        reviewer_id = current_user.json()["user"]["id"]

        response = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/reject",
            json={"rejection_reason": "The transfer could not be verified."},
        )

        assert response.status_code == 200

        result = response.json()

        assert result["status"] == "rejected"
        assert result["rejection_reason"] == ("The transfer could not be verified.")
        assert result["rejected_by_user_id"] == reviewer_id
        assert result["rejected_at"] is not None

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_rejected_claim_restores_invoice_status_and_starts_new_reminder_cycle(
    db_session,
):
    client, invoice = await setup_claimable_invoice()

    try:
        initial_result = await db_session.execute(
            select(ReminderJob).where(
                ReminderJob.invoice_id == invoice["id"],
            )
        )
        initial_jobs = list(initial_result.scalars().all())

        assert initial_jobs
        assert all(job.cycle == 0 for job in initial_jobs)

        claim_response = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": 10_000_00,
                "reference": "NIP/REJECT-RESUME",
            },
        )
        assert claim_response.status_code == 201

        claim_id = claim_response.json()["id"]

        rejected = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/reject",
            json={"rejection_reason": "Transfer not received."},
        )
        assert rejected.status_code == 200

        current_invoice = await client.get(f"/invoices/{invoice['id']}")
        assert current_invoice.status_code == 200
        assert current_invoice.json()["status"] == "sent"

        db_session.expire_all()

        jobs_result = await db_session.execute(
            select(ReminderJob)
            .where(ReminderJob.invoice_id == invoice["id"])
            .order_by(ReminderJob.cycle.asc(), ReminderJob.due_at.asc())
        )
        jobs = list(jobs_result.scalars().all())

        old_jobs = [job for job in jobs if job.cycle == 0]
        resumed_jobs = [job for job in jobs if job.cycle == 1]

        assert old_jobs
        assert all(job.status == "cancelled" for job in old_jobs)
        assert resumed_jobs
        assert all(job.status == "pending" for job in resumed_jobs)

        old_keys = {job.idempotency_key for job in old_jobs}
        new_keys = {job.idempotency_key for job in resumed_jobs}

        assert old_keys.isdisjoint(new_keys)

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_partial_claim_confirmation_resumes_reminders_for_remaining_balance(
    db_session,
):
    client, invoice = await setup_claimable_invoice()

    try:
        claim_response = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": 20_000_00,
                "reference": "NIP/PARTIAL-RESUME",
            },
        )
        assert claim_response.status_code == 201

        claim_id = claim_response.json()["id"]

        confirmed = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/confirm",
            json={"amount_paid_minor": 15_000_00},
        )
        assert confirmed.status_code == 200

        current_invoice = await client.get(f"/invoices/{invoice['id']}")
        assert current_invoice.status_code == 200
        assert current_invoice.json()["status"] == "partially_paid"
        assert current_invoice.json()["amount_paid_minor"] == 15_000_00

        db_session.expire_all()

        jobs_result = await db_session.execute(
            select(ReminderJob).where(
                ReminderJob.invoice_id == invoice["id"],
            )
        )
        jobs = list(jobs_result.scalars().all())

        old_jobs = [job for job in jobs if job.cycle == 0]
        resumed_jobs = [job for job in jobs if job.cycle == 1]

        assert old_jobs
        assert all(job.status == "cancelled" for job in old_jobs)
        assert resumed_jobs
        assert all(job.status == "pending" for job in resumed_jobs)

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_claim_submission_records_claim_and_invoice_lifecycle_events(
    db_session,
):
    client, invoice = await setup_claimable_invoice()

    try:
        response = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": 10_000_00,
                "reference": "NIP/LIFECYCLE/001",
            },
        )

        assert response.status_code == 201, response.text
        claim_id = response.json()["id"]

        db_session.expire_all()

        claim_result = await db_session.execute(
            select(DocumentStatusEvent).where(
                DocumentStatusEvent.document_type == "payment_claim",
                DocumentStatusEvent.document_id == claim_id,
            )
        )
        claim_events = list(claim_result.scalars().all())

        assert len(claim_events) == 1

        claim_event = claim_events[0]
        assert claim_event.from_status is None
        assert claim_event.to_status == "pending"
        assert claim_event.actor_type == "client"
        assert claim_event.source == "client_payment_claim"
        assert claim_event.event_metadata["invoice_id"] == invoice["id"]
        assert claim_event.event_metadata["amount_minor"] == 10_000_00

        invoice_result = await db_session.execute(
            select(DocumentStatusEvent).where(
                DocumentStatusEvent.document_type == "invoice",
                DocumentStatusEvent.document_id == invoice["id"],
                DocumentStatusEvent.source == "client_payment_claim",
                DocumentStatusEvent.to_status == "payment_claimed",
            )
        )
        invoice_events = list(invoice_result.scalars().all())

        assert len(invoice_events) == 1

        invoice_event = invoice_events[0]
        assert invoice_event.actor_type == "client"
        assert invoice_event.event_metadata["claim_id"] == claim_id

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_confirmed_claim_records_lifecycle_transition(db_session):
    client, invoice = await setup_claimable_invoice()

    try:
        submitted = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": 10_000_00,
                "reference": "NIP/CLAIM-CONFIRM-EVENT",
            },
        )
        assert submitted.status_code == 201, submitted.text
        claim_id = submitted.json()["id"]

        current_user = await client.get("/auth/me")
        assert current_user.status_code == 200
        reviewer_id = current_user.json()["user"]["id"]

        confirmed = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/confirm",
            json={"amount_paid_minor": 10_000_00},
        )
        assert confirmed.status_code == 200, confirmed.text

        db_session.expire_all()

        result = await db_session.execute(
            select(DocumentStatusEvent).where(
                DocumentStatusEvent.document_type == "payment_claim",
                DocumentStatusEvent.document_id == claim_id,
            )
        )
        events = list(result.scalars().all())

        assert len(events) == 2

        confirmation = next(event for event in events if event.to_status == "confirmed")
        assert confirmation.from_status == "pending"
        assert confirmation.actor_type == "issuer"
        assert confirmation.actor_id == reviewer_id
        assert confirmation.source == "issuer_claim_confirmed"
        assert confirmation.event_metadata["invoice_id"] == invoice["id"]
        assert confirmation.event_metadata["claimed_amount_minor"] == 10_000_00
        assert confirmation.event_metadata["confirmed_amount_minor"] == 10_000_00

        audit_result = await db_session.execute(
            select(AuditEvent).where(
                AuditEvent.entity_type == "payment_claim",
                AuditEvent.entity_id == claim_id,
                AuditEvent.action == "payment_claim.confirmed",
            )
        )
        audit_events = list(audit_result.scalars().all())

        assert len(audit_events) == 1

        audit_event = audit_events[0]

        assert audit_event.workspace_id
        assert audit_event.actor_type == "user"
        assert audit_event.actor_id == reviewer_id
        assert audit_event.outcome == "success"

        assert audit_event.before_state["claim_status"] == "pending"
        assert audit_event.after_state["claim_status"] == "confirmed"
        assert audit_event.after_state["claimed_amount_minor"] == 10_000_00
        assert audit_event.after_state["confirmed_amount_minor"] == 10_000_00

        assert audit_event.metadata_json["invoice_id"] == invoice["id"]
        assert audit_event.metadata_json["currency"] == "NGN"

    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_rejected_claim_records_lifecycle_transition(db_session):
    client, invoice = await setup_claimable_invoice()

    try:
        submitted = await client.post(
            f"/share/{invoice['share_token']}/claim",
            json={
                "amount_minor": 10_000_00,
                "reference": "NIP/CLAIM-REJECT-EVENT",
            },
        )
        assert submitted.status_code == 201, submitted.text
        claim_id = submitted.json()["id"]

        current_user = await client.get("/auth/me")
        assert current_user.status_code == 200
        reviewer_id = current_user.json()["user"]["id"]

        reason = "The transfer could not be verified."

        rejected = await client.post(
            f"/invoices/{invoice['id']}/claims/{claim_id}/reject",
            json={"rejection_reason": reason},
        )
        assert rejected.status_code == 200, rejected.text

        db_session.expire_all()

        result = await db_session.execute(
            select(DocumentStatusEvent).where(
                DocumentStatusEvent.document_type == "payment_claim",
                DocumentStatusEvent.document_id == claim_id,
            )
        )
        events = list(result.scalars().all())

        assert len(events) == 2

        rejection = next(event for event in events if event.to_status == "rejected")
        assert rejection.from_status == "pending"
        assert rejection.actor_type == "issuer"
        assert rejection.actor_id == reviewer_id
        assert rejection.source == "issuer_claim_rejected"
        assert rejection.event_metadata["invoice_id"] == invoice["id"]
        assert rejection.event_metadata["reason"] == reason

        audit_result = await db_session.execute(
            select(AuditEvent).where(
                AuditEvent.entity_type == "payment_claim",
                AuditEvent.entity_id == claim_id,
                AuditEvent.action == "payment_claim.rejected",
            )
        )
        audit_events = list(audit_result.scalars().all())

        assert len(audit_events) == 1

        audit_event = audit_events[0]

        assert audit_event.workspace_id
        assert audit_event.actor_type == "user"
        assert audit_event.actor_id == reviewer_id
        assert audit_event.outcome == "success"

        assert audit_event.before_state["claim_status"] == "pending"
        assert audit_event.after_state["claim_status"] == "rejected"
        assert audit_event.after_state["claimed_amount_minor"] == 10_000_00

        assert audit_event.metadata_json["invoice_id"] == invoice["id"]
        assert audit_event.metadata_json["currency"] == "NGN"

        assert "reason" not in audit_event.metadata_json
        assert "rejection_reason" not in audit_event.metadata_json

    finally:
        await client.aclose()
