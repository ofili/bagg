import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.domains.lifecycle.models import DocumentStatusEvent
from app.domains.notifications.models import Notification
from app.main import app
from tests.helpers import (
    authenticate_test_user,
    create_sent_invoice,
    create_sent_quote,
)
from app.core import rate_limit as rate_limit_module
from app.domains.invoices import router as invoice_router
from app.domains.quotes import router as quote_router
from app.domains.receipts import router as receipt_router


PUBLIC_DOCUMENT_READ_ENDPOINTS = [
    ("/invoices/share/{token}", "invoice-portal"),
    ("/invoices/share/{token}/pdf", "invoice-pdf"),
    ("/quotes/share/{token}", "quote-portal"),
    ("/quotes/share/{token}/pdf", "quote-pdf"),
    ("/receipts/share/{token}", "receipt-portal"),
    ("/receipts/share/{token}/pdf", "receipt-pdf"),
]


def install_test_public_rate_limits(monkeypatch, dimension: str):
    """
    Keep the real public-access and rate-limit implementations, but
    reduce thresholds to make integration tests fast and deterministic.
    """
    assert dimension in {"ip", "token"}

    routers = [
        invoice_router,
        quote_router,
        receipt_router,
    ]

    for router_module in routers:
        original = router_module.enforce_public_access

        async def limited_enforce_public_access(
            *,
            request,
            response,
            token,
            action,
            ip_limit,
            token_limit,
            window_seconds,
            _original=original,
        ):
            await _original(
                request=request,
                response=response,
                token=token,
                action=action,
                ip_limit=2 if dimension == "ip" else 100,
                token_limit=100 if dimension == "ip" else 2,
                window_seconds=60,
            )

        monkeypatch.setattr(
            router_module,
            "enforce_public_access",
            limited_enforce_public_access,
        )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "endpoint",
    PUBLIC_DOCUMENT_READ_ENDPOINTS,
    ids=[item[1] for item in PUBLIC_DOCUMENT_READ_ENDPOINTS],
)
@pytest.mark.parametrize("dimension", ["ip", "token"])
async def test_public_document_read_endpoints_enforce_rate_limits(
    endpoint,
    dimension,
    monkeypatch,
):
    """
    Every public document portal/PDF endpoint must enforce both
    IP-based and token-based limits.

    IP test:
        Same client IP, different valid tokens.

    Token test:
        Same token, different client IPs.
    """
    path_template, _action = endpoint

    rate_limit_module._local_windows.clear()
    install_test_public_rate_limits(monkeypatch, dimension)

    shared_token = "A" * 43
    shared_ip = "192.0.2.10"

    for attempt in range(3):
        if dimension == "ip":
            client_ip = shared_ip
            # Distinct tokens ensure the token limit is not reached.
            token = str(attempt + 1).zfill(43)
        else:
            client_ip = f"192.0.2.{attempt + 10}"
            # Same token ensures the token limit is reached.
            token = shared_token

        transport = ASGITransport(
            app=app,
            client=(client_ip, 12345),
        )

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as public_client:
            response = await public_client.get(path_template.format(token=token))

        if attempt < 2:
            # The syntactically valid token is unknown, so the request
            # passes rate limiting and is rejected by document lookup.
            assert response.status_code == 404, response.text
        else:
            assert response.status_code == 429, response.text
            assert int(response.headers["Retry-After"]) > 0
            assert response.headers["X-RateLimit-Limit"] == "2"
            assert response.headers["X-RateLimit-Remaining"] == "0"

    rate_limit_module._local_windows.clear()


@pytest.mark.asyncio
async def test_public_document_rate_limits_are_action_scoped(monkeypatch):
    """
    Exhausting an invoice portal limit must not exhaust the invoice
    PDF limit. Each public action has its own rate-limit namespace.
    """
    rate_limit_module._local_windows.clear()
    install_test_public_rate_limits(monkeypatch, "ip")

    transport = ASGITransport(
        app=app,
        client=("192.0.2.50", 12345),
    )

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as public_client:
        # Exhaust the invoice portal IP limit using distinct tokens.
        for attempt in range(3):
            token = str(attempt + 1).zfill(43)

            response = await public_client.get(f"/invoices/share/{token}")

            if attempt < 2:
                assert response.status_code == 404, response.text
            else:
                assert response.status_code == 429, response.text

        # The PDF endpoint has a separate action key and must not
        # inherit the exhausted portal limit.
        pdf_response = await public_client.get(f"/invoices/share/{'Z' * 43}/pdf")

        assert pdf_response.status_code == 404, pdf_response.text

    rate_limit_module._local_windows.clear()


