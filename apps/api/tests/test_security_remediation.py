import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_reminder_processing_rejects_missing_internal_token(
    monkeypatch,
):
    monkeypatch.setattr(
        "app.domains.reminders.router.settings.INTERNAL_JOB_TOKEN",
        "test-internal-token",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post("/reminders/process")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_reminder_processing_rejects_wrong_internal_token(
    monkeypatch,
):
    monkeypatch.setattr(
        "app.domains.reminders.router.settings.INTERNAL_JOB_TOKEN",
        "test-internal-token",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/reminders/process",
            headers={"Authorization": "Bearer wrong-token"},
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_reminder_processing_fails_closed_without_configuration(
    monkeypatch,
):
    monkeypatch.setattr(
        "app.domains.reminders.router.settings.INTERNAL_JOB_TOKEN",
        None,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/reminders/process",
            headers={"Authorization": "Bearer test-internal-token"},
        )

    assert response.status_code == 503
