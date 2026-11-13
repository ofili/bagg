import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.helpers import login_code_for


async def authenticate_test_user(client: AsyncClient) -> dict:
    """Create or authenticate a test user using the existing magic-link flow."""

    email = f"onboarding-{uuid.uuid4().hex[:12]}@example.com"

    request_response = await client.post(
        "/auth/magic-link",
        json={"email": email},
    )

    assert request_response.status_code == 200

    code = login_code_for(email)

    verify_response = await client.post(
        "/auth/verify",
        json={
            "email": email,
            "code": code,
        },
    )

    assert verify_response.status_code == 200

    session_cookie = verify_response.cookies["bagg_session"]

    client.cookies.set(
        "bagg_session",
        session_cookie,
    )

    return verify_response.json()


@pytest.mark.asyncio
async def test_magic_link_onboarding_lifecycle():

    transport = ASGITransport(app=app)

    async with AsyncClient(
            transport=transport,
            base_url="http://test",
    ) as client:

        test_email = f"creator-{uuid.uuid4().hex[:12]}@example.com"

        req_res = await client.post(
            "/auth/magic-link",
            json={"email": test_email},
        )

        assert req_res.status_code == 200
        assert "dev_code" not in req_res.json()

        code = login_code_for(test_email)

        assert len(code) == 6

        wrong_res = await client.post(
            "/auth/verify",
            json={
                "email": test_email,
                "code": "000000",
            },
        )

        assert wrong_res.status_code == 400

        verify_res = await client.post(
            "/auth/verify",
            json={
                "email": test_email,
                "code": code,
            },
        )

        assert verify_res.status_code == 200

        auth_data = verify_res.json()

        assert auth_data["user"]["email"] == test_email

        assert (
                auth_data["workspace"]["owner_id"]
                == auth_data["user"]["id"]
        )

        assert "bagg_session" in verify_res.cookies

        session_cookie = verify_res.cookies["bagg_session"]

        client.cookies.set(
            "bagg_session",
            session_cookie,
        )

        me_res = await client.get("/auth/me")

        assert me_res.status_code == 200
        assert me_res.json()["user"]["email"] == test_email

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

        assert (
                patch_res.json()["business_name"]
                == "Lagos Design Studio"
        )

        logout_res = await client.post("/auth/logout")

        assert logout_res.status_code == 200

        me_after_logout = await client.get("/auth/me")

        assert me_after_logout.status_code == 401


@pytest.mark.asyncio
async def test_new_magic_code_invalidates_previous_code():

    transport = ASGITransport(app=app)

    async with AsyncClient(
            transport=transport,
            base_url="http://test",
    ) as client:

        test_email = f"creator-{uuid.uuid4().hex[:12]}@example.com"

        first_req = await client.post(
            "/auth/magic-link",
            json={"email": test_email},
        )

        assert first_req.status_code == 200

        first_code = login_code_for(test_email)

        second_req = await client.post(
            "/auth/magic-link",
            json={"email": test_email},
        )

        assert second_req.status_code == 200

        second_code = login_code_for(test_email)

        assert first_code != second_code

        stale_res = await client.post(
            "/auth/verify",
            json={
                "email": test_email,
                "code": first_code,
            },
        )

        assert stale_res.status_code == 400

        current_res = await client.post(
            "/auth/verify",
            json={
                "email": test_email,
                "code": second_code,
            },
        )

        assert current_res.status_code == 200


@pytest.mark.asyncio
async def test_workspace_routes_require_authentication():

    transport = ASGITransport(app=app)

    async with AsyncClient(
            transport=transport,
            base_url="http://test",
    ) as client:

        assert (
                   await client.get("/workspaces/current")
               ).status_code == 401

        assert (
                   await client.patch(
                       "/workspaces/current",
                       json={"business_name": "Unauthorized update"},
                   )
               ).status_code == 401

        assert (
                   await client.get("/onboarding")
               ).status_code == 401

        assert (
                   await client.post("/onboarding/resume")
               ).status_code == 401

        assert (
                   await client.patch(
                       "/onboarding/business-profile",
                       json={
                           "business_name": "Unauthorized",
                           "country": "NG",
                           "default_currency": "NGN",
                       },
                   )
               ).status_code == 401


