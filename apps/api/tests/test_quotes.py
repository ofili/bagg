"""
Lifecycle 13: Upstream Quotes, Estimates & 1-Click Conversion
Tests: US-QOT-01 (Quote Drafting, Expiration Dates & Minor Math),
       US-QOT-02 (Public Quote Portal & Client Online Acceptance),
       US-QOT-03 (1-Click Convert Accepted Quote to Invoice)
"""
import uuid
import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_quotes_full_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # --- 1. Authenticate Freelancer ---
        test_email = f"quotes-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # --- 2. Setup Client ---
        cl_res = await client.post("/clients", json={
            "name": "Zenith Media Ltd",
            "email": "procurement@zenithmedia.ng",
            "phone": "+2348099887766",
            "preferred_currency": "NGN",
            "default_payment_terms_days": 14,
        })
        assert cl_res.status_code == 201
        client_data = cl_res.json()
        client_id = client_data["id"]

        # --- 3. US-QOT-01: Draft Quote 1 (Minor math, WHT, Deposit, Expiration) ---
        quote_payload = {
            "client_id": client_id,
            "currency": "NGN",
            "validity_days": 14,
            "items": [
                {"description": "Brand Strategy Blueprint", "quantity": 1, "unit_price_minor": 500_000_00},  # 500,000 NGN
                {"description": "Identity Guidelines Book", "quantity": 2, "unit_price_minor": 150_000_00},  # 300,000 NGN
            ],
            "discount_minor": 50_000_00,       # 50,000 NGN discount -> subtotal 800k - 50k = 750k
            "tax_rate_percent": 7.5,           # 7.5% VAT on 750k = 56,250 NGN -> gross total = 806,250 NGN
            "wht_rate_percent": 5.0,           # 5% WHT on 750k = 37,500 NGN -> net payable = 768,750 NGN
            "deposit_percentage": 50.0,        # 50% upfront deposit on net payable = 384,375 NGN
            "notes": "Deliverables will be completed in 3 weekly sprints upon deposit receipt.",
        }

        q1_res = await client.post("/quotes", json=quote_payload)
        assert q1_res.status_code == 201
        q1 = q1_res.json()

        assert q1["quote_number"] == "QOT-0001"
        assert q1["sequence_number"] == 1
        assert q1["status"] == "draft"
        assert q1["is_expired"] is False
        assert q1["subtotal_minor"] == 800_000_00
        assert q1["discount_minor"] == 50_000_00
        assert q1["tax_minor"] == 56_250_00
        assert q1["total_minor"] == 806_250_00
        assert q1["wht_minor"] == 37_500_00
        assert q1["net_payable_minor"] == 768_750_00
        assert q1["deposit_amount_minor"] == 384_375_00
        assert len(q1["items"]) == 2
        assert q1["client_name"] == "Zenith Media Ltd"
        assert q1["expires_at"] == str(date.today() + timedelta(days=14))

        # --- 4. Sequential Numbering: Draft Quote 2 ---
        q2_res = await client.post("/quotes", json={
            "client_id": client_id,
            "currency": "NGN",
            "items": [{"description": "Website Redesign", "quantity": 1, "unit_price_minor": 1_000_000_00}],
        })
        assert q2_res.status_code == 201
        q2 = q2_res.json()
        assert q2["quote_number"] == "QOT-0002"
        assert q2["sequence_number"] == 2

        # --- 5. Update Quote in Draft Status ---
        patch_res = await client.patch(f"/quotes/{q1['id']}", json={
            "notes": "Updated terms: 2 weekly sprints.",
            "discount_minor": 0,
        })
        assert patch_res.status_code == 200
        patched = patch_res.json()
        assert patched["notes"] == "Updated terms: 2 weekly sprints."
        assert patched["discount_minor"] == 0
        # Discount removed -> subtotal = 800k, tax = 7.5% of 800k = 60,000, total = 860,000, WHT = 5% of 800k = 40,000, net = 820,000
        assert patched["subtotal_minor"] == 800_000_00
        assert patched["tax_minor"] == 60_000_00
        assert patched["total_minor"] == 860_000_00
        assert patched["wht_minor"] == 40_000_00
        assert patched["net_payable_minor"] == 820_000_00

        # --- 6. Send Quote 1 (US-QOT-01 / US-QOT-02) ---
        send_res = await client.post(f"/quotes/{q1['id']}/send")
        assert send_res.status_code == 200
        send_data = send_res.json()
        assert send_data["status"] == "sent"
        assert send_data["share_token"] is not None
        assert "/q/" in send_data["share_url"]
        assert "wa.me" in send_data["whatsapp_share_url"]
        token1 = send_data["share_token"]

        # --- 7. List Quotes with Filters ---
        list_res = await client.get("/quotes?status=sent")
        assert list_res.status_code == 200
        sent_quotes = list_res.json()
        assert len(sent_quotes) == 1
        assert sent_quotes[0]["id"] == q1["id"]

        list_all = await client.get("/quotes")
        assert list_all.status_code == 200
        assert len(list_all.json()) == 2

        # --- 8. US-QOT-02: Public Portal View (Zero-Account Payer) ---
        # An unauthenticated client views the quote
        async with AsyncClient(transport=transport, base_url="http://test") as anon_client:
            pub_res = await anon_client.get(f"/quotes/share/{token1}")
            assert pub_res.status_code == 200
            pub = pub_res.json()
            # Must auto-mark as viewed
            assert pub["status"] == "viewed"
            assert pub["viewed_at"] is not None
            assert pub["business_name"] is not None
            assert len(pub["items"]) == 2

            # --- 9. US-QOT-02: Online Acceptance ---
            accept_res = await anon_client.post(f"/quotes/share/{token1}/accept", json={
                "accepted_by_name": "Amara Okonkwo",
            })
            assert accept_res.status_code == 200
            accepted_data = accept_res.json()
            assert accepted_data["status"] == "accepted"
            assert accepted_data["accepted_by_name"] == "Amara Okonkwo"
            assert accepted_data["accepted_at"] is not None

        # --- 10. Check Quote Status on Freelancer Side ---
        q1_check = await client.get(f"/quotes/{q1['id']}")
        assert q1_check.status_code == 200
        assert q1_check.json()["status"] == "accepted"
        assert q1_check.json()["accepted_by_name"] == "Amara Okonkwo"

        # --- 11. Cannot edit an accepted quote ---
        fail_edit = await client.patch(f"/quotes/{q1['id']}", json={"notes": "Illegal edit"})
        assert fail_edit.status_code == 400

        # --- 12. US-QOT-03: 1-Click Convert Accepted Quote to Invoice ---
        conv_res = await client.post(f"/quotes/{q1['id']}/convert")
        assert conv_res.status_code == 200
        created_invoice = conv_res.json()

        assert created_invoice["invoice_number"].startswith("INV-")
        assert created_invoice["client_id"] == client_id
        assert created_invoice["subtotal_minor"] == 800_000_00
        assert created_invoice["tax_minor"] == 60_000_00
        assert created_invoice["total_minor"] == 860_000_00
        assert created_invoice["wht_minor"] == 40_000_00
        assert created_invoice["net_payable_minor"] == 820_000_00
        assert len(created_invoice["items"]) == 2
        assert created_invoice["status"] == "draft"

        # --- 13. Verify Quote is marked as converted and linked ---
        q1_final = await client.get(f"/quotes/{q1['id']}")
        assert q1_final.json()["status"] == "converted"
        assert q1_final.json()["invoice_id"] == created_invoice["id"]

        # --- 14. Cannot convert a quote twice ---
        conv_again = await client.post(f"/quotes/{q1['id']}/convert")
        assert conv_again.status_code == 400
        assert "already been converted" in conv_again.json()["detail"]


