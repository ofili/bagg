import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_delivery_and_immutability_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 0: Auth
        test_email = f"creator-{uuid.uuid4().hex[:6]}@lagos.media"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # Create Client with phone (US-DEL-02)
        client_res = await client.post(
            "/clients",
            json={
                "name": "Kofi Mensah Media",
                "email": "kofi@mensah.gh",
                "phone": "+233 24 123 4567",
                "preferred_currency": "GHS",
                "default_payment_terms_days": 14,
            }
        )
        assert client_res.status_code == 201
        client_id = client_res.json()["id"]

        # Create Draft Invoice
        draft_res = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "GHS",
                "items": [
                    {"description": "Content Production", "quantity": 1, "unit_price_minor": 1500000},
                ],
                "discount_minor": 100000,
                "tax_rate_percent": 0.0,
            }
        )
        assert draft_res.status_code == 201
        inv = draft_res.json()
        inv_id = inv["id"]
        old_token = inv["share_token"]
        assert inv["status"] == "draft"
        assert inv["version"] == 1

        # 1. Send Invoice (US-DEL-01, US-DEL-02, US-DEL-03)
        send_res = await client.post(f"/invoices/{inv_id}/send")
        assert send_res.status_code == 200
        send_data = send_res.json()
        assert send_data["invoice"]["status"] == "sent"
        assert send_data["invoice"]["sent_at"] is not None
        assert send_data["email_sent"] is True
        assert send_data["recipient_email"] == "kofi@mensah.gh"
        assert "https://wa.me/233241234567" in send_data["whatsapp_url"]
        assert "Kofi+Mensah+Media" in send_data["whatsapp_url"] or "Kofi%20Mensah%20Media" in send_data["whatsapp_url"]

        # 2. Immutability Guard: Direct PATCH on sent invoice must fail (US-DEL-05)
        patch_attempt = await client.patch(
            f"/invoices/{inv_id}",
            json={"notes": "Illegal direct edit"}
        )
        assert patch_attempt.status_code == 400
        assert "immutable" in patch_attempt.json()["detail"].lower()

        # 3. Immutability Versioning: Create Revision (US-DEL-05)
        revise_res = await client.post(
            f"/invoices/{inv_id}/revise",
            json={
                "items": [
                    {"description": "Content Production (Extended Cut)", "quantity": 1, "unit_price_minor": 2000000},
                ],
                "discount_minor": 0,
                "notes": "Revised scope per client request",
                "reason": "Client requested extra revisions"
            }
        )
        assert revise_res.status_code == 200
        revised_inv = revise_res.json()
        assert revised_inv["version"] == 2
        assert revised_inv["total_minor"] == 2000000
        assert revised_inv["last_revised_at"] is not None

        # 4. Audit Revisions Endpoint
        revisions_res = await client.get(f"/invoices/{inv_id}/revisions")
        assert revisions_res.status_code == 200
        revisions_list = revisions_res.json()
        assert len(revisions_list) == 1
        assert revisions_list[0]["version"] == 1
        assert revisions_list[0]["total_minor"] == 1400000  # 1,500,000 - 100,000

        # 5. Public Client View: Verifies Revision Banner (US-DEL-05, US-CLV-01)
        public_view = await client.get(f"/share/{revised_inv['share_token']}")
        assert public_view.status_code == 200
        pv_data = public_view.json()
        assert pv_data["is_revised"] is True
        assert "This invoice was revised" in pv_data["revision_banner"]
        assert "(Revision 2)" in pv_data["revision_banner"]

        # 6. Regenerate Cryptographic Share Token (US-DEL-01)
        regen_res = await client.post(f"/invoices/{inv_id}/share-link/regenerate")
        assert regen_res.status_code == 200
        new_token = regen_res.json()["share_token"]
        assert new_token != old_token

        # Old share link returns 404
        old_view = await client.get(f"/share/{old_token}")
        assert old_view.status_code == 404

        # New share link works
        new_view = await client.get(f"/share/{new_token}")
        assert new_view.status_code == 200

        # 7. Deterministic PDF / HTML View (US-DEL-04)
        pdf_res = await client.get(f"/invoices/{inv_id}/pdf")
        assert pdf_res.status_code == 200
        assert "INVOICE" in pdf_res.text
        assert "Content Production (Extended Cut)" in pdf_res.text
