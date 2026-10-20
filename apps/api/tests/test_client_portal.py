import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_client_portal_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 0: Freelancer Auth & Setup
        test_email = f"creator-{uuid.uuid4().hex[:6]}@portal.design"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        assert req_res.status_code == 200
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # Setup NGN Payment Profile
        await client.post(
            "/payments/profiles",
            json={
                "currency": "NGN",
                "bank_name": "Zenith Bank",
                "account_name": "Portal Media Ltd",
                "account_number": "1029384756",
                "is_default": True
            }
        )

        # Setup Client
        c_res = await client.post(
            "/clients",
            json={
                "name": "Lagos Tech Ventures",
                "email": "pay@lagostech.ng",
                "phone": "+234 803 999 8888",
                "preferred_currency": "NGN"
            }
        )
        client_id = c_res.json()["id"]

        # Create Invoice
        inv_res = await client.post(
            "/invoices",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "items": [
                    {"description": "Q4 Strategy Deck", "quantity": 1, "unit_price_minor": 50000000},
                ],
                "discount_minor": 0,
                "tax_rate_percent": 0.0,
            }
        )
        inv = inv_res.json()
        inv_id = inv["id"]
        token = inv["share_token"]

        # Send Invoice -> Status becomes 'sent'
        send_res = await client.post(f"/invoices/{inv_id}/send")
        assert send_res.status_code == 200
        assert send_res.json()["invoice"]["status"] == "sent"

        # Now, create an UNAUTHENTICATED client simulating the payer (US-CLV-01)
        async with AsyncClient(transport=transport, base_url="http://test") as payer_client:
            # 1. Zero-Friction View (US-CLV-01)
            view_res = await payer_client.get(f"/share/{token}")
            assert view_res.status_code == 200
            portal_data = view_res.json()
            assert portal_data["invoice"]["status"] == "viewed"
            assert portal_data["invoice"]["invoice_number"] == inv["invoice_number"]

            # 2. 1-Tap Copy Bank Details (US-CLV-02)
            assert portal_data["payment_profile"] is not None
            assert portal_data["payment_profile"]["bank_name"] == "Zenith Bank"
            assert portal_data["payment_profile"]["account_number"] == "1029384756"

            # 3. Viral Acquisition Footer (US-CLV-04)
            assert portal_data["show_viral_footer"] is True
            assert "Powered by bagg." in portal_data["viral_footer_text"]
            assert "utm_source=invoice_footer" in portal_data["viral_footer_link"]

            # 4. Post Line-Item Question / Comment (US-CLV-03)
            cmt_res = await payer_client.post(
                f"/share/{token}/comments",
                json={
                    "author_name": "Tunde (Finance Director)",
                    "message": "Can you confirm if the deliverables include editable Figma files?"
                }
            )
            assert cmt_res.status_code == 201
            cmt_data = cmt_res.json()
            assert cmt_data["author_name"] == "Tunde (Finance Director)"
            assert cmt_data["is_from_client"] is True

            # 5. Verify Comment shows on reload
            reload_res = await payer_client.get(f"/share/{token}")
            assert len(reload_res.json()["comments"]) == 1
            assert reload_res.json()["comments"][0]["message"] == "Can you confirm if the deliverables include editable Figma files?"
