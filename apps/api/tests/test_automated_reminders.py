import uuid
from datetime import date, timedelta, datetime, timezone
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select, update
from app.main import app
from app.core.database import AsyncSessionLocal
from app.domains.reminders.models import ReminderJob
from tests.helpers import create_sent_invoice


@pytest.mark.asyncio
async def test_automated_reminders_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 0: Auth & Workspace Setup
        test_email = f"creator-{uuid.uuid4().hex[:6]}@chasing.design"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        assert req_res.status_code == 200
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # Setup Client with email and phone
        c_res = await client.post(
            "/clients",
            json={
                "name": "Abuja Tech Labs",
                "email": "invoicing@abujatech.ng",
                "phone": "+234 809 111 2233",
                "preferred_currency": "NGN",
            },
        )
        client_id = c_res.json()["id"]

        # 1. Create, Finalize and Send Invoice (due in 5 days) (US-INV-04, US-DEL-01)
        due_date = date.today() + timedelta(days=5)
        inv = await create_sent_invoice(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "due_date": due_date.isoformat(),
                "items": [
                    {"description": "Backend System Architecture", "quantity": 1, "unit_price_minor": 15000000},
                ],
            },
        )
        inv_id = inv["id"]
        token = inv["share_token"]

        # Verify reminder jobs scheduled (US-REM-01)
        reminders_res = await client.get(f"/reminders/invoices/{inv_id}")
        assert reminders_res.status_code == 200
        jobs = reminders_res.json()
        assert len(jobs) == 4

        job_types = {j["reminder_type"] for j in jobs}
        assert job_types == {"upcoming_3d", "due_today", "overdue_3d", "overdue_7d"}
        for j in jobs:
            assert j["status"] == "pending"
            assert j["attempts"] == 0

        # 2. Test SKIP LOCKED worker claiming (US-REM-03)
        # Force one job to be due in the past
        target_job_id = jobs[0]["id"]
        past_due = datetime.now(timezone.utc) - timedelta(days=1)

        async with AsyncSessionLocal() as session:
            await session.execute(
                update(ReminderJob)
                .where(ReminderJob.id == target_job_id)
                .values(due_at=past_due)
            )
            await session.commit()

        # Trigger worker process
        proc_res = await client.post("/reminders/process?limit=10")
        assert proc_res.status_code == 200
        proc_data = proc_res.json()
        assert proc_data["processed_count"] >= 1

        # Verify target job is now 'sent'
        updated_reminders = await client.get(f"/reminders/invoices/{inv_id}")
        sent_jobs = [j for j in updated_reminders.json() if j["id"] == target_job_id]
        assert len(sent_jobs) == 1
        assert sent_jobs[0]["status"] == "sent"
        assert sent_jobs[0]["sent_at"] is not None

        # 3. Test 1-Tap WhatsApp Nudge (US-REM-02)
        nudge_res = await client.get(f"/reminders/invoices/{inv_id}/nudge/whatsapp")
        assert nudge_res.status_code == 200
        nudge_data = nudge_res.json()
        assert "wa.me/2348091112233" in nudge_data["whatsapp_url"]
        assert "Abuja%20Tech%20Labs" in nudge_data["whatsapp_url"]
        assert nudge_data["client_name"] == "Abuja Tech Labs"
        assert inv["invoice_number"] in nudge_data["whatsapp_url"]

        # 4. Test Auto-Stop Guarantee (US-REM-01)
        # Client submits payment claim -> all remaining pending jobs MUST be cancelled immediately
        claim_res = await client.post(
            f"/share/{token}/claim",
            json={
                "amount_minor": 15000000,
                "reference": "NIP/REF/AUTO_STOP_TEST",
            },
        )
        assert claim_res.status_code == 201

        # Check that remaining pending reminder jobs are now 'cancelled'
        final_reminders = await client.get(f"/reminders/invoices/{inv_id}")
        final_jobs = final_reminders.json()
        for j in final_jobs:
            if j["id"] != target_job_id:  # Non-sent jobs
                assert j["status"] == "cancelled"
