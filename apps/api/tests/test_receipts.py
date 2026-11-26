"""
Lifecycle 14: Downstream Receipts & Settlement Certificates

Tests:
- US-RCP-01: Automated stamped payment receipts
- US-RCP-02: Public client receipt portal and downloadable PDF receipt
- US-RCP-03: Client account settlement statement
"""

import uuid
from datetime import date, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.jobs.document_worker import claim_batch, process_job
from app.main import app
from tests.helpers import authenticate_test_user, create_sent_invoice


@pytest.mark.asyncio
async def test_receipts_full_lifecycle(monkeypatch):
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        # ---------------------------------------------------------
        # 1. Authenticate freelancer
        # ---------------------------------------------------------
        test_email = f"receipts-{uuid.uuid4().hex[:6]}@studio.ng"
        await authenticate_test_user(client, test_email)

        # ---------------------------------------------------------
        # 2. Create payment profile using step-up verification
        # ---------------------------------------------------------
        profile_payload = {
            "currency": "NGN",
            "bank_name": "Zenith Bank",
            "account_name": "Receipt Studio Ltd",
            "account_number": "9012345678",
            "is_default": True,
        }

        challenge_res = await client.post(
            "/security/step-up/request",
            json={
                "purpose": "payment_profile_create",
                "payload": profile_payload,
                "resource_type": "payment_profile",
            },
        )
        assert challenge_res.status_code == 202, challenge_res.text

        challenge = challenge_res.json()
        challenge_id = challenge["challenge_id"]

        verify_res = await client.post(
            "/security/step-up/verify",
            json={
                "challenge_id": challenge_id,
                "code": challenge["code"],
            },
        )
        assert verify_res.status_code == 200, verify_res.text

        profile_res = await client.post(
            "/payments/profiles",
            json=profile_payload,
            headers={
                "X-Security-Challenge-ID": challenge_id,
            },
        )
        assert profile_res.status_code == 201, profile_res.text

        # ---------------------------------------------------------
        # 3. Create client
        # ---------------------------------------------------------
        client_res = await client.post(
            "/clients",
            json={
                "name": "Abuja Holdings Inc",
                "email": "finance@abujaholdings.ng",
                "phone": "+2348011223344",
                "preferred_currency": "NGN",
                "default_payment_terms_days": 30,
            },
        )
        assert client_res.status_code == 201, client_res.text

        client_id = client_res.json()["id"]

        # ---------------------------------------------------------
        # 4. Create, finalize and send invoice 1
        # ---------------------------------------------------------
        inv1_data = await create_sent_invoice(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "due_date": str(date.today() + timedelta(days=30)),
                "items": [
                    {
                        "description": "Brand Strategy Workshop",
                        "quantity": 1,
                        "unit_price_minor": 500_000_00,
                    },
                ],
                "tax_rate_percent": 7.5,
            },
        )

        inv1_id = inv1_data["id"]
        inv1_total = inv1_data["total_minor"]

        # ---------------------------------------------------------
        # 5. US-RCP-01: Record first manual payment and create receipt
        # ---------------------------------------------------------
        rcp1_res = await client.post(
            f"/receipts/invoice/{inv1_id}",
            json={
                "amount_paid_minor": 250_000_00,
                "confirm_received": True,
                "payment_method": "bank_transfer",
                "reference": "TRF/2026/10/ABUJA001",
                "payer_name": "Abuja Holdings Finance Dept",
                "notes": "Milestone 1 deposit received.",
            },
        )
        assert rcp1_res.status_code == 201, rcp1_res.text

        rcp1 = rcp1_res.json()

        assert rcp1["receipt_number"] == "REC-0001"
        assert rcp1["sequence_number"] == 1
        assert rcp1["amount_paid_minor"] == 250_000_00
        assert rcp1["currency"] == "NGN"
        assert rcp1["payment_method"] == "bank_transfer"
        assert rcp1["reference"] == "TRF/2026/10/ABUJA001"
        assert rcp1["payer_name"] == "Abuja Holdings Finance Dept"
        assert rcp1["is_verified"] is True
        assert rcp1["verification_code"] is not None
        assert rcp1["verification_code"].startswith("BAGG-")
        assert rcp1["share_token"] is not None
        assert rcp1["share_url"] is not None
        assert "/r/" in rcp1["share_url"]
        assert rcp1["whatsapp_share_url"] is not None
        assert "wa.me" in rcp1["whatsapp_share_url"]
        assert rcp1["balance_remaining_minor"] == (inv1_total - 250_000_00)
        assert rcp1["client_name"] == "Abuja Holdings Inc"
        assert rcp1["invoice_number"].startswith("INV-")
        assert rcp1["bagg_reference"]

        # Invoice should now be partially paid.
        inv1_check = await client.get(f"/invoices/{inv1_id}")
        assert inv1_check.status_code == 200, inv1_check.text
        assert inv1_check.json()["status"] == "partially_paid"
        assert inv1_check.json()["amount_paid_minor"] == 250_000_00

        # ---------------------------------------------------------
        # 6. Record second payment completing the invoice
        # ---------------------------------------------------------
        remaining = inv1_total - 250_000_00

        rcp2_res = await client.post(
            f"/receipts/invoice/{inv1_id}",
            json={
                "amount_paid_minor": remaining,
                "confirm_received": True,
                "payment_method": "card",
                "reference": "CARD/2026/10/STRIPE002",
            },
        )
        assert rcp2_res.status_code == 201, rcp2_res.text

        rcp2 = rcp2_res.json()

        assert rcp2["receipt_number"] == "REC-0002"
        assert rcp2["balance_remaining_minor"] == 0

        # Invoice should now be fully paid.
        inv1_paid = await client.get(f"/invoices/{inv1_id}")
        assert inv1_paid.status_code == 200, inv1_paid.text
        assert inv1_paid.json()["status"] == "paid"

        # ---------------------------------------------------------
        # 7. List receipts
        # ---------------------------------------------------------
        list_res = await client.get("/receipts")
        assert list_res.status_code == 200, list_res.text

        receipts = list_res.json()["items"]
        assert len(receipts) == 2

        # Filter by invoice.
        filter_res = await client.get(f"/receipts?invoice_id={inv1_id}")
        assert filter_res.status_code == 200, filter_res.text
        assert len(filter_res.json()["items"]) == 2

        # ---------------------------------------------------------
        # 8. Retrieve receipt detail
        # ---------------------------------------------------------
        detail_res = await client.get(f"/receipts/{rcp1['id']}")
        assert detail_res.status_code == 200, detail_res.text
        assert detail_res.json()["receipt_number"] == "REC-0001"

        # ---------------------------------------------------------
        # 9. US-RCP-02: Generate immutable receipt PDF
        #
        # Use in-memory storage for this test. The real renderer,
        # worker, artifact service, database records and PDF delivery
        # endpoint are still exercised.
        # ---------------------------------------------------------
        class InMemoryDocumentStorage:
            _objects: dict[str, bytes] = {}

            def put_if_absent(
                self,
                *,
                key: str,
                content: bytes,
                content_type: str = "application/pdf",
            ):
                existing = self._objects.get(key)

                if existing is not None:
                    if existing != content:
                        raise RuntimeError(
                            "Immutable document already exists "
                            "with different content"
                        )
                    return

                self._objects[key] = content

            def get(self, key: str) -> bytes:
                if key not in self._objects:
                    raise FileNotFoundError(key)

                return self._objects[key]

        InMemoryDocumentStorage._objects.clear()

        monkeypatch.setattr(
            "app.domains.documents.artifacts.service.S3DocumentStorage",
            InMemoryDocumentStorage,
        )

        from datetime import datetime, timezone

        from sqlalchemy import select

        from app.core.database import AsyncSessionLocal
        from app.domains.documents.models import DocumentGenerationJob
        from app.core.config import settings

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(DocumentGenerationJob).where(
                    DocumentGenerationJob.document_type == "receipt",
                    DocumentGenerationJob.source_id == rcp1["id"],
                )
            )
            target = result.scalar_one()

            print("WORKER NOW:", datetime.now(timezone.utc))
            print("BATCH SIZE:", settings.DOCUMENT_WORKER_BATCH_SIZE)
            print(
                "TARGET JOB:",
                {
                    "id": target.id,
                    "status": target.status,
                    "attempts": target.attempts,
                    "available_at": target.available_at,
                    "created_at": target.created_at,
                    "locked_at": target.locked_at,
                    "locked_by": target.locked_by,
                    "claim_token": target.claim_token,
                },
            )

            result = await db.execute(
                select(DocumentGenerationJob)
                .where(
                    DocumentGenerationJob.status == "pending",
                    DocumentGenerationJob.available_at <= datetime.now(timezone.utc),
                )
                .order_by(
                    DocumentGenerationJob.available_at.asc(),
                    DocumentGenerationJob.created_at.asc(),
                )
                .limit(settings.DOCUMENT_WORKER_BATCH_SIZE + 5)
            )

            print(
                "ELIGIBLE QUEUE:",
                [
                    {
                        "id": job.id,
                        "type": job.document_type,
                        "source_id": job.source_id,
                        "available_at": job.available_at,
                    }
                    for job in result.scalars().all()
                ],
            )

        # Run the actual document worker against queued jobs.
        # The worker consumes a shared queue, so unrelated eligible jobs
        # may occupy earlier batches.
        target_job_id = target.id

        target_status = None
        target_attempts = 0

        for batch_number in range(1, 101):
            claims = await claim_batch()

            assert claims, (
                f"No eligible document jobs found before receipt job "
                f"{target_job_id} was processed. Batch: {batch_number}"
            )

            claimed_ids = [claim.job_id for claim in claims]

            print(
                f"DOCUMENT WORKER BATCH {batch_number}:",
                claimed_ids,
            )

            for claim in claims:
                await process_job(claim)

            async with AsyncSessionLocal() as db:
                refreshed = await db.get(
                    DocumentGenerationJob,
                    target_job_id,
                )

                assert refreshed is not None

                target_status = refreshed.status
                target_attempts = refreshed.attempts

            print(
                "RECEIPT JOB STATE:",
                {
                    "id": target_job_id,
                    "status": target_status,
                    "attempts": target_attempts,
                },
            )

            if target_status in {"succeeded", "failed"}:
                break

        assert target_status == "succeeded", (
            f"Receipt generation did not succeed. "
            f"Job: {target_job_id}, "
            f"status: {target_status}, "
            f"attempts: {target_attempts}"
        )

        # Confirm that the receipt generation job succeeded.
        generation_res = await client.get(f"/documents/receipt/{rcp1['id']}/status")
        assert generation_res.status_code == 200, generation_res.text

        generation = generation_res.json()

        assert generation["status"] == "succeeded", (
            "Receipt PDF generation failed. " f"Worker status: {generation}"
        )

        assert generation["artifact_id"] is not None

        # Retrieve the generated PDF.
        pdf_res = await client.get(f"/receipts/{rcp1['id']}/pdf")

        assert pdf_res.status_code == 200, pdf_res.text
        assert "application/pdf" in pdf_res.headers["content-type"]
        assert pdf_res.content.startswith(b"%PDF-")

        # ---------------------------------------------------------
        # 10. US-RCP-02: Public client receipt portal
        # ---------------------------------------------------------
        receipt_token = rcp1["share_token"]

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as anon_client:
            pub_res = await anon_client.get(f"/receipts/share/{receipt_token}")
            assert pub_res.status_code == 200, pub_res.text

            public_receipt = pub_res.json()

            assert public_receipt["receipt_number"] == "REC-0001"
            assert public_receipt["is_verified"] is True
            assert public_receipt["verification_code"].startswith("BAGG-")
            assert public_receipt["business_name"] is not None
            assert public_receipt["amount_paid_minor"] == 250_000_00
            assert public_receipt["client_name"] == "Abuja Holdings Inc"

        # ---------------------------------------------------------
        # 11. US-RCP-01: Auto-receipt on payment claim confirmation
        # ---------------------------------------------------------
        inv2_data = await create_sent_invoice(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [
                    {
                        "description": "Social Media Campaign Q4",
                        "quantity": 1,
                        "unit_price_minor": 200_000_00,
                    },
                ],
            },
        )

        inv2_id = inv2_data["id"]
        inv2_token = inv2_data["share_token"]

        # Client submits an "I've Paid" claim through the public route.
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as anon_client:
            claim_res = await anon_client.post(
                f"/share/{inv2_token}/claim",
                json={
                    "amount_minor": 200_000_00,
                    "payment_date": str(date.today()),
                    "reference": "FLW-TRF-123456789",
                },
            )
            assert claim_res.status_code == 201, claim_res.text
            claim_data = claim_res.json()

        # Freelancer confirms the claim.
        confirm_res = await client.post(
            f"/invoices/{inv2_id}/claims/{claim_data['id']}/confirm"
        )
        assert confirm_res.status_code == 200, confirm_res.text
        assert confirm_res.json()["status"] == "confirmed"

        # Verify the automatic receipt.
        auto_receipts_res = await client.get(f"/receipts?invoice_id={inv2_id}")
        assert auto_receipts_res.status_code == 200, auto_receipts_res.text

        auto_receipts = auto_receipts_res.json()["items"]

        assert len(auto_receipts) == 1
        assert auto_receipts[0]["receipt_number"] == "REC-0003"
        assert auto_receipts[0]["amount_paid_minor"] == 200_000_00
        assert auto_receipts[0]["payment_claim_id"] == claim_data["id"]
        assert auto_receipts[0]["reference"] == "FLW-TRF-123456789"
        assert auto_receipts[0]["is_verified"] is True

        # Invoice 2 should be fully paid.
        inv2_final = await client.get(f"/invoices/{inv2_id}")
        assert inv2_final.status_code == 200, inv2_final.text
        assert inv2_final.json()["status"] == "paid"


