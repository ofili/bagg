"""
Lifecycle 12: Data Rights, Compliance, Security & Auditability
Tests: US-SEC-01 (One-Click Data Export & Portability),
       US-SEC-02 (Abuse Reporting & Phishing Protection),
       US-SEC-03 (Right to Erasure / Account Deletion)
"""
import uuid
import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_data_rights_compliance_and_security_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # --- Auth ---
        test_email = f"compliance-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # --- Setup: Payment Profile ---
        pp = await client.post("/payments/profiles", json={
            "currency": "NGN",
            "bank_name": "First Bank",
            "account_name": "Compliance Studio Ltd",
            "account_number": "1234567890",
            "is_default": True,
        })
        assert pp.status_code == 201

        # --- Setup: Client ---
        cl = await client.post("/clients", json={
            "name": "Export Test Corp",
            "email": "finance@exporttest.ng",
            "preferred_currency": "NGN",
            "default_payment_terms_days": 30,
        })
        assert cl.status_code == 201
        client_id = cl.json()["id"]

        # --- Setup: Create & Send Invoice ---
        inv = await client.post("/invoices", json={
            "client_id": client_id,
            "currency": "NGN",
            "due_date": str(date.today() + timedelta(days=30)),
            "items": [
                {"description": "Compliance Audit Report", "quantity": 1, "unit_price_minor": 10_000_000},
            ],
            "tax_rate_percent": 7.5,
        })
        assert inv.status_code == 201
        inv_data = inv.json()

        send_res = await client.post(f"/invoices/{inv_data['id']}/send")
        assert send_res.status_code == 200

        # ===================================================================
        # US-SEC-01: One-Click Data Export — CSV
        # ===================================================================
        csv_res = await client.get("/compliance/export/csv")
        assert csv_res.status_code == 200
        assert csv_res.headers["content-type"].startswith("text/csv")
        assert "attachment" in csv_res.headers.get("content-disposition", "")

        csv_body = csv_res.text
        assert "=== CLIENTS ===" in csv_body
        assert "=== INVOICES ===" in csv_body
        assert "Export Test Corp" in csv_body
        assert inv_data["invoice_number"] in csv_body

        # ===================================================================
        # US-SEC-01: One-Click Data Export — ZIP
        # ===================================================================
        zip_res = await client.get("/compliance/export/zip")
        assert zip_res.status_code == 200
        assert zip_res.headers["content-type"] == "application/zip"
        assert "attachment" in zip_res.headers.get("content-disposition", "")
        # ZIP magic bytes: PK\x03\x04
        assert zip_res.content[:2] == b"PK"

        # ===================================================================
        # US-SEC-02: Abuse Reporting (Public Endpoint)
        # ===================================================================
        share_token = inv_data["share_token"]

        # Submit abuse report (no auth required)
        abuse_res = await client.post(f"/share/{share_token}/report-abuse", json={
            "reporter_email": "worried-recipient@example.com",
            "reporter_name": "Concerned Citizen",
            "reason": "This invoice looks suspicious and may be a phishing attempt targeting our company.",
        })
        assert abuse_res.status_code == 201
        abuse = abuse_res.json()
        assert abuse["status"] == "pending"
        assert abuse["invoice_id"] == inv_data["id"]
        assert abuse["reason"].startswith("This invoice looks suspicious")

        # Reason too short should fail
        short_abuse = await client.post(f"/share/{share_token}/report-abuse", json={
            "reason": "spam",
        })
        assert short_abuse.status_code == 422  # validation error

        # ===================================================================
        # US-SEC-03: Right to Erasure — Account Deletion
        # ===================================================================

        # Wrong confirmation phrase should fail
        bad_delete = await client.post("/compliance/delete-account", json={
            "confirmation_phrase": "delete",
        })
        assert bad_delete.status_code == 400

        # Correct deletion
        delete_res = await client.post("/compliance/delete-account", json={
            "confirmation_phrase": "DELETE MY ACCOUNT",
            "reason": "Testing NDPA compliance",
        })
        assert delete_res.status_code == 200
        del_data = delete_res.json()
        assert del_data["status"] == "deleted"
        assert "NDPA" in del_data["message"]
        assert del_data["data_purge_scheduled_at"] is not None

        # ---- Verify all data is gone ----

        # Re-login with same email should create a fresh account
        req2 = await client.post("/auth/magic-link", json={"email": test_email})
        code2 = req2.json()["dev_code"]
        verify2 = await client.post("/auth/verify", json={"email": test_email, "code": code2})
        client.cookies.set("bagg_session", verify2.cookies["bagg_session"])

        # No invoices should exist
        inv_list = await client.get("/invoices")
        assert inv_list.status_code == 200
        assert len(inv_list.json()) == 0

        # No clients should exist
        cl_list = await client.get("/clients")
        assert cl_list.status_code == 200
        assert len(cl_list.json()) == 0

        # No payment profiles should exist
        pp_list = await client.get("/payments/profiles")
        assert pp_list.status_code == 200
        assert len(pp_list.json()) == 0

        # Old share link should be invalid
        old_share = await client.get(f"/share/{share_token}")
        assert old_share.status_code == 404
