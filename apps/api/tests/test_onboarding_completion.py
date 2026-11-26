import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.core.database import get_db
from app.domains.activation.models import ProductEvent
from app.domains.auth.models import User
from app.domains.onboarding.models import OnboardingProgress
from app.domains.workspaces.models import Workspace
from app.main import app
from tests.helpers import login_code_for


@pytest.fixture
async def api_client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        transport = ASGITransport(app=app)

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_db, None)


async def create_authenticated_workspace(client: AsyncClient) -> dict:
    email = f"onboarding-{uuid.uuid4().hex}@example.com"

    request_response = await client.post(
        "/auth/magic-link",
        json={"email": email},
    )

    assert request_response.status_code == 200, request_response.text

    code = login_code_for(email)

    verify_response = await client.post(
        "/auth/verify",
        json={
            "email": email,
            "code": code,
            "intent": "signup",
            "full_name": "Onboarding Test User",
        },
    )

    assert verify_response.status_code == 200, verify_response.text

    return verify_response.json()


@pytest.mark.asyncio
async def test_business_profile_completion_updates_workspace_and_progress(
    api_client,
    db_session,
):
    auth = await create_authenticated_workspace(api_client)
    workspace_id = auth["workspace"]["id"]

    response = await api_client.patch(
        "/onboarding/business-profile",
        json={
            "business_name": "  Alex Creative Studio  ",
            "country": "ng",
            "default_currency": "ngn",
            "address": "  12 Marina Road, Lagos  ",
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["status"] == "completed"
    assert data["onboarding_completed"] is True
    assert data["current_step"] is None
    assert data["required_steps_remaining"] == []
    assert "business_profile" in data["completed_steps"]

    assert data["business_profile"] == {
        "business_name": "Alex Creative Studio",
        "country": "NG",
        "default_currency": "NGN",
        "address": "12 Marina Road, Lagos",
        "timezone": "Africa/Lagos",
    }

    workspace = await db_session.get(Workspace, workspace_id)

    assert workspace is not None
    assert workspace.business_name == "Alex Creative Studio"
    assert workspace.country == "NG"
    assert workspace.default_currency == "NGN"
    assert workspace.address == "12 Marina Road, Lagos"
    assert workspace.onboarding_completed is True

    progress = await db_session.scalar(
        select(OnboardingProgress).where(
            OnboardingProgress.workspace_id == workspace_id
        )
    )

    assert progress is not None
    assert progress.status == "completed"
    assert progress.completed_at is not None


@pytest.mark.asyncio
async def test_repeated_business_profile_completion_is_idempotent(
    api_client,
    db_session,
):
    auth = await create_authenticated_workspace(api_client)
    workspace_id = auth["workspace"]["id"]

    payload = {
        "business_name": "Alex Creative Studio",
        "country": "NG",
        "default_currency": "NGN",
        "address": None,
    }

    first_response = await api_client.patch(
        "/onboarding/business-profile",
        json=payload,
    )

    assert first_response.status_code == 200, first_response.text

    first_completed_at = first_response.json()["completed_at"]

    second_response = await api_client.patch(
        "/onboarding/business-profile",
        json=payload,
    )

    assert second_response.status_code == 200, second_response.text

    second_completed_at = second_response.json()["completed_at"]

    assert second_completed_at == first_completed_at

    progress_count = await db_session.scalar(
        select(func.count(OnboardingProgress.id)).where(
            OnboardingProgress.workspace_id == workspace_id
        )
    )

    assert progress_count == 1

    event_count = await db_session.scalar(
        select(func.count(ProductEvent.id)).where(
            ProductEvent.workspace_id == workspace_id,
            ProductEvent.event_name == "workspace.profile_completed",
            ProductEvent.event_id == (f"workspace-profile-completed:{workspace_id}"),
        )
    )

    assert event_count == 1


@pytest.mark.asyncio
async def test_onboarding_progress_reports_completed_workspace(
    api_client,
):
    await create_authenticated_workspace(api_client)

    complete_response = await api_client.patch(
        "/onboarding/business-profile",
        json={
            "business_name": "Northstar Design",
            "country": "NG",
            "default_currency": "NGN",
        },
    )

    assert complete_response.status_code == 200, complete_response.text

    progress_response = await api_client.get("/onboarding")

    assert progress_response.status_code == 200, progress_response.text

    progress = progress_response.json()

    assert progress["status"] == "completed"
    assert progress["onboarding_completed"] is True
    assert progress["required_steps_remaining"] == []
    assert progress["next_action"]["type"] == "create_first_document"
    assert progress["next_action"]["href"] == "/invoices/new"


@pytest.mark.asyncio
async def test_onboarding_endpoints_reject_unauthenticated_requests(
    api_client,
):
    progress_response = await api_client.get("/onboarding")

    assert progress_response.status_code == 401

    complete_response = await api_client.patch(
        "/onboarding/business-profile",
        json={
            "business_name": "Unauthorised Business",
            "country": "NG",
            "default_currency": "NGN",
        },
    )

    assert complete_response.status_code == 401


@pytest.mark.asyncio
async def test_invalid_business_profile_is_rejected(
    api_client,
):
    await create_authenticated_workspace(api_client)

    response = await api_client.patch(
        "/onboarding/business-profile",
        json={
            "business_name": "   ",
            "country": "NGA",
            "default_currency": "NAIRA",
        },
    )

    assert response.status_code == 422
