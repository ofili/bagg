import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_payment_profiles_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 0: Login to obtain a clean authenticated session
        test_email = f"finances-{uuid.uuid4().hex[:6]}@creator.africa"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # 1. Create NGN Bank Transfer Profile (US-PAY-01)
        ngn_res = await client.post(
            "/payments/profiles",
            json={
                "currency": "NGN",
                "bank_name": "Guaranty Trust Bank (GTBank)",
                "account_name": "Lagos Creative Ltd",
                "account_number": "0123456789",
                "instructions": "Use invoice number as reference",
                "is_default": True
            }
        )
        assert ngn_res.status_code == 201
        ngn_profile = ngn_res.json()
        assert ngn_profile["currency"] == "NGN"
        assert ngn_profile["is_default"] is True
        p1_id = ngn_profile["id"]

        # 2. Create USD Payment Link Profile
        usd_res = await client.post(
            "/payments/profiles",
            json={
                "currency": "USD",
                "payment_link": "https://pay.example.com/lagoscreative",
                "instructions": "Wire or debit card accepted",
                "is_default": True
            }
        )
        assert usd_res.status_code == 201
        usd_profile = usd_res.json()
        assert usd_profile["currency"] == "USD"
        assert usd_profile["payment_link"] == "https://pay.example.com/lagoscreative"

        # 3. Create Second NGN Profile and set as default -> P1 should now have is_default=False
        ngn2_res = await client.post(
            "/payments/profiles",
            json={
                "currency": "NGN",
                "bank_name": "Zenith Bank",
                "account_name": "Lagos Creative Ltd",
                "account_number": "2098765432",
                "is_default": True
            }
        )
        assert ngn2_res.status_code == 201

        # Check list of NGN profiles
        list_res = await client.get("/payments/profiles?currency=NGN")
        assert list_res.status_code == 200
        ngn_list = list_res.json()
        assert len(ngn_list) == 2
        # Verify default switch
        new_default = next(p for p in ngn_list if p["id"] == ngn2_res.json()["id"])
        old_default = next(p for p in ngn_list if p["id"] == p1_id)
        assert new_default["is_default"] is True
        assert old_default["is_default"] is False

        # 4. Currency Validation Endpoint (US-PAY-02)
        # NGN should validate as has_profile: True
        val_ngn = await client.get("/payments/profiles/validate/NGN")
        assert val_ngn.status_code == 200
        assert val_ngn.json()["has_profile"] is True
        assert val_ngn.json()["default_profile"]["id"] == ngn2_res.json()["id"]

        # KES should validate as has_profile: False
        val_kes = await client.get("/payments/profiles/validate/KES")
        assert val_kes.status_code == 200
        assert val_kes.json()["has_profile"] is False
        assert "No payment instructions saved for KES" in val_kes.json()["message"]

        # 5. Delete Profile
        del_res = await client.delete(f"/payments/profiles/{p1_id}")
        assert del_res.status_code == 204

        # Verify deletion
        list_after = await client.get("/payments/profiles?currency=NGN")
        assert len(list_after.json()) == 1
