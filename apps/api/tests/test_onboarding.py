import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_magic_link_onboarding_lifecycle(monkeypatch):
    delivered_codes: dict[str, str] = {}

    async def fake_send_login_code_email(
        self,
        to_email: str,
        code: str,
        expires_in_minutes: int = 10,
    ) -> bool:
        delivered_codes[to_email] = code
        return True

    monkeypatch.setattr(
        "app.domains.auth.service.EmailSender.send_login_code_email",
        fake_send_login_code_email,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        test_email = f"creator-{uuid.uuid4().hex[:12]}@example.com"

        # 1. Request a code; the HTTP response must not disclose it.
        req_res = await client.post(
            "/auth/magic-link",
            json={"email": test_email},
        )
        assert req_res.status_code == 200
        assert "dev_code" not in req_res.json()
        assert test_email in delivered_codes
        code = delivered_codes[test_email]
        assert len(code) == 6

        # 2. An incorrect code must fail.
        wrong_res = await client.post(
            "/auth/verify",
            json={"email": test_email, "code": "000000"},
        )
        assert wrong_res.status_code == 400

        # 3. The emailed code authenticates the user.
        verify_res = await client.post(
            "/auth/verify",
            json={"email": test_email, "code": code},
        )
        assert verify_res.status_code == 200

        auth_data = verify_res.json()
        assert auth_data["user"]["email"] == test_email
        assert auth_data["workspace"]["owner_id"] == auth_data["user"]["id"]
        assert "bagg_session" in verify_res.cookies

        # 4. A code must not be reusable.
        replay_res = await client.post(
            "/auth/verify",
            json={"email": test_email, "code": code},
        )
        assert replay_res.status_code == 400

        # 5. The session authenticates /auth/me.
        session_cookie = verify_res.cookies["bagg_session"]
        client.cookies.set("bagg_session", session_cookie)

        me_res = await client.get("/auth/me")
        assert me_res.status_code == 200
        assert me_res.json()["user"]["email"] == test_email

        # 6. Workspace updates work for the authenticated owner.
        patch_res = await client.patch(
            "/workspaces/current",
            json={
                "business_name": "Lagos Design Studio",
                "brand_color": "#059669",
                "default_currency": "NGN",
                "tax_id": "TIN-LAGOS-2026",
                "address": "Victoria Island, Lagos",
            },
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["business_name"] == "Lagos Design Studio"

        # 7. Logout revokes the server-side session.
        logout_res = await client.post("/auth/logout")
        assert logout_res.status_code == 200

        me_after_logout = await client.get("/auth/me")
        assert me_after_logout.status_code == 401


@pytest.mark.asyncio
async def test_workspace_routes_require_authentication():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        assert (await client.get("/workspaces/current")).status_code == 401

        assert (
            await client.patch(
                "/workspaces/current",
                json={"business_name": "Unauthorized update"},
            )
        ).status_code == 401
