import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import get_db
from app.domains.auth.models import User
from app.main import app
from tests.helpers import login_code_for


@pytest.fixture
async def api_client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.pop(get_db, None)


async def request_code(client: AsyncClient, email: str) -> str:
    response = await client.post(
        "/auth/magic-link",
        json={"email": email},
    )

    assert response.status_code == 200, response.text

    return login_code_for(email)


@pytest.mark.asyncio
async def test_signup_creates_account_workspace_and_session(
    api_client,
    db_session,
):
    email = f"signup-{uuid.uuid4().hex}@example.com"

    code = await request_code(api_client, email)

    response = await api_client.post(
        "/auth/verify",
        json={
            "email": email,
            "code": code,
            "intent": "signup",
            "full_name": "Alex Okafor",
        },
    )

    assert response.status_code == 200, response.text

    data = response.json()

    assert data["is_new_user"] is True
    assert data["user"]["email"] == email
    assert data["user"]["full_name"] == "Alex Okafor"

    assert data["workspace"]["business_name"] == "My Business"
    assert data["workspace"]["country"] == "NG"
    assert data["workspace"]["default_currency"] == "NGN"
    assert data["workspace"]["onboarding_completed"] is False

    assert api_client.cookies.get("bagg_session")

    me = await api_client.get("/auth/me")

    assert me.status_code == 200, me.text
    assert me.json()["user"]["id"] == data["user"]["id"]
    assert me.json()["workspace"]["id"] == data["workspace"]["id"]

    users = (
        (await db_session.execute(select(User).where(User.email == email)))
        .scalars()
        .all()
    )

    assert len(users) == 1


@pytest.mark.asyncio
async def test_login_does_not_create_unknown_account(
    api_client,
    db_session,
):
    email = f"unknown-{uuid.uuid4().hex}@example.com"

    code = await request_code(api_client, email)

    response = await api_client.post(
        "/auth/verify",
        json={
            "email": email,
            "code": code,
            "intent": "login",
        },
    )

    assert response.status_code == 400

    user = await db_session.scalar(select(User).where(User.email == email))

    assert user is None
    assert api_client.cookies.get("bagg_session") is None


@pytest.mark.asyncio
async def test_signup_does_not_overwrite_existing_user_name(
    api_client,
):
    email = f"existing-{uuid.uuid4().hex}@example.com"

    first_code = await request_code(api_client, email)

    first_response = await api_client.post(
        "/auth/verify",
        json={
            "email": email,
            "code": first_code,
            "intent": "signup",
            "full_name": "Original Name",
        },
    )

    assert first_response.status_code == 200, first_response.text
    original_user_id = first_response.json()["user"]["id"]

    second_code = await request_code(api_client, email)

    second_response = await api_client.post(
        "/auth/verify",
        json={
            "email": email,
            "code": second_code,
            "intent": "signup",
            "full_name": "Replacement Name",
        },
    )

    assert second_response.status_code == 200, second_response.text

    data = second_response.json()

    assert data["is_new_user"] is False
    assert data["user"]["id"] == original_user_id
    assert data["user"]["full_name"] == "Original Name"


@pytest.mark.asyncio
async def test_signup_rejects_missing_full_name(api_client):
    email = f"missing-name-{uuid.uuid4().hex}@example.com"

    code = await request_code(api_client, email)

    response = await api_client.post(
        "/auth/verify",
        json={
            "email": email,
            "code": code,
            "intent": "signup",
        },
    )

    assert response.status_code == 422
