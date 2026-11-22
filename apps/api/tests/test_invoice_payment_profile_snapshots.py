import asyncio
import uuid
from contextlib import asynccontextmanager
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.errors import BadRequestException
from app.domains.invoices import service as invoice_service
from app.domains.invoices.models import Invoice
from app.domains.invoices.repository import InvoiceRepository
from app.domains.payments.models import PaymentProfile
from app.domains.payments import service as payment_service
from app.domains.workspaces.models import Workspace
from app.main import app
from tests.helpers import login_code_for


@asynccontextmanager
async def authenticated_client():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        email = f"invoice-profile-{uuid.uuid4().hex[:12]}@example.com"

        response = await client.post(
            "/auth/magic-link",
            json={"email": email},
        )
        assert response.status_code in (200, 202), response.text

        response = await client.post(
            "/auth/verify",
            json={
                "email": email,
                "code": login_code_for(email),
                "intent": "signup",
                "full_name": "Invoice Profile Test",
            },
        )
        assert response.status_code == 200, response.text

        session_cookie = response.cookies.get("bagg_session")
        assert session_cookie, "Signup did not return a session cookie."

        client.cookies.set("bagg_session", session_cookie)

        yield client, response.json()["workspace"]["id"]


async def create_profile(client: AsyncClient, payload: dict) -> dict:
    challenge_response = await client.post(
        "/security/step-up/request",
        json={
            "purpose": "payment_profile_create",
            "resource_type": "payment_profile",
            "resource_id": None,
            "payload": payload,
        },
    )

    assert challenge_response.status_code == 202, challenge_response.text

    challenge = challenge_response.json()

    verify_response = await client.post(
        "/security/step-up/verify",
        json={
            "challenge_id": challenge["challenge_id"],
            "code": challenge["code"],
        },
    )

    assert verify_response.status_code == 200, verify_response.text

    response = await client.post(
        "/payments/profiles",
        json=payload,
        headers={
            "X-Security-Challenge-ID": challenge["challenge_id"],
        },
    )

    assert response.status_code == 201, response.text
    return response.json()


async def create_invoice(
    client: AsyncClient,
    *,
    payment_profile_id: str | None = None,
    currency: str = "NGN",
) -> dict:
    client_response = await client.post(
        "/clients",
        json={
            "name": "Payment Profile Test Client",
            "email": f"client-{uuid.uuid4().hex[:8]}@example.com",
            "preferred_currency": currency,
            "default_payment_terms_days": 14,
        },
    )

    assert client_response.status_code == 201, client_response.text

    payload = {
        "client_id": client_response.json()["id"],
        "currency": currency,
        "items": [
            {
                "description": "Design services",
                "quantity": 1,
                "unit_price_minor": 25000000,
            },
        ],
        "discount_minor": 0,
        "tax_rate_percent": 0,
    }

    if payment_profile_id is not None:
        payload["payment_profile_id"] = payment_profile_id

    response = await client.post("/invoices", json=payload)

    assert response.status_code == 201, response.text
    return response.json()


async def finalize_invoice(client: AsyncClient, invoice_id: str):
    response = await client.post(
        f"/invoices/{invoice_id}/finalize",
    )
    return response


async def public_invoice(client: AsyncClient, token: str):
    return await client.get(f"/share/{token}")


def bank_profile(
    *,
    bank_name: str,
    account_name: str,
    account_number: str,
    is_default: bool = True,
) -> dict:
    return {
        "currency": "NGN",
        "bank_name": bank_name,
        "account_name": account_name,
        "account_number": account_number,
        "instructions": f"Use invoice number for {bank_name} transfers.",
        "is_default": is_default,
    }


