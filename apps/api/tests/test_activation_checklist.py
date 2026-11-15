import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.helpers import login_code_for


async def authenticate(client: AsyncClient) -> dict:
    email = f"activation-{uuid.uuid4().hex[:12]}@example.com"

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
        },
    )
    assert verify_response.status_code == 200

    client.cookies.set(
        "bagg_session",
        verify_response.cookies["bagg_session"],
    )

    return verify_response.json()


@pytest.mark.asyncio
async def test_activation_checklist_dismissal_and_resumption_are_persisted():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        await authenticate(client)

        initial_response = await client.get("/activation")
        assert initial_response.status_code == 200

        initial = initial_response.json()

        assert initial["checklist_dismissed"] is False
        original_status = initial["activation_status"]

        dismiss_response = await client.post(
            "/analytics/events",
            json={
                "event_id": str(uuid.uuid4()),
                "event_name": "activation.checklist_dismissed",
                "event_version": 1,
                "properties": {
                    "surface": "dashboard",
                },
            },
        )

        assert dismiss_response.status_code == 200
        assert dismiss_response.json() == {
            "accepted": True,
            "duplicate": False,
        }

        dismissed_response = await client.get("/activation")
        assert dismissed_response.status_code == 200

        dismissed = dismissed_response.json()

        assert dismissed["checklist_dismissed"] is True

        # Hiding the checklist must not alter business activation.
        assert dismissed["activation_status"] == original_status

        resume_response = await client.post(
            "/analytics/events",
            json={
                "event_id": str(uuid.uuid4()),
                "event_name": "activation.checklist_resumed",
                "event_version": 1,
                "properties": {
                    "surface": "dashboard",
                },
            },
        )

        assert resume_response.status_code == 200
        assert resume_response.json()["accepted"] is True

        resumed_response = await client.get("/activation")
        assert resumed_response.status_code == 200

        resumed = resumed_response.json()

        assert resumed["checklist_dismissed"] is False
        assert resumed["activation_status"] == original_status


@pytest.mark.asyncio
async def test_activation_checklist_events_require_authentication():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        activation_response = await client.get("/activation")

        assert activation_response.status_code == 401

        event_response = await client.post(
            "/analytics/events",
            json={
                "event_id": str(uuid.uuid4()),
                "event_name": "activation.checklist_dismissed",
                "event_version": 1,
                "properties": {
                    "surface": "dashboard",
                },
            },
        )

        assert event_response.status_code == 401


@pytest.mark.asyncio
async def test_activation_checklist_rejects_unapproved_event_properties():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        await authenticate(client)

        response = await client.post(
            "/analytics/events",
            json={
                "event_id": str(uuid.uuid4()),
                "event_name": "activation.checklist_dismissed",
                "event_version": 1,
                "properties": {
                    "surface": "dashboard",
                    "account_number": "0123456789",
                },
            },
        )

        assert response.status_code == 422