@pytest.mark.asyncio
async def test_quote_decline_and_expiration():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Auth
        test_email = f"quotes2-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # Setup Client
        cl_res = await client.post("/clients", json={"name": "Kano Traders Ltd"})
        client_id = cl_res.json()["id"]

        # --- Quote Decline Flow ---
        q_res = await client.post("/quotes", json={
            "client_id": client_id,
            "currency": "NGN",
            "items": [{"description": "Billboard Campaign", "quantity": 1, "unit_price_minor": 2_000_000_00}],
        })
        q_data = q_res.json()
        send_res = await client.post(f"/quotes/{q_data['id']}/send")
        token = send_res.json()["share_token"]

        async with AsyncClient(transport=transport, base_url="http://test") as anon_client:
            decline_res = await anon_client.post(f"/quotes/share/{token}/decline", json={
                "reason": "Budget reduced for Q4, we will revisit next quarter."
            })
            assert decline_res.status_code == 200
            dec_data = decline_res.json()
            assert dec_data["status"] == "declined"
            assert dec_data["decline_reason"] == "Budget reduced for Q4, we will revisit next quarter."
            assert dec_data["declined_at"] is not None

            # Cannot accept a declined quote
            fail_acc = await anon_client.post(f"/quotes/share/{token}/accept", json={
                "accepted_by_name": "Ibrahim Kano"
            })
            assert fail_acc.status_code == 400

        # --- Quote Expiration Flow ---
        past_date = date.today() - timedelta(days=2)
        expired_res = await client.post("/quotes", json={
            "client_id": client_id,
            "currency": "NGN",
            "issue_date": str(past_date - timedelta(days=10)),
            "expires_at": str(past_date),
            "items": [{"description": "Flash Discount Package", "quantity": 1, "unit_price_minor": 100_000_00}],
        })
        exp_data = expired_res.json()
        assert exp_data["is_expired"] is True
        assert exp_data["status"] == "expired"

        # Client viewing expired quote
        exp_token = exp_data["share_token"]
        async with AsyncClient(transport=transport, base_url="http://test") as anon_client:
            pub_exp = await anon_client.get(f"/quotes/share/{exp_token}")
            assert pub_exp.status_code == 200
            assert pub_exp.json()["is_expired"] is True

            # Attempting to accept an expired quote fails
            accept_exp = await anon_client.post(f"/quotes/share/{exp_token}/accept", json={
                "accepted_by_name": "Tunde Late"
            })
            assert accept_exp.status_code == 400
            assert "expired" in accept_exp.json()["detail"].lower()