@pytest.mark.asyncio
async def test_explicit_profile_wins_over_default_and_missing_selection_captures_default():
    async with authenticated_client() as (client, _):
        profile_a = await create_profile(
            client,
            bank_profile(
                bank_name="Bank A",
                account_name="Account A",
                account_number="1111111111",
            ),
        )

        profile_b = await create_profile(
            client,
            bank_profile(
                bank_name="Bank B",
                account_name="Account B",
                account_number="2222222222",
            ),
        )

        assert profile_b["is_default"] is True
        assert profile_a["is_default"] is False

        # Explicitly selected A must be used even though B is the default.
        invoice_a = await create_invoice(
            client,
            payment_profile_id=profile_a["id"],
        )

        response = await finalize_invoice(client, invoice_a["id"])
        assert response.status_code == 200, response.text

        public_a = await public_invoice(
            client,
            invoice_a["share_token"],
        )

        assert public_a.status_code == 200, public_a.text
        assert public_a.json()["payment_profile"]["id"] == profile_a["id"]
        assert public_a.json()["payment_profile"]["bank_name"] == "Bank A"

        # With no explicit profile, finalisation captures the usable default.
        invoice_default = await create_invoice(client)

        response = await finalize_invoice(client, invoice_default["id"])
        assert response.status_code == 200, response.text

        public_default = await public_invoice(
            client,
            invoice_default["share_token"],
        )

        assert public_default.status_code == 200, public_default.text
        assert public_default.json()["payment_profile"]["id"] == profile_b["id"]
        assert public_default.json()["payment_profile"]["bank_name"] == "Bank B"


@pytest.mark.asyncio
async def test_profile_from_another_workspace_is_rejected_on_create_and_update():
    async with authenticated_client() as (client_a, _):
        async with authenticated_client() as (client_b, _):
            foreign_profile = await create_profile(
                client_b,
                bank_profile(
                    bank_name="Foreign Bank",
                    account_name="Foreign Account",
                    account_number="3333333333",
                ),
            )

            # A profile belonging to workspace B cannot be selected by A.
            create_response = await client_a.post(
                "/clients",
                json={
                    "name": "Workspace A Client",
                    "email": f"a-{uuid.uuid4().hex[:8]}@example.com",
                    "preferred_currency": "NGN",
                },
            )
            assert create_response.status_code == 201

            invoice_payload = {
                "client_id": create_response.json()["id"],
                "currency": "NGN",
                "payment_profile_id": foreign_profile["id"],
                "items": [
                    {
                        "description": "Services",
                        "quantity": 1,
                        "unit_price_minor": 1000000,
                    },
                ],
                "discount_minor": 0,
                "tax_rate_percent": 0,
            }

            response = await client_a.post(
                "/invoices",
                json=invoice_payload,
            )
            assert response.status_code == 404, response.text

            # The same ownership rule applies when updating a draft.
            invoice = await create_invoice(client_a)

            response = await client_a.patch(
                f"/invoices/{invoice['id']}",
                json={
                    "payment_profile_id": foreign_profile["id"],
                },
            )

            assert response.status_code == 404, response.text


@pytest.mark.asyncio
async def test_profile_currency_must_match_invoice_currency_on_create_and_update():
    async with authenticated_client() as (client, _):
        usd_profile = await create_profile(
            client,
            {
                "currency": "USD",
                "payment_link": "https://pay.example.com/account",
                "instructions": "Pay in USD.",
                "is_default": True,
            },
        )

        create_response = await client.post(
            "/clients",
            json={
                "name": "Currency Test Client",
                "email": f"currency-{uuid.uuid4().hex[:8]}@example.com",
                "preferred_currency": "NGN",
            },
        )
        assert create_response.status_code == 201

        response = await client.post(
            "/invoices",
            json={
                "client_id": create_response.json()["id"],
                "currency": "NGN",
                "payment_profile_id": usd_profile["id"],
                "items": [
                    {
                        "description": "Services",
                        "quantity": 1,
                        "unit_price_minor": 1000000,
                    },
                ],
                "discount_minor": 0,
                "tax_rate_percent": 0,
            },
        )

        assert response.status_code == 400, response.text

        invoice = await create_invoice(client, currency="NGN")

        response = await client.patch(
            f"/invoices/{invoice['id']}",
            json={
                "payment_profile_id": usd_profile["id"],
            },
        )

        assert response.status_code == 400, response.text


