import pytest

from fastapi import HTTPException, Request, Response
from httpx import ASGITransport, AsyncClient

from app.core import public_access
from app.core.security import generate_share_token, hash_token
from app.main import app


def make_request() -> Request:
    return Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": "/",
            "raw_path": b"/",
            "query_string": b"",
            "headers": [],
            "client": ("203.0.113.10", 12345),
            "server": ("test", 80),
        }
    )


def test_share_token_validation():
    token, _ = generate_share_token()

    assert public_access.is_valid_share_token(token)
    assert not public_access.is_valid_share_token("")
    assert not public_access.is_valid_share_token("invalid")
    assert not public_access.is_valid_share_token("../invalid")
    assert not public_access.is_valid_share_token("a" * 200)


@pytest.mark.asyncio
async def test_public_access_checks_ip_and_token_limits(monkeypatch):
    token, _ = generate_share_token()
    calls = []

    async def fake_enforce_rate_limit(**kwargs):
        calls.append(kwargs)
        return 1

    monkeypatch.setattr(
        public_access,
        "enforce_rate_limit",
        fake_enforce_rate_limit,
    )

    await public_access.enforce_public_access(
        request=make_request(),
        response=Response(),
        token=token,
        action="test",
        ip_limit=60,
        token_limit=30,
        window_seconds=60,
    )

    assert len(calls) == 2

    assert calls[0]["action"] == "public:test:ip"
    assert calls[0]["identity"] == "203.0.113.10"

    assert calls[1]["action"] == "public:test:token"
    assert calls[1]["identity"] == hash_token(token)

    assert token not in calls[1]["identity"]


@pytest.mark.asyncio
async def test_malformed_token_is_rejected_after_ip_limit(monkeypatch):
    calls = []

    async def fake_enforce_rate_limit(**kwargs):
        calls.append(kwargs)
        return 1

    monkeypatch.setattr(
        public_access,
        "enforce_rate_limit",
        fake_enforce_rate_limit,
    )

    with pytest.raises(HTTPException) as exc:
        await public_access.enforce_public_access(
            request=make_request(),
            response=Response(),
            token="../invalid",
            action="test",
            ip_limit=60,
            token_limit=30,
            window_seconds=60,
        )

    assert exc.value.status_code == 404
    assert exc.value.detail == "Document not found or invalid link"
    assert len(calls) == 1
    assert calls[0]["action"] == "public:test:ip"


@pytest.mark.asyncio
async def test_public_routes_reject_malformed_tokens():
    paths = [
        "/invoices/share/invalid",
        "/invoices/share/invalid/pdf",
        "/quotes/share/invalid",
        "/quotes/share/invalid/pdf",
        "/receipts/share/invalid",
        "/receipts/share/invalid/pdf",
        "/share/invalid",
        "/share/invalid/comments",
    ]

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        for path in paths:
            response = await client.get(path)
            assert response.status_code == 404, (
                f"{path}: expected 404, got " f"{response.status_code}: {response.text}"
            )


@pytest.mark.asyncio
async def test_public_route_rate_limit_runs_before_document_lookup(monkeypatch):
    token, _ = generate_share_token()

    async def reject_request(**kwargs):
        raise HTTPException(
            status_code=429,
            detail="Too many attempts.",
            headers={"Retry-After": "60"},
        )

    monkeypatch.setattr(
        public_access,
        "enforce_rate_limit",
        reject_request,
    )

    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        response = await client.get(f"/invoices/share/{token}")

    assert response.status_code == 429
    assert response.headers["Retry-After"] == "60"
