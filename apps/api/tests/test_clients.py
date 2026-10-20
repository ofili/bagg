import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_clients_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 0: Auth - login with unique email
        test_email = f"agency-{uuid.uuid4().hex[:6]}@lagos.design"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # 1. Create client with full details (US-CLI-01)
        res_full = await client.post(
            "/clients",
            json={
                "name": "Acme Global Inc.",
                "email": "finance@acmeglobal.com",
                "phone": "+1 415 555 2671",
                "address": "100 Market St, San Francisco, CA",
                "country": "US",
                "preferred_currency": "USD",
                "default_payment_terms_days": 30,
                "tax_id": "US-EIN-987654321",
                "notes": "Prefers Net-30 invoicing"
            }
        )
        assert res_full.status_code == 201
        c1 = res_full.json()
        assert c1["name"] == "Acme Global Inc."
        assert c1["email"] == "finance@acmeglobal.com"
        assert c1["preferred_currency"] == "USD"
        assert c1["default_payment_terms_days"] == 30
        c1_id = c1["id"]

        # 2. Create WhatsApp / Phone-Only Client without email (US-CLI-01)
        res_phone = await client.post(
            "/clients",
            json={
                "name": "Alaba Electronics Vendor",
                "phone": "+234 802 345 6789",
                "preferred_currency": "NGN",
                "default_payment_terms_days": 7
            }
        )
        assert res_phone.status_code == 201
        c2 = res_phone.json()
        assert c2["name"] == "Alaba Electronics Vendor"
        assert c2["email"] is None
        assert c2["phone"] == "+234 802 345 6789"
        assert c2["preferred_currency"] == "NGN"
        assert c2["default_payment_terms_days"] == 7
        c2_id = c2["id"]

        # 3. Currency validation: Reject unsupported currency
        res_bad_currency = await client.post(
            "/clients",
            json={
                "name": "Invalid Currency Client",
                "preferred_currency": "XYZ"
            }
        )
        assert res_bad_currency.status_code == 422

        # 4. List clients & search (US-CLI-01)
        list_res = await client.get("/clients")
        assert list_res.status_code == 200
        all_clients = list_res.json()
        assert len(all_clients) == 2

        search_res = await client.get("/clients?q=Alaba")
        assert search_res.status_code == 200
        search_results = search_res.json()
        assert len(search_results) == 1
        assert search_results[0]["id"] == c2_id

        # 5. Filter by currency
        filter_usd = await client.get("/clients?currency=USD")
        assert filter_usd.status_code == 200
        usd_clients = filter_usd.json()
        assert len(usd_clients) == 1
        assert usd_clients[0]["id"] == c1_id

        # 6. Get Client Detail & Balance Summary (US-CLI-02)
        detail_res = await client.get(f"/clients/{c1_id}")
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["name"] == "Acme Global Inc."
        assert "invoices" in detail_data
        assert detail_data["total_invoiced_minor"] == 0
        assert detail_data["total_outstanding_minor"] == 0

        # 7. Update client (US-CLI-01)
        patch_res = await client.patch(
            f"/clients/{c2_id}",
            json={
                "email": "vendor@alaba.ng",
                "default_payment_terms_days": 10
            }
        )
        assert patch_res.status_code == 200
        updated_c2 = patch_res.json()
        assert updated_c2["email"] == "vendor@alaba.ng"
        assert updated_c2["default_payment_terms_days"] == 10

        # 8. Delete client
        del_res = await client.delete(f"/clients/{c2_id}")
        assert del_res.status_code == 204

        # Verify 404 after deletion
        get_deleted = await client.get(f"/clients/{c2_id}")
        assert get_deleted.status_code == 404