@pytest.mark.asyncio
async def test_incomplete_selected_profile_is_rejected_at_finalisation():
    async with authenticated_client() as (client, workspace_id):
        async with AsyncSessionLocal() as db:
            incomplete = PaymentProfile(
                workspace_id=workspace_id,
                currency="NGN",
                bank_name="Incomplete Bank",
                account_name=None,
                account_number="4444444444",
                is_default=True,
            )
            db.add(incomplete)
            await db.commit()
            await db.refresh(incomplete)
            profile_id = incomplete.id

        invoice = await create_invoice(
            client,
            payment_profile_id=profile_id,
        )

        response = await finalize_invoice(client, invoice["id"])

        assert response.status_code == 400, response.text
        assert "incomplete payment instructions" in response.text.lower()


@pytest.mark.asyncio
async def test_issued_invoice_keeps_snapshot_after_profile_edit_delete_and_reissue():
    async with authenticated_client() as (client, workspace_id):
        profile = await create_profile(
            client,
            bank_profile(
                bank_name="Original Bank",
                account_name="Original Account",
                account_number="5555555555",
            ),
        )

        invoice = await create_invoice(
            client,
            payment_profile_id=profile["id"],
        )

        response = await finalize_invoice(client, invoice["id"])
        assert response.status_code == 200, response.text

        original_token = invoice["share_token"]

        # Edit the live profile after issuance.
        async with AsyncSessionLocal() as db:
            await payment_service.update_payment_profile(
                db,
                workspace_id,
                profile["id"],
                {
                    "bank_name": "Changed Bank",
                    "account_name": "Changed Account",
                    "account_number": "9999999999",
                    "instructions": "These are the new instructions.",
                },
            )

        response = await public_invoice(client, original_token)
        assert response.status_code == 200, response.text

        profile_response = response.json()["payment_profile"]
        assert profile_response["bank_name"] == "Original Bank"
        assert profile_response["account_name"] == "Original Account"
        assert profile_response["account_number"] == "5555555555"

        # Deleting the live profile must not delete the invoice snapshot.
        async with AsyncSessionLocal() as db:
            await payment_service.delete_payment_profile(
                db,
                workspace_id,
                profile["id"],
            )

        response = await public_invoice(client, original_token)
        assert response.status_code == 200, response.text
        assert response.json()["payment_profile"]["bank_name"] == "Original Bank"

        # Recall and reissue must not replace the original snapshot.
        recall_response = await client.post(
            f"/invoices/{invoice['id']}/recall",
            json={"reason": "Reissue test"},
        )
        assert recall_response.status_code == 200, recall_response.text

        reissue_response = await finalize_invoice(client, invoice["id"])
        assert reissue_response.status_code == 200, reissue_response.text

        reissued = reissue_response.json()

        public_reissued = await public_invoice(
            client,
            reissued["share_token"],
        )

        assert public_reissued.status_code == 200, public_reissued.text
        assert public_reissued.json()["payment_profile"]["bank_name"] == "Original Bank"
        assert (
            public_reissued.json()["payment_profile"]["account_number"] == "5555555555"
        )


@pytest.mark.asyncio
async def test_legacy_invoice_without_snapshot_uses_current_usable_default():
    async with authenticated_client() as (client, workspace_id):
        await create_profile(
            client,
            bank_profile(
                bank_name="Old Bank",
                account_name="Old Account",
                account_number="6666666666",
            ),
        )

        current_default = await create_profile(
            client,
            bank_profile(
                bank_name="Current Default Bank",
                account_name="Current Default Account",
                account_number="7777777777",
            ),
        )

        invoice = await create_invoice(client)

        response = await finalize_invoice(client, invoice["id"])
        assert response.status_code == 200, response.text

        # Simulate an issued legacy invoice predating profile snapshots.
        async with AsyncSessionLocal() as db:
            record = await db.get(Invoice, invoice["id"])
            assert record is not None
            record.payment_profile_snapshot = None
            await db.commit()

        public_response = await public_invoice(
            client,
            invoice["share_token"],
        )

        assert public_response.status_code == 200, public_response.text
        assert public_response.json()["payment_profile"]["id"] == current_default["id"]
        assert (
            public_response.json()["payment_profile"]["bank_name"]
            == "Current Default Bank"
        )