@pytest.mark.asyncio
async def test_public_document_first_view_is_atomic_and_idempotent():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as owner_client:
        email = f"public-views-{uuid.uuid4().hex[:8]}@studio.ng"
        await authenticate_test_user(owner_client, email)

        client_response = await owner_client.post(
            "/clients",
            json={
                "name": "Public View Test Client Ltd",
                "email": "public-views@example.com",
                "preferred_currency": "NGN",
            },
        )
        assert client_response.status_code == 201, client_response.text
        client_id = client_response.json()["id"]

        invoice = await create_sent_invoice(
            owner_client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "items": [
                    {
                        "description": "Invoice view test",
                        "quantity": 1,
                        "unit_price_minor": 100_000_00,
                    }
                ],
            },
        )

        quote = await create_sent_quote(
            owner_client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "items": [
                    {
                        "description": "Quote view test",
                        "quantity": 1,
                        "unit_price_minor": 150_000_00,
                    }
                ],
            },
        )

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as public_client:
            # First invoice view.
            invoice_first = await public_client.get(
                f"/invoices/share/{invoice['share_token']}"
            )
            assert invoice_first.status_code == 200, invoice_first.text

            first_invoice_data = invoice_first.json()
            assert first_invoice_data["status"] == "viewed"
            assert first_invoice_data["viewed_at"] is not None

            # Repeated invoice view must preserve the original timestamp.
            invoice_second = await public_client.get(
                f"/invoices/share/{invoice['share_token']}"
            )
            assert invoice_second.status_code == 200, invoice_second.text
            assert invoice_second.json()["viewed_at"] == first_invoice_data["viewed_at"]

            # First quote view.
            quote_first = await public_client.get(
                f"/quotes/share/{quote['share_token']}"
            )
            assert quote_first.status_code == 200, quote_first.text

            first_quote_data = quote_first.json()
            assert first_quote_data["status"] == "viewed"
            assert first_quote_data["viewed_at"] is not None

            # Repeated quote view must preserve the original timestamp.
            quote_second = await public_client.get(
                f"/quotes/share/{quote['share_token']}"
            )
            assert quote_second.status_code == 200, quote_second.text
            assert quote_second.json()["viewed_at"] == first_quote_data["viewed_at"]

        # Verify committed state from a fresh database session.
        async with AsyncSessionLocal() as db:
            notification_result = await db.execute(
                select(Notification).where(
                    Notification.document_id.in_([invoice["id"], quote["id"]]),
                    Notification.type.in_(["invoice_viewed", "quote_viewed"]),
                )
            )
            notifications = list(notification_result.scalars().all())

            event_result = await db.execute(
                select(DocumentStatusEvent).where(
                    DocumentStatusEvent.document_id.in_([invoice["id"], quote["id"]]),
                    DocumentStatusEvent.source == "client_view",
                )
            )
            events = list(event_result.scalars().all())

        assert len(notifications) == 2
        assert len(events) == 2

        assert {(item.document_id, item.type) for item in notifications} == {
            (invoice["id"], "invoice_viewed"),
            (quote["id"], "quote_viewed"),
        }

        assert {(event.document_id, event.document_type) for event in events} == {
            (invoice["id"], "invoice"),
            (quote["id"], "quote"),
        }


