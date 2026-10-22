import uuid
from datetime import date, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from app.core.config import settings
from app.main import app
from tests.helpers import sign_paystack

WEBHOOK_SECRET = "sk_test_subscription_webhook_secret"


async def post_signed_webhook(client: AsyncClient, payload: dict):
    body, signature = sign_paystack(payload, WEBHOOK_SECRET)
    return await client.post(
        "/webhooks/paystack",
        content=body,
        headers={
            "content-type": "application/json",
            "x-paystack-signature": signature,
        },
    )


@pytest.mark.asyncio
async def test_subscriptions_and_monetization_lifecycle(monkeypatch):
    monkeypatch.setattr(settings, "PAYSTACK_SECRET_KEY", WEBHOOK_SECRET)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 0: Auth & Workspace Setup
        test_email = f"creator-{uuid.uuid4().hex[:6]}@monetization.africa"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        assert req_res.status_code == 200
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # Fetch current workspace
        ws_res = await client.get("/workspaces/current")
        assert ws_res.status_code == 200
        workspace_id = ws_res.json()["id"]

        # Client with email
        c_res = await client.post(
            "/clients",
            json={
                "name": "Eko Media Group",
                "email": "invoicing@ekomedia.ng",
                "phone": "+234 801 234 5678",
                "preferred_currency": "NGN",
            },
        )
        client_id = c_res.json()["id"]

        # 1. US-SUB-01: Free Tier Metering & Delivery Quotas
        # Create 4 invoices
        inv_ids = []
        for i in range(4):
            inv = (
                await client.post(
                    "/invoices",
                    json={
                        "client_id": client_id,
                        "currency": "NGN",
                        "items": [{"description": f"Service Item {i+1}", "quantity": 1, "unit_price_minor": 1000000}],
                    },
                )
            ).json()
            # Finalize each draft before sending (US-INV-04)
            fin = await client.post(f"/invoices/{inv['id']}/finalize")
            assert fin.status_code == 200
            inv_ids.append(inv["id"])

        # Send 1st (Free 1/3)
        res1 = await client.post(f"/invoices/{inv_ids[0]}/send")
        assert res1.status_code == 200

        # Send 2nd (Free 2/3)
        res2 = await client.post(f"/invoices/{inv_ids[1]}/send")
        assert res2.status_code == 200

        # Send 3rd (Free 3/3)
        res3 = await client.post(f"/invoices/{inv_ids[2]}/send")
        assert res3.status_code == 200

        # Send 4th -> MUST fail with HTTP 402 Payment Required
        res4 = await client.post(f"/invoices/{inv_ids[3]}/send")
        assert res4.status_code == 402
        assert "free delivery sends" in res4.json()["detail"]

        # 2. US-SUB-06: Credit Pack Purchase & Ledger Deduction
        # Buy top-up pack checkout request
        pack_req = await client.post("/billing/credits/buy", json={"pack": "200_credits", "currency": "NGN"})
        assert pack_req.status_code == 200
        pack_ref = pack_req.json()["reference"]

        unsigned_pack = await client.post(
            "/webhooks/paystack",
            json={
                "event": "charge.success",
                "data": {
                    "reference": pack_ref,
                    "amount": 200000,
                    "currency": "NGN",
                    "metadata": {
                        "workspace_id": workspace_id,
                        "type": "credit_pack",
                        "credits": 200,
                    },
                },
            },
        )
        assert unsigned_pack.status_code == 400
        assert (await client.get("/billing/credits")).json()["balance"] == 0

        # Simulate Paystack Webhook for Credit Pack purchase
        wh_pack_res = await post_signed_webhook(
            client,
            {
                "event": "charge.success",
                "data": {
                    "reference": pack_ref,
                    "amount": 200000,
                    "currency": "NGN",
                    "metadata": {
                        "workspace_id": workspace_id,
                        "type": "credit_pack",
                        "credits": 200,
                    },
                },
            },
        )
        assert wh_pack_res.status_code == 200

        # Check credits balance
        credits_res = await client.get("/billing/credits")
        assert credits_res.status_code == 200
        assert credits_res.json()["balance"] == 200

        # Now send 4th invoice -> Should SUCCEED by deducting 1 credit
        res4_retry = await client.post(f"/invoices/{inv_ids[3]}/send")
        assert res4_retry.status_code == 200

        # Verify credit balance decremented to 199
        credits_after = await client.get("/billing/credits")
        assert credits_after.json()["balance"] == 199

        # 3. US-SUB-02 & US-SUB-03: Paystack Checkout & Instant Upgrade Provisioning
        checkout_res = await client.post(
            "/billing/checkout",
            json={"plan": "creator_pro", "currency": "NGN"},
        )
        assert checkout_res.status_code == 200
        sub_ref = checkout_res.json()["reference"]

        # Simulate Paystack Webhook for Creator Pro subscription activation
        wh_sub_res = await post_signed_webhook(
            client,
            {
                "event": "charge.success",
                "data": {
                    "reference": sub_ref,
                    "amount": 1400000,
                    "currency": "NGN",
                    "subscription_code": "SUB_DEMO_001",
                    "customer": {"customer_code": "CUST_DEMO_001"},
                    "metadata": {
                        "workspace_id": workspace_id,
                        "plan": "creator_pro",
                    },
                },
            },
        )
        assert wh_sub_res.status_code == 200

        # Verify workspace tier upgraded to 'creator_pro'
        sub_status = await client.get("/billing/subscription")
        assert sub_status.status_code == 200
        assert sub_status.json()["tier"] == "creator_pro"
        assert sub_status.json()["status"] == "active"

        # Verify public invoice portal suppresses Bagg footer for Pro subscribers (US-CLV-04)
        token = res1.json()["invoice"]["share_token"]
        public_view = await client.get(f"/share/{token}")
        assert public_view.status_code == 200
        assert public_view.json()["show_viral_footer"] is False

        # 4. US-SUB-04: Failed Renewal, Dunning & Grace Period
        wh_fail_res = await post_signed_webhook(
            client,
            {
                "event": "invoice.payment_failed",
                "data": {
                    "reference": f"fail_{uuid.uuid4().hex[:6]}",
                    "metadata": {"workspace_id": workspace_id},
                },
            },
        )
        assert wh_fail_res.status_code == 200

        sub_dunning = await client.get("/billing/subscription")
        assert sub_dunning.json()["status"] == "past_due"
        assert sub_dunning.json()["in_grace_period"] is True

        # 5. US-SUB-05: In-App Self-Serve Cancellation
        cancel_res = await client.post("/billing/subscription/cancel")
        assert cancel_res.status_code == 200
        cancel_data = cancel_res.json()
        assert cancel_data["cancel_at_period_end"] is True
        assert cancel_data["tier"] == "creator_pro"
