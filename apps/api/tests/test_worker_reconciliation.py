"""Email worker reconciliation and late-result guards."""

import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, update

from app.core.database import AsyncSessionLocal
from app.domains.invoices.models import Invoice
from app.domains.reminders.models import ReminderJob
from app.integrations.email_delivery import DeliveryOutcome, DeliveryResult
from app.integrations.email_models import EmailDeliveryAttempt, EmailOutbox
from app.jobs.worker import WORKER_ID, record_result
from app.main import app
from tests.helpers import create_sent_invoice, login_code_for


async def _auth(client: AsyncClient, monkeypatch) -> None:
    email = f"worker-{uuid.uuid4().hex[:8]}@example.com"
    await client.post("/auth/magic-link", json={"email": email})
    code = login_code_for(email)
    res = await client.post("/auth/verify", json={"email": email, "code": code})
    assert res.status_code == 200, res.text
    client.cookies.set("bagg_session", res.cookies["bagg_session"])


async def _create_client(client: AsyncClient) -> str:
    res = await client.post(
        "/clients",
        json={
            "name": "Worker Test Client",
            "email": f"client-{uuid.uuid4().hex[:8]}@example.com",
            "preferred_currency": "NGN",
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["id"]


async def _queued_invoice(
    client: AsyncClient,
    client_id: str,
    *,
    due_date: date | None = None,
) -> dict:
    payload = {
        "client_id": client_id,
        "currency": "NGN",
        "items": [
            {
                "description": "Worker reconciliation",
                "quantity": 1,
                "unit_price_minor": 500_000,
            }
        ],
    }
    if due_date is not None:
        payload["due_date"] = due_date.isoformat()

    created = await client.post("/invoices", json=payload)
    assert created.status_code == 201, created.text
    invoice = created.json()

    finalized = await client.post(f"/invoices/{invoice['id']}/finalize")
    assert finalized.status_code == 200, finalized.text

    sent = await client.post(
        f"/invoices/{invoice['id']}/send",
        json={"send_email": True},
    )
    assert sent.status_code == 200, sent.text
    return sent.json()["invoice"]


async def _message_for(aggregate_id: str, message_type: str) -> EmailOutbox:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(EmailOutbox).where(
                EmailOutbox.aggregate_id == aggregate_id,
                EmailOutbox.message_type == message_type,
            )
        )
        return result.scalar_one()


async def _claim(message_id: str) -> None:
    """Simulate the worker claiming a message before delivery."""
    async with AsyncSessionLocal() as session:
        message = await session.get(EmailOutbox, message_id)
        assert message is not None
        message.status = "processing"
        message.locked_by = WORKER_ID
        message.locked_at = datetime.now(timezone.utc)
        message.attempts = 1
        await session.commit()


async def _attempt_count(message_id: str) -> int:
    async with AsyncSessionLocal() as session:
        count = await session.execute(
            select(func.count(EmailDeliveryAttempt.id)).where(
                EmailDeliveryAttempt.outbox_id == message_id
            )
        )
        return int(count.scalar_one())


@pytest.mark.asyncio
async def test_document_email_terminal_state_is_immune_to_late_results(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await _auth(client, monkeypatch)
        client_id = await _create_client(client)
        invoice = await _queued_invoice(client, client_id)

        message = await _message_for(invoice["id"], "invoice_email")
        await _claim(message.id)

        await record_result(
            message.id,
            1,
            DeliveryResult(
                outcome=DeliveryOutcome.ACCEPTED,
                provider="smtp",
            ),
        )

        detail = await client.get(f"/invoices/{invoice['id']}")
        assert detail.json()["email_delivery_status"] == "delivered"

        # A late permanent result must not rewrite the terminal delivery or
        # record a second delivery attempt.
        await record_result(
            message.id,
            1,
            DeliveryResult(
                outcome=DeliveryOutcome.PERMANENT,
                provider="smtp",
                error_code="late_failure",
            ),
        )

        detail = await client.get(f"/invoices/{invoice['id']}")
        assert detail.json()["email_delivery_status"] == "delivered"
        assert await _attempt_count(message.id) == 1

        async with AsyncSessionLocal() as session:
            stored = await session.get(EmailOutbox, message.id)
            assert stored is not None
            assert stored.status == "sent"


@pytest.mark.asyncio
async def test_document_email_retryable_result_keeps_queued(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await _auth(client, monkeypatch)
        client_id = await _create_client(client)
        invoice = await _queued_invoice(client, client_id)

        message = await _message_for(invoice["id"], "invoice_email")
        await _claim(message.id)

        await record_result(
            message.id,
            1,
            DeliveryResult(
                outcome=DeliveryOutcome.RETRYABLE,
                provider="smtp",
                error_code="smtp_timeout",
            ),
        )

        detail = await client.get(f"/invoices/{invoice['id']}")
        assert detail.json()["email_delivery_status"] == "queued"

        async with AsyncSessionLocal() as session:
            stored = await session.get(EmailOutbox, message.id)
            assert stored is not None
            assert stored.status == "pending"
            assert stored.attempts == 1


@pytest.mark.asyncio
async def test_recall_supersedes_pending_email_and_blocks_resurrection(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await _auth(client, monkeypatch)
        client_id = await _create_client(client)
        invoice = await _queued_invoice(client, client_id)

        message = await _message_for(invoice["id"], "invoice_email")

        recalled = await client.post(
            f"/invoices/{invoice['id']}/recall",
            json={"reason": "Wrong amount"},
        )
        assert recalled.status_code == 200, recalled.text

        async with AsyncSessionLocal() as session:
            stored = await session.get(EmailOutbox, message.id)
            assert stored is not None
            assert stored.status == "superseded"
            assert stored.encrypted_payload is None

        detail = await client.get(f"/invoices/{invoice['id']}")
        assert detail.json()["email_delivery_status"] is None

        # Simulate the worker having claimed the message just before recall.
        # Its late result must not restore delivery state on the draft.
        await _claim(message.id)
        await record_result(
            message.id,
            1,
            DeliveryResult(
                outcome=DeliveryOutcome.ACCEPTED,
                provider="smtp",
            ),
        )

        detail = await client.get(f"/invoices/{invoice['id']}")
        assert detail.json()["email_delivery_status"] is None


@pytest.mark.asyncio
async def test_reissue_advances_issuance_generation(monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await _auth(client, monkeypatch)
        client_id = await _create_client(client)
        invoice = await _queued_invoice(client, client_id)

        async with AsyncSessionLocal() as session:
            stored = await session.get(Invoice, invoice["id"])
            assert stored is not None
            assert stored.issuance_generation == 1

        recalled = await client.post(
            f"/invoices/{invoice['id']}/recall",
            json={"reason": "Reissue at corrected amount"},
        )
        assert recalled.status_code == 200, recalled.text

        reissued = await client.post(f"/invoices/{invoice['id']}/finalize")
        assert reissued.status_code == 200, reissued.text

        async with AsyncSessionLocal() as session:
            stored = await session.get(Invoice, invoice["id"])
            assert stored is not None
            assert stored.issuance_generation == 2


@pytest.mark.asyncio
async def test_reminder_worker_outcomes_reconcile(monkeypatch):
    monkeypatch.setattr(
        "app.domains.reminders.router.settings.INTERNAL_JOB_TOKEN",
        "test-internal-token",
    )
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await _auth(client, monkeypatch)
        client_id = await _create_client(client)
        invoice = await create_sent_invoice(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "due_date": (date.today() + timedelta(days=5)).isoformat(),
                "items": [
                    {
                        "description": "Reminder reconciliation",
                        "quantity": 1,
                        "unit_price_minor": 500_000,
                    }
                ],
            },
        )

        jobs_res = await client.get(f"/reminders/invoices/{invoice['id']}")
        assert jobs_res.status_code == 200, jobs_res.text
        jobs = jobs_res.json()
        assert len(jobs) == 4
        target_jobs = jobs[:3]

        past_due = datetime.now(timezone.utc) - timedelta(days=3650)
        async with AsyncSessionLocal() as session:
            await session.execute(
                update(ReminderJob)
                .where(ReminderJob.id.in_([job["id"] for job in target_jobs]))
                .values(due_at=past_due)
            )
            await session.commit()

        proc_res = await client.post(
            "/reminders/process?limit=100",
            headers={"Authorization": "Bearer test-internal-token"},
        )
        assert proc_res.status_code == 200, proc_res.text

        outcomes = {
            target_jobs[0]["id"]: DeliveryOutcome.ACCEPTED,
            target_jobs[1]["id"]: DeliveryOutcome.RETRYABLE,
            target_jobs[2]["id"]: DeliveryOutcome.PERMANENT,
        }

        for job_id, outcome in outcomes.items():
            message = await _message_for(job_id, "invoice_reminder")
            await _claim(message.id)
            await record_result(
                message.id,
                1,
                DeliveryResult(
                    outcome=outcome,
                    provider="smtp",
                    error_code=(
                        None
                        if outcome == DeliveryOutcome.ACCEPTED
                        else "test_delivery_error"
                    ),
                ),
            )

        updated = await client.get(f"/reminders/invoices/{invoice['id']}")
        by_id = {job["id"]: job for job in updated.json()}

        accepted = by_id[target_jobs[0]["id"]]
        assert accepted["status"] == "sent"
        assert accepted["sent_at"] is not None

        retryable = by_id[target_jobs[1]["id"]]
        assert retryable["status"] == "queued"

        permanent = by_id[target_jobs[2]["id"]]
        assert permanent["status"] == "failed"
        assert permanent["error_message"] == "test_delivery_error"
