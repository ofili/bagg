import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"

@pytest.mark.asyncio
async def test_currencies_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/currencies")
    assert response.status_code == 200
    data = response.json()
    assert "currencies" in data
    codes = [c["code"] for c in data["currencies"]]
    assert "NGN" in codes
    assert "USD" in codes