@pytest.mark.asyncio
async def test_invoice_without_any_payment_profile_remains_publicly_accessible():
    async with authenticated_client() as (client, _):
        invoice = await create_invoice(client)

        response = await finalize_invoice(client, invoice["id"])
        assert response.status_code == 200, response.text

        public_response = await public_invoice(
            client,
            invoice["share_token"],
        )

        assert public_response.status_code == 200, public_response.text
        assert public_response.json()["invoice"]["id"] == invoice["id"]
        assert public_response.json()["payment_profile"] is None


async def run_finalisation_against_profile_mutation(
    *,
    workspace_id: str,
    invoice_id: str,
    profile_id: str,
    mutation: str,
    monkeypatch,
):
    workspace_lock_requested = asyncio.Event()

    original = InvoiceRepository.get_workspace_for_update

    async def observed_workspace_lock(self, requested_workspace_id):
        workspace_lock_requested.set()
        return await original(self, requested_workspace_id)

    monkeypatch.setattr(
        InvoiceRepository,
        "get_workspace_for_update",
        observed_workspace_lock,
    )

    async with AsyncSessionLocal() as blocker:
        result = await blocker.execute(
            select(Workspace).where(Workspace.id == workspace_id).with_for_update()
        )
        locked_workspace = result.scalar_one()

        workspace = SimpleNamespace(
            id=locked_workspace.id,
            owner_id=locked_workspace.owner_id,
        )

        async def finalize_in_separate_transaction():
            async with AsyncSessionLocal() as finalise_db:
                return await invoice_service.finalize_invoice(
                    finalise_db,
                    workspace,
                    invoice_id,
                )

        finalise_task = asyncio.create_task(finalize_in_separate_transaction())

        # Wait until finalisation has reached the workspace lock boundary.
        await asyncio.wait_for(
            workspace_lock_requested.wait(),
            timeout=5,
        )

        if mutation == "update":
            await payment_service.update_payment_profile(
                blocker,
                workspace_id,
                profile_id,
                {
                    "instructions": "Updated while finalisation was waiting.",
                },
            )
        elif mutation == "delete":
            await payment_service.delete_payment_profile(
                blocker,
                workspace_id,
                profile_id,
            )
        else:
            raise AssertionError(f"Unknown mutation: {mutation}")

        return await asyncio.wait_for(finalise_task, timeout=10)


@pytest.mark.asyncio
async def test_finalisation_serializes_with_profile_update(monkeypatch):
    async with authenticated_client() as (client, workspace_id):
        profile = await create_profile(
            client,
            bank_profile(
                bank_name="Concurrency Bank",
                account_name="Concurrency Account",
                account_number="8888888888",
            ),
        )

        invoice = await create_invoice(
            client,
            payment_profile_id=profile["id"],
        )

        finalized, _ = await run_finalisation_against_profile_mutation(
            workspace_id=workspace_id,
            invoice_id=invoice["id"],
            profile_id=profile["id"],
            mutation="update",
            monkeypatch=monkeypatch,
        )

        assert finalized.payment_profile_snapshot is not None
        assert (
            finalized.payment_profile_snapshot["instructions"]
            == "Updated while finalisation was waiting."
        )


@pytest.mark.asyncio
async def test_finalisation_serializes_with_profile_deletion(monkeypatch):
    async with authenticated_client() as (client, workspace_id):
        profile = await create_profile(
            client,
            bank_profile(
                bank_name="Deletion Race Bank",
                account_name="Deletion Race Account",
                account_number="9999999998",
            ),
        )

        invoice = await create_invoice(
            client,
            payment_profile_id=profile["id"],
        )

        with pytest.raises(BadRequestException):
            await run_finalisation_against_profile_mutation(
                workspace_id=workspace_id,
                invoice_id=invoice["id"],
                profile_id=profile["id"],
                mutation="delete",
                monkeypatch=monkeypatch,
            )
