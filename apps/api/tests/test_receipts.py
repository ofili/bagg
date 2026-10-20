"""
Lifecycle 14: Downstream Receipts & Settlement Certificates
Tests: US-RCP-01 (Automated Stamped Payment Receipts),
       US-RCP-02 (Public Client Receipt Portal & Downloadable PDF Receipt),
       US-RCP-03 (Client Account Settlement Statement)
"""
import uuid
import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_receipts_full_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # --- 1. Authenticate Freelancer ---
        test_email = f"receipts-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # --- 2. Setup Payment Profile ---
        pp = await client.post("/payments/profiles", json={
            "currency": "NGN",
            "bank_name": "Zenith Bank",
            "account_name": "Receipt Studio Ltd",
            "account_number": "9012345678",
            "is_default": True,
        })
        assert pp.status_code == 201

        # --- 3. Setup Client ---
        cl_res = await client.post("/clients", json={
            "name": "Abuja Holdings Inc",
            "email": "finance@abujaholdings.ng",
            "phone": "+2348011223344",
            "preferred_currency": "NGN",
            "default_payment_terms_days": 30,
        })
        assert cl_res.status_code == 201
        client_id = cl_res.json()["id"]

        # --- 4. Create & Send Invoice 1 (for manual receipt) ---
        inv1 = await client.post("/invoices", json={
            "client_id": client_id,
            "currency": "NGN",
            "due_date": str(date.today() + timedelta(days=30)),
            "items": [
                {"description": "Brand Strategy Workshop", "quantity": 1, "unit_price_minor": 500_000_00},
            ],
            "tax_rate_percent": 7.5,
        })
        assert inv1.status_code == 201
        inv1_data = inv1.json()
        inv1_id = inv1_data["id"]
        inv1_total = inv1_data["total_minor"]  # 500k + 7.5% tax = 537,500

        send1 = await client.post(f"/invoices/{inv1_id}/send")
        assert send1.status_code == 200

        # --- 5. US-RCP-01: Manual Payment Recording & Auto Receipt ---
        rcp1_res = await client.post(f"/receipts/invoice/{inv1_id}", json={
            "amount_paid_minor": 250_000_00,
            "payment_method": "bank_transfer",
            "reference": "TRF/2026/10/ABUJA001",
            "payer_name": "Abuja Holdings Finance Dept",
            "notes": "Milestone 1 deposit received.",
        })
        assert rcp1_res.status_code == 201
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
        assert rcp1["balance_remaining_minor"] == inv1_total - 250_000_00
        assert rcp1["client_name"] == "Abuja Holdings Inc"
        assert rcp1["invoice_number"].startswith("INV-")

        # Invoice should now be partially_paid
        inv1_check = await client.get(f"/invoices/{inv1_id}")
        assert inv1_check.status_code == 200
        assert inv1_check.json()["status"] == "partially_paid"
        assert inv1_check.json()["amount_paid_minor"] == 250_000_00

        # --- 6. Record second payment completing full payment ---
        remaining = inv1_total - 250_000_00
        rcp2_res = await client.post(f"/receipts/invoice/{inv1_id}", json={
            "amount_paid_minor": remaining,
            "payment_method": "card",
            "reference": "CARD/2026/10/STRIPE002",
        })
        assert rcp2_res.status_code == 201
        rcp2 = rcp2_res.json()
        assert rcp2["receipt_number"] == "REC-0002"
        assert rcp2["balance_remaining_minor"] == 0

        # Invoice should now be fully paid
        inv1_paid = await client.get(f"/invoices/{inv1_id}")
        assert inv1_paid.status_code == 200
        assert inv1_paid.json()["status"] == "paid"

        # --- 7. List Receipts ---
        list_res = await client.get("/receipts")
        assert list_res.status_code == 200
        receipts = list_res.json()
        assert len(receipts) == 2

        # Filter by invoice
        filter_res = await client.get(f"/receipts?invoice_id={inv1_id}")
        assert filter_res.status_code == 200
        assert len(filter_res.json()) == 2

        # --- 8. Get Single Receipt Detail ---
        detail_res = await client.get(f"/receipts/{rcp1['id']}")
        assert detail_res.status_code == 200
        assert detail_res.json()["receipt_number"] == "REC-0001"

        # --- 9. US-RCP-02: Downloadable PDF/HTML Receipt ---
        pdf_res = await client.get(f"/receipts/{rcp1['id']}/pdf")
        assert pdf_res.status_code == 200
        assert "text/html" in pdf_res.headers["content-type"]
        html_content = pdf_res.text
        assert "PAID &amp; VERIFIED" in html_content or "PAID & VERIFIED" in html_content
        assert rcp1["receipt_number"] in html_content
        assert rcp1["verification_code"] in html_content

        # --- 10. US-RCP-02: Public Client Receipt Portal (zero-account) ---
        receipt_token = rcp1["share_token"]
        async with AsyncClient(transport=transport, base_url="http://test") as anon_client:
            pub_res = await anon_client.get(f"/receipts/share/{receipt_token}")
            assert pub_res.status_code == 200
            pub = pub_res.json()
            assert pub["receipt_number"] == "REC-0001"
            assert pub["is_verified"] is True
            assert pub["verification_code"].startswith("BAGG-")
            assert pub["business_name"] is not None
            assert pub["amount_paid_minor"] == 250_000_00
            assert pub["client_name"] == "Abuja Holdings Inc"

        # --- 11. US-RCP-01: Auto-Receipt on Payment Claim Confirmation ---
        # Create a second invoice and use the claim → confirm → auto-receipt path
        inv2 = await client.post("/invoices", json={
            "client_id": client_id,
            "currency": "NGN",
            "due_date": str(date.today() + timedelta(days=14)),
            "items": [
                {"description": "Social Media Campaign Q4", "quantity": 1, "unit_price_minor": 200_000_00},
            ],
        })
        assert inv2.status_code == 201
        inv2_data = inv2.json()
        inv2_id = inv2_data["id"]

        send2 = await client.post(f"/invoices/{inv2_id}/send")
        assert send2.status_code == 200
        inv2_token = send2.json()["invoice"]["share_token"]

        # Client submits "I've Paid" claim via public portal
        async with AsyncClient(transport=transport, base_url="http://test") as anon_client:
            claim_res = await anon_client.post(f"/share/{inv2_token}/claim", json={
                "amount_minor": 200_000_00,
                "payment_date": str(date.today()),
                "reference": "FLW-TRF-123456789",
            })
            assert claim_res.status_code == 201
            claim_data = claim_res.json()

        # Freelancer confirms the payment claim — should auto-create receipt
        confirm_res = await client.post(
            f"/invoices/{inv2_id}/claims/{claim_data['id']}/confirm"
        )
        assert confirm_res.status_code == 200
        assert confirm_res.json()["status"] == "confirmed"

        # Verify auto-receipt was created
        auto_receipts = await client.get(f"/receipts?invoice_id={inv2_id}")
        assert auto_receipts.status_code == 200
        auto_rcp = auto_receipts.json()
        assert len(auto_rcp) == 1
        assert auto_rcp[0]["receipt_number"] == "REC-0003"
        assert auto_rcp[0]["amount_paid_minor"] == 200_000_00
        assert auto_rcp[0]["payment_claim_id"] == claim_data["id"]
        assert auto_rcp[0]["reference"] == "FLW-TRF-123456789"
        assert auto_rcp[0]["is_verified"] is True

        # Invoice 2 should be fully paid
        inv2_final = await client.get(f"/invoices/{inv2_id}")
        assert inv2_final.json()["status"] == "paid"


