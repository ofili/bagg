import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_magic_link_onboarding_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_email = f"creator-{uuid.uuid4().hex[:6]}@lagos.design"

        # 1. Request Magic Link Code
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        assert req_res.status_code == 200
        data = req_res.json()
        assert "Login code sent" in data["message"]
        code = data["dev_code"]
        assert len(code) == 6

        # 2. Verify with wrong code -> Should fail
        wrong_res = await client.post("/auth/verify", json={"email": test_email, "code": "000000"})
        assert wrong_res.status_code == 400

        # 3. Verify with correct code -> Success & Onboarding (US-ONB-01)
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        assert verify_res.status_code == 200
        auth_data = verify_res.json()
        assert auth_data["user"]["email"] == test_email
        assert auth_data["workspace"]["owner_id"] == auth_data["user"]["id"]
        assert "bagg_session" in verify_res.cookies

        # 4. Check /auth/me with session cookie
        session_cookie = verify_res.cookies["bagg_session"]
        client.cookies.set("bagg_session", session_cookie)

        me_res = await client.get("/auth/me")
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["user"]["email"] == test_email

        # 5. Update Workspace Branding & Profile (US-ONB-02)
        patch_res = await client.patch(
            "/workspaces/current",
            json={
                "business_name": "Lagos Design Studio",
                "brand_color": "#059669",
                "default_currency": "NGN",
                "tax_id": "TIN-LAGOS-2026",
                "address": "Victoria Island, Lagos"
            }
        )
        assert patch_res.status_code == 200
        ws_updated = patch_res.json()
        assert ws_updated["business_name"] == "Lagos Design Studio"
        assert ws_updated["brand_color"] == "#059669"
        assert ws_updated["tax_id"] == "TIN-LAGOS-2026"
