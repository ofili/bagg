
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from tests.helpers import login_code_for


async def authenticate(client: AsyncClient, email: str) -> None:
    response = await client.post(
        "/auth/magic-link",
        json={"email": email},
    )
    assert response.status_code == 200

    response = await client.post(
        "/auth/verify",
        json={
            "email": email,
            "code": login_code_for(email),
        },
    )
    assert response.status_code == 200

    client.cookies.set(
        "bagg_session",
        response.cookies["bagg_session"],
    )


@pytest.mark.asyncio
async def test_analytics_endpoints_require_control_plane_access(
    monkeypatch,
):
    monkeypatch.setattr(
        settings,
        "CONTROL_PLANE_ADMIN_EMAILS",
        "",
    )

    email = f"customer-{uuid.uuid4().hex[:12]}@example.com"

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get(
            "/control-plane/analytics/cohorts"
        )
        assert response.status_code == 401

        await authenticate(client, email)

        response = await client.get(
            "/control-plane/analytics/cohorts"
        )
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_analytics_routes_reject_invalid_date_range(
    monkeypatch,
):
    email = f"staff-{uuid.uuid4().hex[:12]}@example.com"

    monkeypatch.setattr(
        settings,
        "CONTROL_PLANE_ADMIN_EMAILS",
        email,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        await authenticate(client, email)

        response = await client.get(
            "/control-plane/analytics/cohorts",
            params={
                "from_date": "2026-10-31",
                "to_date": "2026-10-01",
            },
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_segments_reject_unknown_segment(monkeypatch):
    email = f"staff-{uuid.uuid4().hex[:12]}@example.com"

    monkeypatch.setattr(
        settings,
        "CONTROL_PLANE_ADMIN_EMAILS",
        email,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        await authenticate(client, email)

        response = await client.get(
            "/control-plane/analytics/segments",
            params={"segment": "unknown_segment"},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_analytics_endpoints_set_no_store(monkeypatch):
    email = f"staff-{uuid.uuid4().hex[:12]}@example.com"

    monkeypatch.setattr(
        settings,
        "CONTROL_PLANE_ADMIN_EMAILS",
        email,
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        await authenticate(client, email)

        response = await client.get(
            "/control-plane/analytics/overview"
        )

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
