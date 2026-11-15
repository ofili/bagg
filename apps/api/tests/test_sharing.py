import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import AsyncSessionLocal
from app.domains.payments.models import PaymentProfile
from app.main import app
from tests.helpers import login_code_for


@pytest.mark.asyncio
async def test_public_invoice_omits_unusable_legacy_payment_profile():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        # Authenticate a new workspace.
        email = f"sharing-{uuid.uuid4().hex[:12]}@example.com"

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
        assert verify_response.status_code == 200, verify_response.text

        client.cookies.set(
            "bagg_session",
            verify_response.cookies["bagg_session"],
        )

        workspace_id = verify_response.json()["workspace"]["id"]

        # Create a client.
        client_response = await client.post(
            "/clients",
            json={
                "name": "Legacy Client",
                "email": f"billing-{uuid.uuid4().hex[:8]}@example.com",
                "preferred_currency": "NGN",
                "default_payment_terms_days": 14,
            },
        )
        assert client_response.status_code == 201, client_response.text

        client_id = client_response.json()["id"]

        # Create an invoice.
        invoice_response = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "items": [
                    {
                        "description": "Design services",
                        "quantity": 1,
                        "unit_price_minor": 25000000,
                    },
                ],
                "discount_minor": 0,
                "tax_rate_percent": 0,
            },
        )
        assert invoice_response.status_code == 201, invoice_response.text

        invoice = invoice_response.json()

        # Issue the invoice so its public link is accessible.
        finalize_response = await client.post(
            f"/invoices/{invoice['id']}/finalize",
        )
        assert finalize_response.status_code == 200, finalize_response.text

        # Simulate a legacy record that predates strict payment-profile
        # validation. The bank name and account number exist, but the
        # account name is missing.
        async with AsyncSessionLocal() as db:
            legacy_profile = PaymentProfile(
                workspace_id=workspace_id,
                currency="NGN",
                bank_name="Guaranty Trust Bank",
                account_name=None,
                account_number="0123456789",
                is_default=True,
            )

            db.add(legacy_profile)
            await db.commit()

        # The public invoice must remain available, but incomplete
        # payment instructions must not be presented to the client.
        public_response = await client.get(
            f"/share/{invoice['share_token']}",
        )

        assert public_response.status_code == 200, public_response.text

        public_invoice = public_response.json()

        assert public_invoice["invoice"]["id"] == invoice["id"]
        assert public_invoice["payment_profile"] is None
