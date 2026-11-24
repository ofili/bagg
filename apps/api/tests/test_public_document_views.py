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
