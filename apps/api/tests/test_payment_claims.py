import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_payment_claim_and_verification_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 0: Freelancer Auth & Setup
        test_email = f"creator-{uuid.uuid4().hex[:6]}@claims.design"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        assert req_res.status_code == 200
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # Setup NGN Payment Profile
        await client.post(
            "/payments/profiles",
            json={
                "currency": "NGN",
                "bank_name": "Access Bank",
                "account_name": "Design Collective",
                "account_number": "0123456789",
                "is_default": True,
            },
        )

        # Setup Client
        c_res = await client.post(
            "/clients",
            json={
                "name": "Kano Media House",
                "email": "finance@kanomedia.ng",
                "phone": "+234 802 111 2222",
                "preferred_currency": "NGN",
            },
        )
        client_id = c_res.json()["id"]

        # Create Invoice for 500,000 NGN (50,000,000 kobo)
        inv_res = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "items": [
                    {"description": "Branding & Guidelines", "quantity": 1, "unit_price_minor": 50000000},
                ],
                "discount_minor": 0,
                "tax_rate_percent": 0.0,
            },
        )
        inv = inv_res.json()
        inv_id = inv["id"]
        token = inv["share_token"]

        # Finalize then Send Invoice (US-INV-04, US-DEL-01)
        fin_res = await client.post(f"/invoices/{inv_id}/finalize")
        assert fin_res.status_code == 200
        send_res = await client.post(f"/invoices/{inv_id}/send")
        assert send_res.status_code == 200
        assert send_res.json()["invoice"]["status"] == "sent"

        # Client opens public link -> transitions to 'viewed'
        portal_res = await client.get(f"/share/{token}")
        assert portal_res.status_code == 200
        assert portal_res.json()["invoice"]["status"] == "viewed"

        # 1. Client Submits First Claim (US-CLM-01)
        claim1_res = await client.post(
            f"/share/{token}/claim",
            json={
                "amount_minor": 50000000,
                "reference": "NIP/GTB/202610200001",
                "proof_file_url": "https://storage.bagg.africa/receipts/rec_001.png",
            },
        )
        assert claim1_res.status_code == 201
        claim1 = claim1_res.json()
        assert claim1["status"] == "pending"
        assert claim1["reference"] == "NIP/GTB/202610200001"
        claim1_id = claim1["id"]

        # Verify invoice is now 'payment_claimed'
        inv_check = await client.get(f"/invoices/{inv_id}")
        assert inv_check.json()["status"] == "payment_claimed"

        # 2. Freelancer Rejects Claim 1 (US-CLM-02 - e.g. funds didn't clear)
        reject_res = await client.post(
            f"/invoices/{inv_id}/claims/{claim1_id}/reject",
            json={"rejection_reason": "Funds have not cleared into Access Bank yet"},
        )
        assert reject_res.status_code == 200
        rejected_claim = reject_res.json()
        assert rejected_claim["status"] == "rejected"
        assert rejected_claim["rejection_reason"] == "Funds have not cleared into Access Bank yet"

        # Verify invoice reverted to 'viewed'
        inv_check_2 = await client.get(f"/invoices/{inv_id}")
        assert inv_check_2.json()["status"] == "viewed"

        # 3. Client Submits Second Claim (Partial Payment: 200,000 NGN)
        claim2_res = await client.post(
            f"/share/{token}/claim",
            json={
                "amount_minor": 20000000,
                "reference": "NIP/GTB/PARTIAL_200K",
            },
        )
        assert claim2_res.status_code == 201
        claim2_id = claim2_res.json()["id"]

        # Freelancer Confirms Partial Claim
        confirm_partial_res = await client.post(
            f"/invoices/{inv_id}/claims/{claim2_id}/confirm",
            json={"amount_paid_minor": 20000000},
        )
        assert confirm_partial_res.status_code == 200
        assert confirm_partial_res.json()["status"] == "confirmed"

        # Verify invoice is now 'partially_paid' with amount_paid_minor = 20,000,000
        inv_partial = await client.get(f"/invoices/{inv_id}")
        assert inv_partial.json()["status"] == "partially_paid"
        assert inv_partial.json()["amount_paid_minor"] == 20000000

        # 4. Client Submits Third Claim for remaining 300,000 NGN
        claim3_res = await client.post(
            f"/share/{token}/claim",
            json={
                "amount_minor": 30000000,
                "reference": "NIP/GTB/FINAL_300K",
            },
        )
        assert claim3_res.status_code == 201
        claim3_id = claim3_res.json()["id"]

        # Freelancer Confirms Full Final Payment
        confirm_final_res = await client.post(
            f"/invoices/{inv_id}/claims/{claim3_id}/confirm"
        )
        assert confirm_final_res.status_code == 200
        assert confirm_final_res.json()["status"] == "confirmed"

        # Verify invoice is fully 'paid'
        inv_paid = await client.get(f"/invoices/{inv_id}")
        assert inv_paid.json()["status"] == "paid"
        assert inv_paid.json()["amount_paid_minor"] == 50000000

        # Freelancer list claims history
        claims_list_res = await client.get(f"/invoices/{inv_id}/claims")
        assert claims_list_res.status_code == 200
        all_claims = claims_list_res.json()
        assert len(all_claims) == 3