@pytest.mark.asyncio
async def test_revoked_invoice_and_quote_tokens_cannot_access_portal_or_pdf():
    """
    A commercial revision must revoke the previous public link.

    Verify revocation through the actual unauthenticated portal and PDF
    endpoints, then verify that a newly issued link works.
    """
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as owner_client:
        email = f"revoked-links-{uuid.uuid4().hex[:8]}@studio.ng"
        await authenticate_test_user(owner_client, email)

        client_response = await owner_client.post(
            "/clients",
            json={
                "name": "Revoked Link Test Client Ltd",
                "email": f"revoked-{uuid.uuid4().hex[:8]}@example.com",
                "preferred_currency": "NGN",
            },
        )
        assert client_response.status_code == 201, client_response.text
        client_id = client_response.json()["id"]

        invoice = await create_sent_invoice(
            owner_client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "items": [
                    {
                        "description": "Original invoice scope",
                        "quantity": 1,
                        "unit_price_minor": 100_000_00,
                    }
                ],
            },
        )

        quote = await create_sent_quote(
            owner_client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "items": [
                    {
                        "description": "Original quote scope",
                        "quantity": 1,
                        "unit_price_minor": 150_000_00,
                    }
                ],
            },
        )

        original_invoice_token = invoice["share_token"]
        original_quote_token = quote["share_token"]

        assert original_invoice_token
        assert original_quote_token

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as public_client:
            # ---------------------------------------------------------
            # 1. Establish that both original links are valid.
            # ---------------------------------------------------------
            invoice_before = await public_client.get(
                f"/invoices/share/{original_invoice_token}"
            )
            assert invoice_before.status_code == 200, invoice_before.text

            quote_before = await public_client.get(
                f"/quotes/share/{original_quote_token}"
            )
            assert quote_before.status_code == 200, quote_before.text

        # -------------------------------------------------------------
        # 2. Revise the invoice. This invalidates its existing token.
        # -------------------------------------------------------------
        invoice_revision = await owner_client.post(
            f"/invoices/{invoice['id']}/revise",
            json={
                "items": [
                    {
                        "description": "Revised invoice scope",
                        "quantity": 1,
                        "unit_price_minor": 125_000_00,
                    }
                ],
                "reason": "Agreed scope adjustment",
                "notes": "Revised commercial terms",
            },
        )
        assert invoice_revision.status_code == 200, invoice_revision.text

        revised_invoice = invoice_revision.json()
        assert revised_invoice["status"] == "draft"
        assert revised_invoice["share_token"] is None
        assert revised_invoice["version"] == invoice["version"] + 1

        # -------------------------------------------------------------
        # 3. Revise the quote. This invalidates its existing token.
        # -------------------------------------------------------------
        quote_revision = await owner_client.post(
            f"/quotes/{quote['id']}/revise",
            json={
                "items": [
                    {
                        "description": "Revised quote scope",
                        "quantity": 1,
                        "unit_price_minor": 175_000_00,
                    }
                ],
                "reason": "Agreed scope adjustment",
                "notes": "Revised commercial terms",
            },
        )
        assert quote_revision.status_code == 200, quote_revision.text

        revised_quote = quote_revision.json()
        assert revised_quote["status"] == "draft"
        assert revised_quote["share_token"] is None
        assert revised_quote["version"] == quote["version"] + 1

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as public_client:
            # ---------------------------------------------------------
            # 4. Old invoice token must fail on both public endpoints.
            # ---------------------------------------------------------
            revoked_invoice_portal = await public_client.get(
                f"/invoices/share/{original_invoice_token}"
            )
            assert revoked_invoice_portal.status_code == 404

            revoked_invoice_pdf = await public_client.get(
                f"/invoices/share/{original_invoice_token}/pdf"
            )
            assert revoked_invoice_pdf.status_code == 404

            # ---------------------------------------------------------
            # 5. Old quote token must fail on both public endpoints.
            # ---------------------------------------------------------
            revoked_quote_portal = await public_client.get(
                f"/quotes/share/{original_quote_token}"
            )
            assert revoked_quote_portal.status_code == 404

            revoked_quote_pdf = await public_client.get(
                f"/quotes/share/{original_quote_token}/pdf"
            )
            assert revoked_quote_pdf.status_code == 404

        # -------------------------------------------------------------
        # 6. Reissue both documents and verify replacement tokens.
        # -------------------------------------------------------------
        invoice_finalize = await owner_client.post(
            f"/invoices/{invoice['id']}/finalize"
        )
        assert invoice_finalize.status_code == 200, invoice_finalize.text

        new_invoice_token = invoice_finalize.json()["share_token"]
        assert new_invoice_token
        assert new_invoice_token != original_invoice_token

        quote_finalize = await owner_client.post(f"/quotes/{quote['id']}/finalize")
        assert quote_finalize.status_code == 200, quote_finalize.text

        quote_send = await owner_client.post(f"/quotes/{quote['id']}/send")
        assert quote_send.status_code == 200, quote_send.text

        new_quote_token = quote_send.json()["share_token"]
        assert new_quote_token
        assert new_quote_token != original_quote_token

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as public_client:
            # Replacement links must work.
            new_invoice_portal = await public_client.get(
                f"/invoices/share/{new_invoice_token}"
            )
            assert new_invoice_portal.status_code == 200, new_invoice_portal.text

            new_quote_portal = await public_client.get(
                f"/quotes/share/{new_quote_token}"
            )
            assert new_quote_portal.status_code == 200, new_quote_portal.text


@pytest.mark.asyncio
async def test_public_document_endpoints_reject_invalid_and_unknown_tokens():
    """
    Public document endpoints must reject malformed and unknown tokens
    consistently without disclosing document existence or internal errors.
    """
    transport = ASGITransport(app=app)

    malformed_tokens = [
        "short",
        "contains spaces and invalid characters",
        "invalid/token",
        "x" * 129,
    ]

    # Valid token shape and length, but no corresponding document.
    unknown_token = "A" * 43

    endpoints = [
        "/invoices/share/{token}",
        "/invoices/share/{token}/pdf",
        "/quotes/share/{token}",
        "/quotes/share/{token}/pdf",
        "/receipts/share/{token}",
        "/receipts/share/{token}/pdf",
    ]

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as public_client:
        for token in malformed_tokens:
            for endpoint in endpoints:
                response = await public_client.get(endpoint.format(token=token))

                assert response.status_code == 404, (
                    f"{endpoint}: expected 404 for malformed token "
                    f"{token!r}, got {response.status_code}: {response.text}"
                )

        for endpoint in endpoints:
            response = await public_client.get(endpoint.format(token=unknown_token))

            assert response.status_code == 404, (
                f"{endpoint}: expected 404 for unknown token, "
                f"got {response.status_code}: {response.text}"
            )

            # Do not reveal whether a document exists or why access failed.
            assert "traceback" not in response.text.lower()
            assert "sqlalchemy" not in response.text.lower()
            assert "database" not in response.text.lower()
