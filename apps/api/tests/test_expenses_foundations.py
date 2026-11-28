import pytest
import uuid
from types import SimpleNamespace
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from tests.test_quotes import authenticate_test_user
from app.core.database import AsyncSessionLocal
from app.domains.engagements.models import Engagement
from app.domains.expenses.service import evaluate_expense_policy

@pytest.mark.asyncio
async def test_quote_expense_policy_and_engagement_snapshot():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Authenticate Freelancer
        test_email = f"expenses-{uuid.uuid4().hex[:6]}@studio.ng"
        await authenticate_test_user(client, test_email)

        # 2. Setup Client
        cl_res = await client.post(
            "/clients",
            json={
                "name": "FilmOne Studios",
                "email": "finance@filmone.ng",
                "phone": "+2348011223344",
                "preferred_currency": "NGN",
                "default_payment_terms_days": 14,
            },
        )
        assert cl_res.status_code == 201
        client_id = cl_res.json()["id"]

        # 3. Create Quote with Expense Policy (FR-080)
        quote_payload = {
            "client_id": client_id,
            "currency": "NGN",
            "validity_days": 14,
            "items": [
                {
                    "description": "Principal Photography",
                    "quantity": 1,
                    "unit_price_minor": 1200000_00,  # 1,200,000 NGN
                }
            ],
            "deposit_percentage": 50.0,
            "has_expense_policy": True,
            "expense_policy": {
                "reimbursable_categories": ["travel", "props", "studio_hire"],
                "per_expense_threshold_minor": 50000_00,  # 50,000 NGN
                "total_expense_cap_minor": 400000_00,     # 400,000 NGN
                "client_approval_required": True,
            },
            "notes": "Filming and production engagement with agreed expense policy",
        }

        q_res = await client.post("/quotes", json=quote_payload)
        assert q_res.status_code == 201
        quote_data = q_res.json()
        quote_id = quote_data["id"]
        assert quote_data["has_expense_policy"] is True
        assert quote_data["expense_policy"]["total_expense_cap_minor"] == 400000_00
        assert quote_data["expense_policy"]["per_expense_threshold_minor"] == 50000_00

        # 4. Finalize Quote to issue it
        fin_res = await client.post(f"/quotes/{quote_id}/finalize")
        assert fin_res.status_code == 200
        share_token = fin_res.json()["share_token"]

        # 5. Public View verification
        pub_res = await client.get(f"/quotes/share/{share_token}")
        assert pub_res.status_code == 200
        pub_data = pub_res.json()
        assert pub_data["has_expense_policy"] is True
        assert pub_data["expense_policy"]["total_expense_cap_minor"] == 400000_00

        # 6. Accept Quote as Client (AC-013)
        accept_res = await client.post(
            f"/quotes/share/{share_token}/accept",
            json={
                "agreed_to_terms": True,
                "accepted_by_name": "Tunde Kelani",
                "version": pub_data["version"],
            },
        )
        assert accept_res.status_code == 200
        assert accept_res.json()["status"] == "accepted"

        # 7. Verify Engagement and Commercial Baseline Snapshot in DB
        async with AsyncSessionLocal() as session:
            stmt = select(Engagement).where(Engagement.quote_id == quote_id)
            result = await session.execute(stmt)
            engagement = result.scalar_one_or_none()

            assert engagement is not None
            assert engagement.client_id == client_id
            assert engagement.currency == "NGN"
            assert engagement.status == "active"
            assert engagement.baseline_expense_cap_minor == 400000_00
            assert engagement.effective_expense_cap_minor == 400000_00
            assert engagement.per_expense_threshold_minor == 50000_00
            assert engagement.bagg_reference.startswith("BG-ENG-")

            baseline = engagement.commercial_baseline
            assert baseline is not None
            assert baseline["quote_id"] == quote_id
            assert baseline["total_minor"] == 1200000_00
            assert baseline["has_expense_policy"] is True
            assert baseline["expense_policy"]["total_expense_cap_minor"] == 400000_00
            assert baseline["accepted_by_name"] == "Tunde Kelani"


def test_expense_policy_does_not_require_threshold_approval_when_disabled():
    engagement = SimpleNamespace(
        effective_expense_cap_minor=200_000_00,
        per_expense_threshold_minor=50_000_00,
        expense_policy_snapshot={
            "client_approval_required": False,
        },
    )

    evaluation, approval_status = evaluate_expense_policy(
        amount_minor=75_000_00,
        current_billable_total_minor=0,
        engagement=engagement,
    )

    assert evaluation == "in_policy"
    assert approval_status == "not_required"


def test_expense_policy_cap_still_requires_approval_when_threshold_approval_disabled():
    engagement = SimpleNamespace(
        effective_expense_cap_minor=200_000_00,
        per_expense_threshold_minor=50_000_00,
        expense_policy_snapshot={
            "client_approval_required": False,
        },
    )

    evaluation, approval_status = evaluate_expense_policy(
        amount_minor=150_000_00,
        current_billable_total_minor=75_000_00,
        engagement=engagement,
    )

    assert evaluation == "exceeds_cap"
    assert approval_status == "pending_approval"


def test_expense_policy_defaults_to_approval_for_legacy_snapshots():
    engagement = SimpleNamespace(
        effective_expense_cap_minor=500_000_00,
        per_expense_threshold_minor=50_000_00,
        expense_policy_snapshot={},
    )

    evaluation, approval_status = evaluate_expense_policy(
        amount_minor=75_000_00,
        current_billable_total_minor=0,
        engagement=engagement,
    )

    assert evaluation == "needs_approval"
    assert approval_status == "pending_approval"