@pytest.mark.asyncio
async def test_client_settlement_statement():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # --- Auth ---
        test_email = f"statement-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # --- Client ---
        cl_res = await client.post("/clients", json={
            "name": "Lagos Ventures Ltd",
            "preferred_currency": "NGN",
        })
        client_id = cl_res.json()["id"]

        # --- Create Invoice 1, send it, record partial payment ---
        inv1 = await client.post("/invoices", json={
            "client_id": client_id,
            "currency": "NGN",
            "due_date": str(date.today() + timedelta(days=30)),
            "items": [
                {"description": "Consulting Sprint 1", "quantity": 1, "unit_price_minor": 300_000_00},
            ],
        })
        inv1_id = inv1.json()["id"]
        await client.post(f"/invoices/{inv1_id}/send")

        await client.post(f"/receipts/invoice/{inv1_id}", json={
            "amount_paid_minor": 150_000_00,
            "payment_method": "bank_transfer",
            "reference": "TRF/1",
        })

        # --- Create Invoice 2, send it, pay in full ---
        inv2 = await client.post("/invoices", json={
            "client_id": client_id,
            "currency": "NGN",
            "due_date": str(date.today() + timedelta(days=14)),
            "items": [
                {"description": "Consulting Sprint 2", "quantity": 1, "unit_price_minor": 200_000_00},
            ],
        })
        inv2_id = inv2.json()["id"]
        await client.post(f"/invoices/{inv2_id}/send")

        await client.post(f"/receipts/invoice/{inv2_id}", json={
            "amount_paid_minor": 200_000_00,
            "payment_method": "mobile_money",
            "reference": "MOMO/2",
        })

        # --- US-RCP-03: Statement of Account ---
        stmt_res = await client.get(f"/receipts/statement/{client_id}?currency=NGN")
        assert stmt_res.status_code == 200
        stmt = stmt_res.json()

        assert stmt["client_name"] == "Lagos Ventures Ltd"
        assert stmt["currency"] == "NGN"
        assert stmt["business_name"] is not None

        # Should have 4 entries: 2 invoices + 2 receipts
        assert len(stmt["entries"]) == 4

        # Verify debit/credit types
        debits = [e for e in stmt["entries"] if e["type"] == "invoice"]
        credits = [e for e in stmt["entries"] if e["type"] == "receipt"]
        assert len(debits) == 2
        assert len(credits) == 2

        # Verify totals
        assert stmt["total_invoiced_minor"] == 300_000_00 + 200_000_00  # 500k total billed
        assert stmt["total_paid_minor"] == 150_000_00 + 200_000_00      # 350k total paid
        assert stmt["closing_balance_minor"] == 150_000_00               # 150k outstanding

        # Running balance should accumulate correctly
        # Entry order: inv1 debit (+300k) → rcp1 credit (-150k) → inv2 debit (+200k) → rcp2 credit (-200k)
        # Or entries are chronologically sorted by date then created_at
        running = 0
        for entry in stmt["entries"]:
            running += entry["debit_minor"] - entry["credit_minor"]
            assert entry["running_balance_minor"] == running

        assert running == stmt["closing_balance_minor"]

        # Test date filter
        tomorrow = date.today() + timedelta(days=1)
        filtered = await client.get(
            f"/receipts/statement/{client_id}?currency=NGN&date_from={tomorrow}"
        )
        assert filtered.status_code == 200
        assert len(filtered.json()["entries"]) == 0
