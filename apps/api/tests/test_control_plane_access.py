import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from tests.helpers import login_code_for


async def authenticate(
    client: AsyncClient,
    email: str,
) -> None:
    request_response = await client.post(
        "/auth/magic-link",
        json={"email": email},
    )
    assert request_response.status_code == 200

    verify_response = await client.post(
        "/auth/verify",
        json={
            "email": email,
            "code": login_code_for(email),
            "intent": "signup",
            "full_name": "Control Plane Test User",
        },
    )
    assert verify_response.status_code == 200

    client.cookies.set(
        "bagg_session",
        verify_response.cookies["bagg_session"],
    )


@pytest.mark.asyncio
async def test_control_plane_requires_authentication():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get("/control-plane/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_control_plane_denies_authenticated_customer(
    monkeypatch,
):
    monkeypatch.setattr(
        settings,
        "CONTROL_PLANE_ADMIN_EMAILS",
        "staff@example.com",
    )

    email = f"customer-{uuid.uuid4().hex[:12]}@example.com"

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        await authenticate(client, email)

        response = await client.get("/control-plane/me")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_control_plane_allows_configured_staff(
    monkeypatch,
):
    email = f"staff-{uuid.uuid4().hex[:12]}@example.com"

    monkeypatch.setattr(
        settings,
        "CONTROL_PLANE_ADMIN_EMAILS",
        f"other@example.com, {email.upper()}",
    )

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        await authenticate(client, email)

        response = await client.get("/control-plane/me")

    assert response.status_code == 200

    body = response.json()

    assert body["authenticated"] is True
    assert body["is_control_plane_admin"] is True
    assert body["user"]["email"] == email


@pytest.mark.asyncio
async def test_control_plane_denies_everyone_when_allowlist_empty(
    monkeypatch,
):
    monkeypatch.setattr(
        settings,
        "CONTROL_PLANE_ADMIN_EMAILS",
        "",
    )

    email = f"staff-{uuid.uuid4().hex[:12]}@example.com"

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        await authenticate(client, email)

        response = await client.get("/control-plane/me")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_entitlement_override_creation_returns_404_for_missing_workspace(
    monkeypatch,
):
    email = f"staff-{uuid.uuid4().hex[:12]}@example.com"

    monkeypatch.setattr(
        settings,
        "CONTROL_PLANE_ADMIN_EMAILS",
        email,
    )

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        await authenticate(client, email)

        response = await client.post(
            "/control-plane/workspaces/ws_missing/entitlement-overrides",
            json={
                "entitlement_key": "documents.send.monthly_limit",
                "override_value": 10,
                "reason": "Regression test",
                "expires_at": "2099-12-31T23:59:59Z",
            },
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "Workspace not found."