@pytest.mark.asyncio
async def test_client_settlement_statement():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        # ---------------------------------------------------------
        # 1. Authenticate
        # ---------------------------------------------------------
        test_email = f"statement-{uuid.uuid4().hex[:6]}@studio.ng"
        await authenticate_test_user(client, test_email)

        # ---------------------------------------------------------
        # 2. Create client
        # ---------------------------------------------------------
        client_res = await client.post(
            "/clients",
            json={
                "name": "Lagos Ventures Ltd",
                "preferred_currency": "NGN",
            },
        )
        assert client_res.status_code == 201, client_res.text

        client_id = client_res.json()["id"]

        # ---------------------------------------------------------
        # 3. Create invoice 1 and record partial payment
        # ---------------------------------------------------------
        inv1_data = await create_sent_invoice(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "due_date": str(date.today() + timedelta(days=30)),
                "items": [
                    {
                        "description": "Consulting Sprint 1",
                        "quantity": 1,
                        "unit_price_minor": 300_000_00,
                    },
                ],
            },
        )

        inv1_id = inv1_data["id"]

        receipt1_res = await client.post(
            f"/receipts/invoice/{inv1_id}",
            json={
                "amount_paid_minor": 150_000_00,
                "confirm_received": True,
                "payment_method": "bank_transfer",
                "reference": "TRF/1",
            },
        )
        assert receipt1_res.status_code == 201, receipt1_res.text

        # ---------------------------------------------------------
        # 4. Create invoice 2 and record full payment
        # ---------------------------------------------------------
        inv2_data = await create_sent_invoice(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [
                    {
                        "description": "Consulting Sprint 2",
                        "quantity": 1,
                        "unit_price_minor": 200_000_00,
                    },
                ],
            },
        )

        inv2_id = inv2_data["id"]

        receipt2_res = await client.post(
            f"/receipts/invoice/{inv2_id}",
            json={
                "amount_paid_minor": 200_000_00,
                "confirm_received": True,
                "payment_method": "mobile_money",
                "reference": "MOMO/2",
            },
        )
        assert receipt2_res.status_code == 201, receipt2_res.text

        # ---------------------------------------------------------
        # 5. US-RCP-03: Retrieve statement of account
        # ---------------------------------------------------------
        stmt_res = await client.get(f"/receipts/statement/{client_id}?currency=NGN")
        assert stmt_res.status_code == 200, stmt_res.text

        statement = stmt_res.json()

        assert statement["client_name"] == "Lagos Ventures Ltd"
        assert statement["currency"] == "NGN"
        assert statement["business_name"] is not None

        # Two invoices and two receipts.
        assert len(statement["entries"]) == 4

        # Verify debit and credit entry types.
        debits = [entry for entry in statement["entries"] if entry["type"] == "invoice"]
        credits = [
            entry for entry in statement["entries"] if entry["type"] == "receipt"
        ]

        assert len(debits) == 2
        assert len(credits) == 2

        # Verify totals.
        assert statement["total_invoiced_minor"] == (300_000_00 + 200_000_00)
        assert statement["total_paid_minor"] == (150_000_00 + 200_000_00)
        assert statement["closing_balance_minor"] == 150_000_00

        # ---------------------------------------------------------
        # 6. Verify running balance
        # ---------------------------------------------------------
        running = 0

        for entry in statement["entries"]:
            running += entry["debit_minor"] - entry["credit_minor"]
            assert entry["running_balance_minor"] == running

        assert running == statement["closing_balance_minor"]

        # ---------------------------------------------------------
        # 7. Verify date filter
        # ---------------------------------------------------------
        tomorrow = date.today() + timedelta(days=1)

        filtered_res = await client.get(
            f"/receipts/statement/{client_id}" f"?currency=NGN&date_from={tomorrow}"
        )
        assert filtered_res.status_code == 200, filtered_res.text
        assert len(filtered_res.json()["entries"]) == 0
