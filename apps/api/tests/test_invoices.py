import uuid
import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_invoice_drafting_and_sequential_numbering_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 0: Auth - login
        test_email = f"creator-{uuid.uuid4().hex[:6]}@lagos.agency"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # Create a client
        client_res = await client.post(
            "/clients",
            json={
                "name": "Lagos Tech Ventures",
                "email": "billing@lagostech.ng",
                "preferred_currency": "NGN",
                "default_payment_terms_days": 14,
            }
        )
        assert client_res.status_code == 201
        client_id = client_res.json()["id"]

        # 1. Create First Invoice (US-INV-01: Sequential Numbering)
        # Arithmetic Vector (US-INV-02):
        # Item 1: 1 x 25,000,000 kobo (₦250,000.00)
        # Item 2: 2 x 7,500,000 kobo (₦150,000.00)
        # Subtotal: 40,000,000 kobo (₦400,000.00)
        # Discount: 2,000,000 kobo (₦20,000.00) -> Discounted Subtotal: 38,000,000 kobo
        # Tax: 7.5% VAT on 38,000,000 = 2,850,000 kobo (₦28,500.00)
        # Total: 38,000,000 + 2,850,000 = 40,850,000 kobo (₦408,500.00)
        inv1_res = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "issue_date": "2026-10-15",
                "items": [
                    {"description": "Brand Identity Design", "quantity": 1, "unit_price_minor": 25000000},
                    {"description": "Social Media Templates", "quantity": 2, "unit_price_minor": 7500000},
                ],
                "discount_minor": 2000000,
                "tax_rate_percent": 7.5,
                "notes": "Thank you for your business!"
            }
        )
        assert inv1_res.status_code == 201
        inv1 = inv1_res.json()
        assert inv1["invoice_number"] == "INV-0001"
        assert inv1["sequence_number"] == 1
        assert inv1["status"] == "draft"
        assert inv1["subtotal_minor"] == 40000000
        assert inv1["discount_minor"] == 2000000
        assert inv1["tax_minor"] == 2850000
        assert inv1["total_minor"] == 40850000
        assert inv1["due_date"] == "2026-10-29"  # issue_date + 14 days
        assert inv1["share_token"] is not None
        assert len(inv1["items"]) == 2
        inv1_id = inv1["id"]

        # 2. Create Second Invoice -> Should increment to INV-0002 (US-INV-01)
        inv2_res = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "issue_date": "2026-10-18",
                "items": [
                    {"description": "Website Consultation", "quantity": 3, "unit_price_minor": 5000000},
                ],
                "discount_minor": 0,
                "tax_rate_percent": 0.0,
            }
        )
        assert inv2_res.status_code == 201
        inv2 = inv2_res.json()
        assert inv2["invoice_number"] == "INV-0002"
        assert inv2["sequence_number"] == 2
        assert inv2["total_minor"] == 15000000

        # 3. Auto-Save / Draft Updates (US-INV-03)
        # Update line items and discount on draft invoice 1
        patch_res = await client.patch(
            f"/invoices/{inv1_id}",
            json={
                "discount_minor": 5000000,  # ₦50,000 discount
                "items": [
                    {"description": "Full Brand System & Guidelines", "quantity": 1, "unit_price_minor": 30000000},
                ],
                "notes": "Updated scope and deliverables"
            }
        )
        assert patch_res.status_code == 200
        updated_inv1 = patch_res.json()
        # Subtotal: 30,000,000; Discount: 5,000,000 -> 25,000,000; Tax 7.5% on 25,000,000 = 1,875,000
        # Total: 26,875,000
        assert updated_inv1["subtotal_minor"] == 30000000
        assert updated_inv1["discount_minor"] == 5000000
        assert updated_inv1["tax_minor"] == 1875000
        assert updated_inv1["total_minor"] == 26875000
        assert updated_inv1["notes"] == "Updated scope and deliverables"

        # 4. List and filter invoices
        list_res = await client.get("/invoices")
        assert list_res.status_code == 200
        all_invoices = list_res.json()
        assert len(all_invoices) == 2
        assert all_invoices[0]["invoice_number"] == "INV-0002"  # ordered desc

        filter_client = await client.get(f"/invoices?client_id={client_id}")
        assert filter_client.status_code == 200
        assert len(filter_client.json()) == 2

        # 5. Delete draft invoice
        del_res = await client.delete(f"/invoices/{inv2['id']}")
        assert del_res.status_code == 204

        # Verify list now has 1 invoice
        list_after = await client.get("/invoices")
        assert len(list_after.json()) == 1
