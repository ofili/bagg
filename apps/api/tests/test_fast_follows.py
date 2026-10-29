"""
Lifecycle 11: Phase 1 Fast-Follows (Integrated Rails & Taxes)
Tests: US-INT-01 (Direct Payer Checkout), US-INT-02 (Milestone Deposits),
       US-INT-03 (Withholding Tax Tracking)

Arithmetic Vectors (all in kobo – minor units):

  Invoice A – WHT Invoice for Corporate Client:
    Item 1: 2 × 15,000,000 kobo = 30,000,000 kobo (₦300,000.00)
    Item 2: 1 × 10,000,000 kobo = 10,000,000 kobo (₦100,000.00)
    Subtotal:              40,000,000 kobo (₦400,000.00)
    Discount:               0 kobo
    VAT @ 7.5%:            3,000,000 kobo (₦30,000.00)
    Gross Total:           43,000,000 kobo (₦430,000.00)
    WHT @ 5%:              2,000,000 kobo (₦20,000.00) [on discounted subtotal 40M]
    Net Payable:           41,000,000 kobo (₦410,000.00)

  Invoice B – 50% Milestone Deposit:
    Item 1: 1 × 50,000,000 kobo = 50,000,000 kobo (₦500,000.00)
    Subtotal / Gross Total: 50,000,000 kobo (₦500,000.00)
    No WHT, No tax
    Deposit: 50% = 25,000,000 kobo (₦250,000.00)
"""
import uuid
import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.helpers import create_sent_invoice


