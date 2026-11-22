import uuid
from datetime import date, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from tests.helpers import create_sent_invoice, login_code_for, set_workspace_tier


def month_start(offset: int) -> date:
    today = date.today()
    index = today.year * 12 + today.month - 1 + offset
    return date(index // 12, index % 12 + 1, 1)


@pytest.mark.asyncio
async def test_invoice_metrics_history_zero_fills_and_separates_currencies():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_email = f"history-{uuid.uuid4().hex[:6]}@metrics.design"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        assert req_res.status_code == 200
        code = login_code_for(test_email)
        verify_res = await client.post(
            "/auth/verify",
            json={
                "email": test_email,
                "code": code,
                "full_name": "History Tester",
                "intent": "signup",
            },
        )
        assert verify_res.status_code == 200, verify_res.text
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        ws_res = await client.get("/workspaces/current")
        assert ws_res.status_code == 200
        await set_workspace_tier(ws_res.json()["id"])

        client_res = await client.post(
            "/clients",
            json={
                "name": "History Client",
                "email": "history@client.co",
                "preferred_currency": "NGN",
            },
        )
        assert client_res.status_code < 400, client_res.text
        client_id = client_res.json()["id"]

        two_months_ago = month_start(-2)
        last_month = month_start(-1)
        this_month = month_start(0)

        # Issued two months ago and still unpaid.
        await create_sent_invoice(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "issue_date": two_months_ago.isoformat(),
                "due_date": (two_months_ago + timedelta(days=14)).isoformat(),
                "items": [
                    {
                        "description": "Historical strategy work",
                        "quantity": 1,
                        "unit_price_minor": 25000000,
                    }
                ],
            },
        )

        # Issued and paid last month. The receipt keeps the claim's payment date.
        paid_last_month = await create_sent_invoice(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "issue_date": last_month.isoformat(),
                "due_date": (last_month + timedelta(days=14)).isoformat(),
                "items": [
                    {
                        "description": "Retainer",
                        "quantity": 1,
                        "unit_price_minor": 12000000,
                    }
                ],
            },
        )
        claim_res = await client.post(
            f"/share/{paid_last_month['share_token']}/claim",
            json={
                "amount_minor": 12000000,
                "payment_date": last_month.isoformat(),
                "reference": "HISTORY-NGN",
            },
        )
        assert claim_res.status_code == 201, claim_res.text
        confirm_res = await client.post(
            f"/invoices/{paid_last_month['id']}/claims/"
            f"{claim_res.json()['id']}/confirm"
        )
        assert confirm_res.status_code == 200, confirm_res.text

        # A current-month USD invoice keeps currency buckets separate.
        await create_sent_invoice(
            client,
            {
                "client_id": client_id,
                "currency": "USD",
                "issue_date": this_month.isoformat(),
                "due_date": (this_month + timedelta(days=14)).isoformat(),
                "items": [
                    {
                        "description": "US consulting",
                        "quantity": 1,
                        "unit_price_minor": 50000,
                    }
                ],
            },
        )

        # Drafts must not count as billed.
        draft_res = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "issue_date": this_month.isoformat(),
                "items": [
                    {
                        "description": "Not sent yet",
                        "quantity": 1,
                        "unit_price_minor": 99000000,
                    }
                ],
            },
        )
        assert draft_res.status_code == 201, draft_res.text

        # A currency whose only invoice is outside the window still gets
        # zero-filled months so currency switching never loses the series.
        old_eur_month = month_start(-10)
        old_eur_res = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "EUR",
                "issue_date": old_eur_month.isoformat(),
                "due_date": (old_eur_month + timedelta(days=14)).isoformat(),
                "items": [
                    {
                        "description": "Old euro draft",
                        "quantity": 1,
                        "unit_price_minor": 75000,
                    }
                ],
            },
        )
        assert old_eur_res.status_code == 201, old_eur_res.text

        history_res = await client.get("/invoices/metrics/history")
        assert history_res.status_code == 200, history_res.text
        rows = history_res.json()

        ngn = [row for row in rows if row["currency"] == "NGN"]
        usd = [row for row in rows if row["currency"] == "USD"]
        eur = [row for row in rows if row["currency"] == "EUR"]
        assert len(ngn) == 6
        assert len(usd) == 6
        assert len(eur) == 6
        assert all(
            row["invoiced_minor"] == 0 and row["collected_minor"] == 0 for row in eur
        )
        assert [row["month"] for row in ngn] == [
            month_start(offset).strftime("%Y-%m") for offset in range(-5, 1)
        ]

        ngn_by_month = {row["month"]: row for row in ngn}
        assert (
            ngn_by_month[two_months_ago.strftime("%Y-%m")]["invoiced_minor"] == 25000000
        )
        assert ngn_by_month[two_months_ago.strftime("%Y-%m")]["collected_minor"] == 0
        assert ngn_by_month[last_month.strftime("%Y-%m")]["invoiced_minor"] == 12000000
        assert ngn_by_month[last_month.strftime("%Y-%m")]["collected_minor"] == 12000000
        assert ngn_by_month[this_month.strftime("%Y-%m")]["invoiced_minor"] == 0
        assert ngn_by_month[this_month.strftime("%Y-%m")]["collected_minor"] == 0

        usd_by_month = {row["month"]: row for row in usd}
        assert usd_by_month[this_month.strftime("%Y-%m")]["invoiced_minor"] == 50000
        assert usd_by_month[this_month.strftime("%Y-%m")]["collected_minor"] == 0

        short_res = await client.get("/invoices/metrics/history?months=3")
        assert short_res.status_code == 200
        short_ngn = [row for row in short_res.json() if row["currency"] == "NGN"]
        assert [row["month"] for row in short_ngn] == [
            month_start(offset).strftime("%Y-%m") for offset in range(-2, 1)
        ]

        invalid_res = await client.get("/invoices/metrics/history?months=2")
        assert invalid_res.status_code == 422
