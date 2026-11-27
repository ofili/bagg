import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.domains.engagements.models import Engagement
from app.main import app
from tests.test_quotes import authenticate_test_user


def token_from_url(url: str) -> str:
    """Approval links look like <web>/e/<token> or <web>/sc/<token>."""
    return url.rstrip("/").rsplit("/", 1)[-1]


@pytest.mark.asyncio
async def test_ac029_expenses_end_to_end_scenario():
    """AC-029: Full engagement-to-margin scenario with deposit, threshold, cap change, and non-billable cost."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Authenticate provider
        provider_email = f"ac029-{uuid.uuid4().hex[:6]}@studio.ng"
        await authenticate_test_user(client, provider_email)

        # 2. Create client
        cl_res = await client.post(
            "/clients",
            json={
                "name": "Nollywood Productions Ltd",
                "email": "accounts@nollywood.ng",
                "phone": "+2348022334455",
                "preferred_currency": "NGN",
                "default_payment_terms_days": 14,
            },
        )
        assert cl_res.status_code == 201
        client_id = cl_res.json()["id"]

        # 3. Create Quote: ₦1,200,000 fee, 50% deposit, ₦50,000 threshold, ₦400,000 cap
        q_res = await client.post(
            "/quotes",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "validity_days": 14,
                "items": [
                    {
                        "description": "Feature Film Production",
                        "quantity": 1,
                        "unit_price_minor": 1_200_000_00,
                    }
                ],
                "deposit_percentage": 50.0,
                "has_expense_policy": True,
                "expense_policy": {
                    "reimbursable_categories": ["props", "transport", "studio_hire", "location"],
                    "per_expense_threshold_minor": 50_000_00,
                    "total_expense_cap_minor": 400_000_00,
                    "client_approval_required": True,
                },
            },
        )
        assert q_res.status_code == 201
        quote_id = q_res.json()["id"]

        fin_res = await client.post(f"/quotes/{quote_id}/finalize")
        assert fin_res.status_code == 200
        quote_token = fin_res.json()["share_token"]

        # 4. Client accepts quote -> Engagement created with baseline snapshot
        acc_res = await client.post(
            f"/quotes/share/{quote_token}/accept",
            json={"accepted_by_name": "Chief Producer", "version": 1},
        )
        assert acc_res.status_code == 200

        async with AsyncSessionLocal() as session:
            eng = (
                await session.execute(select(Engagement).where(Engagement.quote_id == quote_id))
            ).scalar_one()
            engagement_id = eng.id

        # 5. Deposit invoice (50% = ₦600,000) finalized & paid
        dep_inv_res = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "items": [
                    {
                        "description": "50% Upfront Deposit — Feature Film Production",
                        "quantity": 1,
                        "unit_price_minor": 600_000_00,
                    }
                ],
            },
        )
        assert dep_inv_res.status_code == 201
        deposit_invoice_id = dep_inv_res.json()["id"]
        assert (await client.post(f"/invoices/{deposit_invoice_id}/finalize")).status_code == 200

        # Confirm deposit payment via receipt endpoint / payment claim
        claim_res = await client.post(
            f"/invoices/{deposit_invoice_id}/claims",
            json={"amount_minor": 600_000_00, "reference": "DEP-001"},
        )
        if claim_res.status_code in (200, 201):
            claim_id = claim_res.json()["id"]
            await client.post(
                f"/invoices/{deposit_invoice_id}/claims/{claim_id}/confirm",
                json={"amount_paid_minor": 600_000_00},
            )

        # 6. Record expenses:
        # ₦38,000 props (in policy)
        e1 = await client.post(
            "/expenses",
            json={
                "engagement_id": engagement_id,
                "amount_minor": 38_000_00,
                "currency": "NGN",
                "description": "Props",
                "category": "props",
                "billable": True,
            },
        )
        assert e1.status_code == 201
        assert e1.json()["approval_status"] == "not_required"

        # ₦24,000 transport (in policy)
        e2 = await client.post(
            "/expenses",
            json={
                "engagement_id": engagement_id,
                "amount_minor": 24_000_00,
                "currency": "NGN",
                "description": "Transport",
                "category": "transport",
                "billable": True,
            },
        )
        assert e2.status_code == 201
        assert e2.json()["approval_status"] == "not_required"

        # ₦180,000 studio hire (above ₦50,000 threshold -> needs client approval)
        e3 = await client.post(
            "/expenses",
            json={
                "engagement_id": engagement_id,
                "amount_minor": 180_000_00,
                "currency": "NGN",
                "description": "Studio Hire",
                "category": "studio_hire",
                "billable": True,
            },
        )
        assert e3.status_code == 201
        assert e3.json()["approval_status"] == "pending_approval"

        # Regenerate the studio-hire link: the old link must stop working and
        # the new one can be emailed to the client in the same request.
        studio_token = token_from_url(e3.json()["approval_url"])
        assert studio_token
        assert e3.json()["approval_url"].endswith(f"/e/{studio_token}")
        regen_e3 = await client.post(
            f"/expenses/{e3.json()['id']}/approval-link/regenerate",
            params={"send_email": "true"},
        )
        assert regen_e3.status_code == 200
        assert regen_e3.json()["approval_email_queued"] is True
        original_studio_token = studio_token
        studio_token = token_from_url(regen_e3.json()["approval_url"])
        assert studio_token != original_studio_token
        assert regen_e3.json()["approval_url"].endswith(f"/e/{studio_token}")
        assert (
            await client.get(f"/expenses/public/{original_studio_token}")
        ).status_code == 404
        assert (await client.get(f"/expenses/public/{studio_token}")).status_code == 200

        # Client approves ₦180,000 studio hire
        app_e3 = await client.post(
            f"/expenses/public/{studio_token}/approve",
            json={"approved_by_name": "Chief Producer"},
        )
        assert app_e3.status_code == 200
        assert app_e3.json()["approval_status"] == "approved"

        # An approved expense has no live link to regenerate.
        regen_approved = await client.post(
            f"/expenses/{e3.json()['id']}/approval-link/regenerate"
        )
        assert regen_approved.status_code == 400

        # ₦45,000 non-billable battery (for margin only)
        e4 = await client.post(
            "/expenses",
            json={
                "engagement_id": engagement_id,
                "amount_minor": 45_000_00,
                "currency": "NGN",
                "description": "Battery Pack",
                "billable": False,
            },
        )
        assert e4.status_code == 201
        assert e4.json()["billable"] is False

        # ₦260,000 rooftop expense -> total billable = 38k + 24k + 180k + 260k = 502k > 400k cap
        e5 = await client.post(
            "/expenses",
            json={
                "engagement_id": engagement_id,
                "amount_minor": 260_000_00,
                "currency": "NGN",
                "description": "Rooftop Location",
                "category": "location",
                "billable": True,
            },
        )
        assert e5.status_code == 201
        assert e5.json()["approval_status"] == "pending_approval"

        # Trigger scope-change request for cap exceedance (AC-019)
        sc_res = await client.post(
            f"/engagements/{engagement_id}/scope-changes",
            json={"expense_id": e5.json()["id"]},
        )
        assert sc_res.status_code == 201
        sc_token = token_from_url(sc_res.json()["approval_url"])
        assert sc_token
        assert sc_res.json()["approval_url"].endswith(f"/sc/{sc_token}")

        # Regenerate the cap-increase link and email the new one.
        regen_sc = await client.post(
            f"/engagements/scope-changes/{sc_res.json()['id']}/approval-link/regenerate",
            params={"send_email": "true"},
        )
        assert regen_sc.status_code == 200
        assert regen_sc.json()["approval_email_queued"] is True
        original_sc_token = sc_token
        sc_token = token_from_url(regen_sc.json()["approval_url"])
        assert sc_token != original_sc_token
        assert regen_sc.json()["approval_url"].endswith(f"/sc/{sc_token}")
        assert (
            await client.get(
                f"/engagements/scope-changes/public/{original_sc_token}"
            )
        ).status_code == 404
        assert (
            await client.get(f"/engagements/scope-changes/public/{sc_token}")
        ).status_code == 200

        sc_acc = await client.post(
            f"/engagements/scope-changes/public/{sc_token}/accept",
            json={"accepted_by_name": "Chief Producer"},
        )
        assert sc_acc.status_code == 200
        assert sc_acc.json()["status"] == "accepted"

        # An accepted scope change has no live link to regenerate.
        regen_accepted = await client.post(
            f"/engagements/scope-changes/{sc_res.json()['id']}/approval-link/regenerate"
        )
        assert regen_accepted.status_code == 400

        # 7. Create final invoice with ₦600,000 remaining fee + ₦502,000 expenses
        final_inv_res = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "items": [
                    {
                        "description": "Final 50% Fee — Feature Film Production",
                        "quantity": 1,
                        "unit_price_minor": 600_000_00,
                    }
                ],
            },
        )
        assert final_inv_res.status_code == 201
        final_invoice_id = final_inv_res.json()["id"]

        # Add the 4 billable expenses (₦502,000) to final draft invoice
        add_res = await client.post(
            "/expenses/add-to-invoice",
            json={
                "invoice_id": final_invoice_id,
                "expense_ids": [
                    e1.json()["id"],
                    e2.json()["id"],
                    e3.json()["id"],
                    e5.json()["id"],
                ],
            },
        )
        assert add_res.status_code == 200
        assert add_res.json()["total_added_minor"] == 502_000_00
        assert add_res.json()["invoice_total_minor"] == 1_102_000_00  # 600k + 502k

        # Negative test: non-billable expense cannot be added (AC-025)
        bad_nonbill = await client.post(
            "/expenses/add-to-invoice",
            json={"invoice_id": final_invoice_id, "expense_ids": [e4.json()["id"]]},
        )
        assert bad_nonbill.status_code == 400

        # Negative test: duplicate add refused (AC-022)
        bad_dup = await client.post(
            "/expenses/add-to-invoice",
            json={"invoice_id": final_invoice_id, "expense_ids": [e1.json()["id"]]},
        )
        assert bad_dup.status_code == 400

        # Finalize final invoice -> expenses marked invoiced
        assert (await client.post(f"/invoices/{final_invoice_id}/finalize")).status_code == 200

        # Negative test: cannot add to finalised invoice (AC-021)
        bad_final = await client.post(
            "/expenses/add-to-invoice",
            json={"invoice_id": final_invoice_id, "expense_ids": [e1.json()["id"]]},
        )
        assert bad_final.status_code == 400


@pytest.mark.asyncio
async def test_expenses_negative_guards_and_tenant_isolation():
    """AC-017, AC-018, AC-028: Declined expense, edited-after-approval invalidation, and cross-tenant isolation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client_a, AsyncClient(
        transport=transport, base_url="http://test"
    ) as client_b:
        await authenticate_test_user(client_a, f"ws-a-{uuid.uuid4().hex[:6]}@studio.ng")
        await authenticate_test_user(client_b, f"ws-b-{uuid.uuid4().hex[:6]}@studio.ng")

        cl_res = await client_a.post(
            "/clients",
            json={"name": "Tenant A Client", "preferred_currency": "NGN"},
        )
        assert cl_res.status_code == 201
        client_id = cl_res.json()["id"]

        q_res = await client_a.post(
            "/quotes",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "items": [{"description": "Design", "quantity": 1, "unit_price_minor": 100_000_00}],
                "has_expense_policy": True,
                "expense_policy": {
                    "reimbursable_categories": ["print"],
                    "per_expense_threshold_minor": 20_000_00,
                    "total_expense_cap_minor": 100_000_00,
                    "client_approval_required": True,
                },
            },
        )
        quote_id = q_res.json()["id"]
        fin_res = await client_a.post(f"/quotes/{quote_id}/finalize")
        await client_a.post(
            f"/quotes/share/{fin_res.json()['share_token']}/accept",
            json={"accepted_by_name": "Client A", "version": 1},
        )

        async with AsyncSessionLocal() as session:
            eng = (
                await session.execute(select(Engagement).where(Engagement.quote_id == quote_id))
            ).scalar_one()
            engagement_id = eng.id

        # Record expense above threshold (₦30,000 > ₦20,000)
        exp_res = await client_a.post(
            "/expenses",
            json={
                "engagement_id": engagement_id,
                "amount_minor": 30_000_00,
                "currency": "NGN",
                "description": "Large Print Run",
                "billable": True,
            },
        )
        assert exp_res.status_code == 201
        exp_id = exp_res.json()["id"]

        # Cross-tenant access rejected (AC-028)
        cross_list = await client_b.get(f"/expenses/engagement/{engagement_id}")
        assert cross_list.status_code == 200
        assert cross_list.json() == []
        cross_patch = await client_b.patch(f"/expenses/{exp_id}", json={"amount_minor": 10_000_00})
        assert cross_patch.status_code == 404
        cross_margin = await client_b.get(f"/engagements/{engagement_id}/margin")
        assert cross_margin.status_code == 404

        # Client approves, then provider edits amount -> approval invalidated (AC-018)
        tok = token_from_url(exp_res.json()["approval_url"])
        assert tok
        assert (
            await client_a.post(f"/expenses/public/{tok}/approve", json={"approved_by_name": "Client A"})
        ).status_code == 200

        edited = await client_a.patch(f"/expenses/{exp_id}", json={"amount_minor": 35_000_00})
        assert edited.status_code == 200
        assert edited.json()["approval_status"] == "pending_approval"

        # The edit rotated the link; the provider gets the new raw token once.
        tok2 = token_from_url(edited.json()["approval_url"])
        assert tok2
        assert tok2 != tok
        assert edited.json()["approval_url"].endswith(f"/e/{tok2}")

        # Client declines with new token -> cannot be added to invoice (AC-017)
        dec_res = await client_a.post(
            f"/expenses/public/{tok2}/decline",
            json={"reason": "Too expensive"},
        )
        assert dec_res.status_code == 200
        assert dec_res.json()["approval_status"] == "declined"

        bill_declined = await client_a.post(
            "/expenses/add-to-invoice",
            json={"expense_ids": [exp_id]},
        )
        assert bill_declined.status_code == 400
