import uuid
from datetime import date, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_financial_dashboard_and_metrics_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 0: Auth & Workspace Setup
        test_email = f"creator-{uuid.uuid4().hex[:6]}@metrics.design"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        assert req_res.status_code == 200
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # Setup Client
        c_res = await client.post(
            "/clients",
            json={
                "name": "Global Media Partner",
                "email": "pay@globalmedia.co",
                "phone": "+234 812 000 1111",
                "preferred_currency": "NGN",
            },
        )
        client_id = c_res.json()["id"]

        today = date.today()

        # 1. NGN Draft (100,000 NGN)
        await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "items": [{"description": "Draft Scope", "quantity": 1, "unit_price_minor": 10000000}],
            },
        )

        # 2. NGN Sent (Future Due: 250,000 NGN) -> Outstanding
        inv_ngn_sent = (
            await client.post(
                "/invoices",
                json={
                    "client_id": client_id,
                    "currency": "NGN",
                    "due_date": (today + timedelta(days=7)).isoformat(),
                    "items": [{"description": "Web Dev Phase 1", "quantity": 1, "unit_price_minor": 25000000}],
                },
            )
        ).json()
        await client.post(f"/invoices/{inv_ngn_sent['id']}/send")

        # 3. NGN Overdue (Past Due: 150,000 NGN) -> Overdue & Outstanding
        inv_ngn_overdue = (
            await client.post(
                "/invoices",
                json={
                    "client_id": client_id,
                    "currency": "NGN",
                    "due_date": (today - timedelta(days=3)).isoformat(),
                    "items": [{"description": "Old Graphic Assets", "quantity": 1, "unit_price_minor": 15000000}],
                },
            )
        ).json()
        await client.post(f"/invoices/{inv_ngn_overdue['id']}/send")

        # 4. NGN Paid (300,000 NGN) -> Paid this month
        inv_ngn_paid = (
            await client.post(
                "/invoices",
                json={
                    "client_id": client_id,
                    "currency": "NGN",
                    "items": [{"description": "Brand Sprint", "quantity": 1, "unit_price_minor": 30000000}],
                },
            )
        ).json()
        token_paid = inv_ngn_paid["share_token"]
        claim_res = await client.post(
            f"/share/{token_paid}/claim",
            json={"amount_minor": 30000000, "reference": "NIP/FULL/PAID"},
        )
        claim_id = claim_res.json()["id"]
        await client.post(f"/invoices/{inv_ngn_paid['id']}/claims/{claim_id}/confirm")

        # 5. USD Sent ($1,200 = 120,000 cents) -> Outstanding
        inv_usd_sent = (
            await client.post(
                "/invoices",
                json={
                    "client_id": client_id,
                    "currency": "USD",
                    "due_date": (today + timedelta(days=14)).isoformat(),
                    "items": [{"description": "US Consulting", "quantity": 1, "unit_price_minor": 120000}],
                },
            )
        ).json()
        await client.post(f"/invoices/{inv_usd_sent['id']}/send")

        # 6. USD Paid ($500 = 50,000 cents) -> Paid this month
        inv_usd_paid = (
            await client.post(
                "/invoices",
                json={
                    "client_id": client_id,
                    "currency": "USD",
                    "items": [{"description": "US Retainer", "quantity": 1, "unit_price_minor": 50000}],
                },
            )
        ).json()
        claim_usd = await client.post(
            f"/share/{inv_usd_paid['share_token']}/claim",
            json={"amount_minor": 50000, "reference": "WIRE/USD/PAID"},
        )
        await client.post(f"/invoices/{inv_usd_paid['id']}/claims/{claim_usd.json()['id']}/confirm")

        # Verify US-DSH-01: Currency-Segregated Metrics
        metrics_res = await client.get("/invoices/metrics")
        assert metrics_res.status_code == 200
        metrics = metrics_res.json()
        assert len(metrics) >= 2

        metrics_by_curr = {m["currency"]: m for m in metrics}
        assert "NGN" in metrics_by_curr
        assert "USD" in metrics_by_curr

        ngn_m = metrics_by_curr["NGN"]
        # Outstanding = 250k + 150k = 40,000,000 kobo
        assert ngn_m["outstanding_minor"] == 40000000
        # Overdue = 150,000 NGN = 15,000,000 kobo
        assert ngn_m["overdue_minor"] == 15000000
        # Paid this month = 300,000 NGN = 30,000,000 kobo
        assert ngn_m["paid_this_month_minor"] == 30000000

        usd_m = metrics_by_curr["USD"]
        # Outstanding = $1,200 = 120,000 cents
        assert usd_m["outstanding_minor"] == 120000
        assert usd_m["overdue_minor"] == 0
        assert usd_m["paid_this_month_minor"] == 50000

        # Verify US-DSH-02: Complete Invoice State Machine & Filter
        # Overdue filter
        overdue_res = await client.get("/invoices?status=overdue")
        assert overdue_res.status_code == 200
        overdue_invoices = overdue_res.json()
        assert len(overdue_invoices) == 1
        assert overdue_invoices[0]["id"] == inv_ngn_overdue["id"]

        # Paid filter
        paid_res = await client.get("/invoices?status=paid")
        assert paid_res.status_code == 200
        paid_invoices = paid_res.json()
        assert len(paid_invoices) == 2
        paid_ids = {inv["id"] for inv in paid_invoices}
        assert inv_ngn_paid["id"] in paid_ids
        assert inv_usd_paid["id"] in paid_ids

        # Currency filter
        usd_filter_res = await client.get("/invoices?currency=USD")
        assert usd_filter_res.status_code == 200
        usd_invoices = usd_filter_res.json()
        assert len(usd_invoices) == 2
        for inv in usd_invoices:
            assert inv["currency"] == "USD"