@pytest.mark.asyncio
async def test_onboarding_progress_is_workspace_scoped_and_resumable():

    transport = ASGITransport(app=app)

    async with AsyncClient(
            transport=transport,
            base_url="http://test",
    ) as client:

        auth_data = await authenticate_test_user(client)

        workspace_id = auth_data["workspace"]["id"]

        # A newly created workspace has not completed onboarding.

        progress_res = await client.get("/onboarding")

        assert progress_res.status_code == 200

        progress = progress_res.json()

        assert progress["status"] == "not_started"

        assert progress["current_step"] == "business_profile"

        assert progress["completed_steps"] == [
            "account_created",
            "workspace_created",
        ]

        assert progress["required_steps_remaining"] == [
            "business_profile",
        ]

        assert progress["onboarding_completed"] is False

        # Resuming onboarding changes its status.

        resume_res = await client.post("/onboarding/resume")

        assert resume_res.status_code == 200

        resumed = resume_res.json()

        assert resumed["status"] == "in_progress"

        assert resumed["started_at"] is not None

        # Complete the business profile.

        complete_res = await client.patch(
            "/onboarding/business-profile",
            json={
                "business_name": "Ada Creative Studio",
                "country": "NG",
                "default_currency": "NGN",
                "address": "Victoria Island, Lagos",
            },
        )

        assert complete_res.status_code == 200

        completed = complete_res.json()

        assert completed["status"] == "completed"

        assert completed["current_step"] is None

        assert completed["onboarding_completed"] is True

        assert completed["required_steps_remaining"] == []

        assert completed["completed_steps"] == [
            "account_created",
            "workspace_created",
            "business_profile",
        ]

        assert completed["business_profile"]["business_name"] == (
            "Ada Creative Studio"
        )

        assert completed["business_profile"]["address"] == (
            "Victoria Island, Lagos"
        )

        assert completed["completed_at"] is not None

        # Repeated submission must not duplicate completed steps.

        repeated_res = await client.patch(
            "/onboarding/business-profile",
            json={
                "business_name": "Ada Creative Studio",
                "country": "NG",
                "default_currency": "NGN",
                "address": "Victoria Island, Lagos",
            },
        )

        assert repeated_res.status_code == 200

        repeated = repeated_res.json()

        assert repeated["completed_steps"] == [
            "account_created",
            "workspace_created",
            "business_profile",
        ]

        assert repeated["status"] == "completed"

        # Completion remains consistent with the legacy workspace field.

        workspace_res = await client.get("/workspaces/current")

        assert workspace_res.status_code == 200

        workspace = workspace_res.json()

        assert workspace["id"] == workspace_id

        assert workspace["onboarding_completed"] is True

        assert workspace["business_name"] == "Ada Creative Studio"

        # Subsequent retrieval must preserve progress.

        final_res = await client.get("/onboarding")

        assert final_res.status_code == 200

        assert final_res.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_legacy_workspace_completion_updates_onboarding_progress():

    transport = ASGITransport(app=app)

    async with AsyncClient(
            transport=transport,
            base_url="http://test",
    ) as client:

        await authenticate_test_user(client)

        legacy_res = await client.post(
            "/workspaces/current/complete-onboarding",
            json={
                "business_name": "Legacy Studio",
                "country": "NG",
                "default_currency": "NGN",
                "address": "Lagos",
            },
        )

        assert legacy_res.status_code == 200

        assert legacy_res.json()["onboarding_completed"] is True

        progress_res = await client.get("/onboarding")

        assert progress_res.status_code == 200

        progress = progress_res.json()

        assert progress["status"] == "completed"

        assert "business_profile" in progress["completed_steps"]

        assert progress["required_steps_remaining"] == []


@pytest.mark.asyncio
async def test_onboarding_business_profile_validation():

    transport = ASGITransport(app=app)

    async with AsyncClient(
            transport=transport,
            base_url="http://test",
    ) as client:

        await authenticate_test_user(client)

        invalid_payloads = [
            {
                "business_name": "   ",
                "country": "NG",
                "default_currency": "NGN",
            },
            {
                "business_name": "Valid Studio",
                "country": "NGA",
                "default_currency": "NGN",
            },
            {
                "business_name": "Valid Studio",
                "country": "NG",
                "default_currency": "NG",
            },
            {
                "business_name": "Valid Studio",
                "country": "NG",
                "default_currency": "NGN",
                "workspace_id": "another-workspace",
            },
        ]

        for payload in invalid_payloads:

            response = await client.patch(
                "/onboarding/business-profile",
                json=payload,
            )

            assert response.status_code == 422

        # Invalid requests must not complete onboarding.

        progress_res = await client.get("/onboarding")

        assert progress_res.status_code == 200

        assert progress_res.json()["status"] == "not_started"