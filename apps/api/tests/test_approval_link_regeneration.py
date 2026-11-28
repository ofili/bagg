"""Regeneration, rotation and scoping of client approval links.

Approval links are only issued once (only the hash is stored), so the API must hand them
to the provider at creation and let the provider reissue them."""

import uuid
from contextlib import asynccontextmanager

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.domains.expenses.models import Expense
from app.main import app
from tests.test_quotes import authenticate_test_user


def token_from_url(url: str) -> str:
    return url.rstrip("/").rsplit("/", 1)[-1]


@asynccontextmanager
async def provider():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await authenticate_test_user(client, f"links-{uuid.uuid4().hex[:8]}@studio.ng")
        yield client


async def _engagement(client: AsyncClient) -> str:
    cl = await client.post(
        "/clients",
        json={
            "name": "Link Test Client",
            "email": "pay@linktest.ng",
            "phone": "+2348011223344",
            "preferred_currency": "NGN",
            "default_payment_terms_days": 14,
        },
    )
    assert cl.status_code == 201
    q = await client.post(
        "/quotes",
        json={
            "client_id": cl.json()["id"],
            "currency": "NGN",
            "validity_days": 14,
            "items": [{"description": "Shoot", "quantity": 1, "unit_price_minor": 100_000_00}],
            "has_expense_policy": True,
            "expense_policy": {
                "reimbursable_categories": [],
                "per_expense_threshold_minor": 5_000_00,
                "total_expense_cap_minor": 10_000_00,
                "client_approval_required": True,
            },
        },
    )
    assert q.status_code == 201
    fin = await client.post(f"/quotes/{q.json()['id']}/finalize")
    assert fin.status_code == 200
    acc = await client.post(
        f"/quotes/share/{fin.json()['share_token']}/accept",
        json={"agreed_to_terms": True, "accepted_by_name": "Test Client", "version": 1},
    )
    assert acc.status_code == 200
    engagements = (await client.get("/engagements")).json()
    assert len(engagements) == 1
    return engagements[0]["id"]


async def _expense(client: AsyncClient, engagement_id: str, amount_minor: int):
    return await client.post(
        "/expenses",
        json={
            "engagement_id": engagement_id,
            "amount_minor": amount_minor,
            "currency": "NGN",
            "description": "Test expense",
            "billable": True,
        },
    )


@pytest.mark.asyncio
async def test_expense_link_issued_only_when_approval_needed_and_never_stored_raw():
    async with provider() as client:
        eid = await _engagement(client)

        in_policy = await _expense(client, eid, 1_000_00)
        assert in_policy.status_code == 201
        assert in_policy.json()["approval_status"] == "not_required"
        assert in_policy.json()["approval_url"] is None

        needs = await _expense(client, eid, 8_000_00)
        assert needs.status_code == 201
        body = needs.json()
        assert body["approval_status"] == "pending_approval"
        assert "/e/" in body["approval_url"]
        token = token_from_url(body["approval_url"])

        # The issued link works for the client
        view = await client.get(f"/expenses/public/{token}")
        assert view.status_code == 200

        # Only the hash is stored
        async with AsyncSessionLocal() as session:
            row = (
                await session.execute(select(Expense).where(Expense.id == body["id"]))
            ).scalar_one()
            assert row.approval_token_hash and row.approval_token_hash != token

        # Listing never re-exposes the link
        listed = await client.get(f"/expenses/engagement/{eid}")
        assert listed.status_code == 200
        assert all(e["approval_url"] is None for e in listed.json())


@pytest.mark.asyncio
async def test_regenerate_expense_link_rotates_token_and_rejects_ineligible():
    async with provider() as client:
        eid = await _engagement(client)
        needs = (await _expense(client, eid, 8_000_00)).json()
        old_token = token_from_url(needs["approval_url"])

        regen = await client.post(f"/expenses/{needs['id']}/approval-link/regenerate")
        assert regen.status_code == 200
        new_url = regen.json()["approval_url"]
        new_token = token_from_url(new_url)
        assert new_token != old_token
        assert regen.json()["approval_token_expires_at"]

        assert (await client.get(f"/expenses/public/{old_token}")).status_code == 404
        assert (await client.get(f"/expenses/public/{new_token}")).status_code == 200

        # Not eligible: in-policy expense has no approval link
        in_policy = (await _expense(client, eid, 500_00)).json()
        assert (await client.post(f"/expenses/{in_policy['id']}/approval-link/regenerate")).status_code == 400

        # Not eligible once the client has approved
        approve = await client.post(
            f"/expenses/public/{new_token}/approve", json={"approved_by_name": "Client"}
        )
        assert approve.status_code == 200
        assert (await client.post(f"/expenses/{needs['id']}/approval-link/regenerate")).status_code == 400

        # Unknown expense
        assert (await client.post("/expenses/does-not-exist/approval-link/regenerate")).status_code == 404


@pytest.mark.asyncio
async def test_regenerate_expense_link_is_workspace_scoped():
    async with provider() as owner, provider() as other:
        eid = await _engagement(owner)
        needs = (await _expense(owner, eid, 8_000_00)).json()
        res = await other.post(f"/expenses/{needs['id']}/approval-link/regenerate")
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_scope_change_link_issued_on_create_and_regenerable():
    async with provider() as client:
        eid = await _engagement(client)
        over = (await _expense(client, eid, 8_000_00)).json()  # pending, 8k of 10k cap
        over2 = (await _expense(client, eid, 6_000_00)).json()  # pushes past the cap

        created = await client.post(
            f"/engagements/{eid}/scope-changes", json={"expense_id": over2["id"]}
        )
        assert created.status_code == 201
        sc = created.json()
        assert "/sc/" in sc["approval_url"]
        old_token = token_from_url(sc["approval_url"])
        assert (await client.get(f"/engagements/scope-changes/public/{old_token}")).status_code == 200

        listed = await client.get(f"/engagements/{eid}/scope-changes")
        assert all(item["approval_url"] is None for item in listed.json())

        regen = await client.post(f"/engagements/scope-changes/{sc['id']}/approval-link/regenerate")
        assert regen.status_code == 200
        new_token = token_from_url(regen.json()["approval_url"])
        assert new_token != old_token
        assert (await client.get(f"/engagements/scope-changes/public/{old_token}")).status_code == 404

        accepted = await client.post(
            f"/engagements/scope-changes/public/{new_token}/accept",
            json={"accepted_by_name": "Client"},
        )
        assert accepted.status_code == 200

        # No new link once the request is no longer pending
        after = await client.post(f"/engagements/scope-changes/{sc['id']}/approval-link/regenerate")
        assert after.status_code == 400
        assert over["id"]


@pytest.mark.asyncio
async def test_scope_change_regenerate_is_workspace_scoped():
    async with provider() as owner, provider() as other:
        eid = await _engagement(owner)
        exp = (await _expense(owner, eid, 8_000_00)).json()
        sc = (
            await owner.post(f"/engagements/{eid}/scope-changes", json={"expense_id": exp["id"], "delta_amount_minor": 5_000_00})
        ).json()
        res = await other.post(f"/engagements/scope-changes/{sc['id']}/approval-link/regenerate")
        assert res.status_code == 404