@pytest.mark.asyncio
async def test_fast_follows_direct_checkout_milestones_and_wht():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # --- Auth ---
        test_email = f"fast-follows-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # --- Payment Profile ---
        pp_res = await client.post("/payments/profiles", json={
            "currency": "NGN",
            "bank_name": "Guaranty Trust Bank",
            "account_name": "Studio Fast-Follows Ltd",
            "account_number": "0987654321",
            "is_default": True,
        })
        assert pp_res.status_code == 201

        # --- Create Corporate Client ---
        corp_client = await client.post("/clients", json={
            "name": "Zenith Corp Plc",
            "email": "procurement@zenithcorp.ng",
            "preferred_currency": "NGN",
            "default_payment_terms_days": 30,
        })
        assert corp_client.status_code == 201
        corp_id = corp_client.json()["id"]

        # --- Create Project Client ---
        proj_client = await client.post("/clients", json={
            "name": "Milestone Startup Ltd",
            "email": "founder@milestone.ng",
            "phone": "+2348012345678",
            "preferred_currency": "NGN",
        })
        assert proj_client.status_code == 201
        proj_id = proj_client.json()["id"]

        # ===================================================================
        # US-INT-03: Withholding Tax (WHT) Tracking
        # ===================================================================
        wht = await create_sent_invoice(
            client,
            {
                "client_id": corp_id,
                "currency": "NGN",
                "due_date": str(date.today() + timedelta(days=30)),
                "items": [
                    {"description": "Brand Strategy Retainer (Q4)", "quantity": 2, "unit_price_minor": 15_000_000},
                    {"description": "Creative Asset Package", "quantity": 1, "unit_price_minor": 10_000_000},
                ],
                "tax_rate_percent": 7.5,
                "wht_rate_percent": 5.0,
                "direct_checkout_enabled": True,
            },
        )

        # Verify arithmetic
        assert wht["subtotal_minor"] == 40_000_000
        assert wht["tax_minor"] == 3_000_000       # 7.5% of 40M
        assert wht["total_minor"] == 43_000_000     # Gross total
        assert wht["wht_rate_percent"] == 5.0
        assert wht["wht_minor"] == 2_000_000        # 5% WHT on discounted subtotal (40M)
        assert wht["net_payable_minor"] == 41_000_000  # 43M - 2M WHT
        assert wht["balance_due_minor"] == 41_000_000
        assert wht["direct_checkout_enabled"] is True

        # Log the WHT credit note number from the corporate client
        wht_patch = await client.patch(f"/invoices/{wht['id']}/wht", json={
            "wht_credit_note_number": "WHT/ZC/2026/Q4/00187",
        })
        assert wht_patch.status_code == 200
        assert wht_patch.json()["wht_credit_note_number"] == "WHT/ZC/2026/Q4/00187"

        # ===================================================================
        # US-INT-02: Milestone Payments & Upfront Deposits
        # ===================================================================
        ms = await create_sent_invoice(
            client,
            {
                "client_id": proj_id,
                "currency": "NGN",
                "due_date": str(date.today() + timedelta(days=14)),
                "items": [
                    {"description": "Full Website Redesign Project", "quantity": 1, "unit_price_minor": 50_000_000},
                ],
                "deposit_percentage": 50.0,
                "deposit_due_date": str(date.today() + timedelta(days=3)),
            },
        )

        # Verify milestone arithmetic
        assert ms["subtotal_minor"] == 50_000_000
        assert ms["total_minor"] == 50_000_000     # No tax, no discount
        assert ms["net_payable_minor"] == 50_000_000
        assert ms["deposit_percentage"] == 50.0
        assert ms["deposit_amount_minor"] == 25_000_000  # 50% of 50M
        assert ms["deposit_due_date"] == str(date.today() + timedelta(days=3))
        assert ms["balance_due_minor"] == 50_000_000  # Full balance initially

        # ===================================================================
        # US-INT-01: Direct Payer Checkout – Client Portal
        # ===================================================================
        # Client views the WHT invoice publicly
        public_wht = await client.get(f"/share/{wht['share_token']}")
        assert public_wht.status_code == 200
        pub_data = public_wht.json()
        assert pub_data["invoice"]["wht_rate_percent"] == 5.0
        assert pub_data["invoice"]["net_payable_minor"] == 41_000_000
        assert pub_data["invoice"]["direct_checkout_enabled"] is True

        # Client views the milestone invoice publicly
        public_ms = await client.get(f"/share/{ms['share_token']}")
        assert public_ms.status_code == 200
        ms_pub = public_ms.json()
        assert ms_pub["invoice"]["deposit_amount_minor"] == 25_000_000

        # ===================================================================
        # Revise WHT invoice with updated scope (US-DEL-05 + US-INT-03)
        # ===================================================================
        revise_res = await client.post(f"/invoices/{wht['id']}/revise", json={
            "items": [
                {"description": "Brand Strategy Retainer (Q4)", "quantity": 2, "unit_price_minor": 15_000_000},
                {"description": "Creative Asset Package", "quantity": 1, "unit_price_minor": 10_000_000},
                {"description": "Social Media Audit", "quantity": 1, "unit_price_minor": 5_000_000},
            ],
            "wht_rate_percent": 10.0,
            "reason": "Added social media audit scope",
        })
        assert revise_res.status_code == 200
        rev = revise_res.json()

        # New totals:
        # Subtotal: 30M + 10M + 5M = 45M
        # Tax @7.5%: 3,375,000
        # Gross: 48,375,000
        # WHT @10%: 4,500,000
        # Net: 43,875,000
        assert rev["subtotal_minor"] == 45_000_000
        assert rev["tax_minor"] == 3_375_000
        assert rev["total_minor"] == 48_375_000
        assert rev["wht_rate_percent"] == 10.0
        assert rev["wht_minor"] == 4_500_000
        assert rev["net_payable_minor"] == 43_875_000
        assert rev["version"] == 2

        # Verify revision history preserves old WHT snapshot
        revisions = await client.get(f"/invoices/{wht['id']}/revisions")
        assert revisions.status_code == 200
        rev_list = revisions.json()
        assert len(rev_list) == 1
        assert rev_list[0]["wht_rate_percent"] == 5.0
        assert rev_list[0]["wht_minor"] == 2_000_000
        assert rev_list[0]["net_payable_minor"] == 41_000_000

        # ===================================================================
        # Update draft with WHT and deposit at the same time
        # ===================================================================
        combo_inv = await client.post("/invoices", json={
            "client_id": corp_id,
            "currency": "NGN",
            "due_date": str(date.today() + timedelta(days=30)),
            "items": [
                {"description": "Consulting Engagement", "quantity": 1, "unit_price_minor": 20_000_000},
            ],
            "tax_rate_percent": 7.5,
            "wht_rate_percent": 5.0,
            "deposit_percentage": 50.0,
        })
        assert combo_inv.status_code == 201
        combo = combo_inv.json()

        # Subtotal: 20M
        # Tax @7.5%: 1,500,000
        # Gross: 21,500,000
        # WHT @5%: 1,000,000
        # Net: 20,500,000
        # Deposit @50%: 10,250,000
        assert combo["subtotal_minor"] == 20_000_000
        assert combo["tax_minor"] == 1_500_000
        assert combo["total_minor"] == 21_500_000
        assert combo["wht_minor"] == 1_000_000
        assert combo["net_payable_minor"] == 20_500_000
        assert combo["deposit_amount_minor"] == 10_250_000

        # Update draft: change deposit to fixed amount
        update_res = await client.patch(f"/invoices/{combo['id']}", json={
            "deposit_amount_minor": 8_000_000,
            "deposit_percentage": None,
        })
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["deposit_amount_minor"] == 8_000_000

        # ===================================================================
        # Verify dashboard metrics still work (backward compat)
        # ===================================================================
        metrics_res = await client.get("/invoices/metrics")
        assert metrics_res.status_code == 200
        metrics = metrics_res.json()
        assert len(metrics) > 0  # At least NGN

        # ===================================================================
        # Verify full invoice list works
        # ===================================================================
        list_res = await client.get("/invoices")
        assert list_res.status_code == 200
        inv_list = list_res.json()["items"]
        assert len(inv_list) >= 3

        # Every invoice should have the new fields
        for inv in inv_list:
            assert "wht_rate_percent" in inv
            assert "net_payable_minor" in inv
            assert "balance_due_minor" in inv
            assert "direct_checkout_enabled" in inv
