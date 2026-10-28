"""
Lifecycle 13: Upstream Quotes, Estimates & 1-Click Conversion
Tests: US-QOT-01 (Quote Drafting, Expiration Dates & Minor Math),
       US-QOT-02 (Public Quote Portal & Client Online Acceptance),
       US-QOT-03 (1-Click Convert Accepted Quote to Invoice)
"""
import uuid
import pytest
from datetime import date, timedelta
from httpx import AsyncClient, ASGITransport
from app.main import app
from tests.helpers import create_sent_quote
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.domains.quotes.models import Quote

@pytest.mark.asyncio
async def test_quotes_full_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # --- 1. Authenticate Freelancer ---
        test_email = f"quotes-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # --- 2. Setup Client ---
        cl_res = await client.post("/clients", json={
            "name": "Zenith Media Ltd",
            "email": "procurement@zenithmedia.ng",
            "phone": "+2348099887766",
            "preferred_currency": "NGN",
            "default_payment_terms_days": 14,
        })
        assert cl_res.status_code == 201
        client_data = cl_res.json()
        client_id = client_data["id"]

        # --- 3. US-QOT-01: Draft Quote 1 (Minor math, WHT, Deposit, Expiration) ---
        quote_payload = {
            "client_id": client_id,
            "currency": "NGN",
            "validity_days": 14,
            "items": [
                {"description": "Brand Strategy Blueprint", "quantity": 1, "unit_price_minor": 500_000_00},  # 500,000 NGN
                {"description": "Identity Guidelines Book", "quantity": 2, "unit_price_minor": 150_000_00},  # 300,000 NGN
            ],
            "discount_minor": 50_000_00,       # 50,000 NGN discount -> subtotal 800k - 50k = 750k
            "tax_rate_percent": 7.5,           # 7.5% VAT on 750k = 56,250 NGN -> gross total = 806,250 NGN
            "wht_rate_percent": 5.0,           # 5% WHT on 750k = 37,500 NGN -> net payable = 768,750 NGN
            "deposit_percentage": 50.0,        # 50% upfront deposit on net payable = 384,375 NGN
            "notes": "Deliverables will be completed in 3 weekly sprints upon deposit receipt.",
        }

        q1_res = await client.post("/quotes", json=quote_payload)
        assert q1_res.status_code == 201
        q1 = q1_res.json()

        assert q1["quote_number"] == "QOT-0001"
        assert q1["sequence_number"] == 1
        assert q1["status"] == "draft"
        assert q1["is_expired"] is False
        assert q1["subtotal_minor"] == 800_000_00
        assert q1["discount_minor"] == 50_000_00
        assert q1["tax_minor"] == 56_250_00
        assert q1["total_minor"] == 806_250_00
        assert q1["wht_minor"] == 37_500_00
        assert q1["net_payable_minor"] == 768_750_00
        assert q1["deposit_amount_minor"] == 384_375_00
        assert len(q1["items"]) == 2
        assert q1["client_name"] == "Zenith Media Ltd"
        assert q1["expires_at"] == str(date.today() + timedelta(days=14))

        # --- 4. Sequential Numbering: Draft Quote 2 ---
        q2_res = await client.post("/quotes", json={
            "client_id": client_id,
            "currency": "NGN",
            "items": [{"description": "Website Redesign", "quantity": 1, "unit_price_minor": 1_000_000_00}],
        })
        assert q2_res.status_code == 201
        q2 = q2_res.json()
        assert q2["quote_number"] == "QOT-0002"
        assert q2["sequence_number"] == 2

        # --- 5. Update Quote in Draft Status ---
        patch_res = await client.patch(f"/quotes/{q1['id']}", json={
            "notes": "Updated terms: 2 weekly sprints.",
            "discount_minor": 0,
        })
        assert patch_res.status_code == 200
        patched = patch_res.json()
        assert patched["notes"] == "Updated terms: 2 weekly sprints."
        assert patched["discount_minor"] == 0
        # Discount removed -> subtotal = 800k, tax = 7.5% of 800k = 60,000, total = 860,000, WHT = 5% of 800k = 40,000, net = 820,000
        assert patched["subtotal_minor"] == 800_000_00
        assert patched["tax_minor"] == 60_000_00
        assert patched["total_minor"] == 860_000_00
        assert patched["wht_minor"] == 40_000_00
        assert patched["net_payable_minor"] == 820_000_00

        # --- 6. Finalize then Send Quote 1 (US-QOT-01 / US-QOT-02) ---
        fin_res = await client.post(f"/quotes/{q1['id']}/finalize")
        assert fin_res.status_code == 200
        send_res = await client.post(f"/quotes/{q1['id']}/send")
        assert send_res.status_code == 200
        send_data = send_res.json()
        assert send_data["status"] == "sent"
        assert send_data["share_token"] is not None
        assert "/q/" in send_data["share_url"]
        assert "wa.me" in send_data["whatsapp_share_url"]
        token1 = send_data["share_token"]

        # --- 7. List Quotes with Filters ---
        list_res = await client.get("/quotes?status=sent")
        assert list_res.status_code == 200
        sent_quotes = list_res.json()
        assert len(sent_quotes) == 1
        assert sent_quotes[0]["id"] == q1["id"]

        list_all = await client.get("/quotes")
        assert list_all.status_code == 200
        assert len(list_all.json()) == 2

        # --- 8. US-QOT-02: Public Portal View (Zero-Account Payer) ---
        # An unauthenticated client views the quote
        async with AsyncClient(transport=transport, base_url="http://test") as anon_client:
            pub_res = await anon_client.get(f"/quotes/share/{token1}")
            assert pub_res.status_code == 200
            pub = pub_res.json()
            # Must auto-mark as viewed
            assert pub["status"] == "viewed"
            assert pub["viewed_at"] is not None
            assert pub["business_name"] is not None
            assert len(pub["items"]) == 2

            # --- 9. US-QOT-02: Online Acceptance ---
            accept_res = await anon_client.post(
                f"/quotes/share/{token1}/accept",
                json={
                    "accepted_by_name": "Amara Okonkwo",
                    "version": send_data["version"],
                },
            )
            assert accept_res.status_code == 200
            accepted_data = accept_res.json()
            assert accepted_data["status"] == "accepted"
            assert accepted_data["accepted_by_name"] == "Amara Okonkwo"
            assert accepted_data["accepted_at"] is not None

        # --- 10. Check Quote Status on Freelancer Side ---
        q1_check = await client.get(f"/quotes/{q1['id']}")
        assert q1_check.status_code == 200
        assert q1_check.json()["status"] == "accepted"
        assert q1_check.json()["accepted_by_name"] == "Amara Okonkwo"

        # --- 11. Cannot edit an accepted quote ---
        fail_edit = await client.patch(f"/quotes/{q1['id']}", json={"notes": "Illegal edit"})
        assert fail_edit.status_code == 400

        # --- 12. US-QOT-03: 1-Click Convert Accepted Quote to Invoice ---
        conv_res = await client.post(f"/quotes/{q1['id']}/convert")
        assert conv_res.status_code == 200
        created_invoice = conv_res.json()

        # Convert prepares a DRAFT invoice (dates + number assigned at finalize)
        assert created_invoice["status"] == "draft"
        assert created_invoice["client_id"] == client_id
        assert created_invoice["subtotal_minor"] == 800_000_00
        assert created_invoice["tax_minor"] == 60_000_00
        assert created_invoice["total_minor"] == 860_000_00
        assert created_invoice["wht_minor"] == 40_000_00
        assert created_invoice["net_payable_minor"] == 820_000_00
        assert len(created_invoice["items"]) == 2
        # Source-of-truth link: invoice references the parent quote
        assert created_invoice["quote_id"] == q1["id"]

        # Quote stays 'accepted'; 'converted' is set when its invoice is finalized
        q1_check = await client.get(f"/quotes/{q1['id']}")
        assert q1_check.json()["status"] == "accepted"

        # Idempotent: converting again returns the same draft invoice
        conv_again = await client.post(f"/quotes/{q1['id']}/convert")
        assert conv_again.status_code == 200
        assert conv_again.json()["id"] == created_invoice["id"]

        # --- 13. Finalize the converted invoice -> number assigned, quote marked converted ---
        fin_inv = await client.post(f"/invoices/{created_invoice['id']}/finalize")
        assert fin_inv.status_code == 200
        fin_inv_data = fin_inv.json()
        assert fin_inv_data["invoice_number"].startswith("INV-")
        assert fin_inv_data["status"] == "issued"

        q1_final = await client.get(f"/quotes/{q1['id']}")
        assert q1_final.json()["status"] == "converted"
        assert q1_final.json()["invoice_id"] == created_invoice["id"]


@pytest.mark.asyncio
async def test_quote_decline_and_expiration():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Auth
        test_email = f"quotes2-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        # Setup Client
        cl_res = await client.post("/clients", json={"name": "Kano Traders Ltd"})
        client_id = cl_res.json()["id"]

        # --- Quote Decline Flow ---
        q_res = await client.post("/quotes", json={
            "client_id": client_id,
            "currency": "NGN",
            "items": [{"description": "Billboard Campaign", "quantity": 1, "unit_price_minor": 2_000_000_00}],
        })
        q_data = q_res.json()
        fin_res = await client.post(f"/quotes/{q_data['id']}/finalize")
        assert fin_res.status_code == 200
        send_res = await client.post(f"/quotes/{q_data['id']}/send")
        token = send_res.json()["share_token"]

        async with AsyncClient(transport=transport, base_url="http://test") as anon_client:
            decline_res = await anon_client.post(f"/quotes/share/{token}/decline", json={
                "reason": "Budget reduced for Q4, we will revisit next quarter."
            })
            assert decline_res.status_code == 200
            dec_data = decline_res.json()
            assert dec_data["status"] == "declined"
            assert dec_data["decline_reason"] == "Budget reduced for Q4, we will revisit next quarter."
            assert dec_data["declined_at"] is not None

            # Cannot accept a declined quote
            fail_acc = await anon_client.post(
                f"/quotes/share/{token}/accept",
                json={
                    "accepted_by_name": "Ibrahim Kano",
                    "version": q_data["version"],
                },
            )
            assert fail_acc.status_code == 400

            # --- Quote Expiration Flow ---
        # Create and send a valid quote first. Then expire it so we can
        # verify that its existing public link rejects acceptance.
        future_date = date.today() + timedelta(days=2)

        expired_res = await client.post(
            "/quotes",
            json={
                "client_id": client_id,
                "currency": "NGN",
                "issue_date": str(date.today() - timedelta(days=10)),
                "expires_at": str(future_date),
                "items": [
                    {
                        "description": "Flash Discount Package",
                        "quantity": 1,
                        "unit_price_minor": 100_000_00,
                    }
                ],
            },
        )
        assert expired_res.status_code == 201, expired_res.text
        exp_data = expired_res.json()

        # Finalize and send while the quote is still valid.
        exp_finalize = await client.post(f"/quotes/{exp_data['id']}/finalize")
        assert exp_finalize.status_code == 200, exp_finalize.text

        exp_send = await client.post(f"/quotes/{exp_data['id']}/send")
        assert exp_send.status_code == 200, exp_send.text
        exp_token = exp_send.json()["share_token"]

        # Simulate the passage of time by expiring the sent quote in the DB.
        async with AsyncSessionLocal() as db:
            quote_obj = await db.get(Quote, exp_data["id"])
            assert quote_obj is not None
            quote_obj.expires_at = date.today() - timedelta(days=2)
            await db.commit()

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as anon_client:
            # The already-issued public link remains resolvable.
            pub_exp = await anon_client.get(f"/quotes/share/{exp_token}")
            assert pub_exp.status_code == 200, pub_exp.text
            assert pub_exp.json()["is_expired"] is True

            # Expired quotes cannot be accepted.
            accept_exp = await anon_client.post(
                f"/quotes/share/{exp_token}/accept",
                json={
                    "accepted_by_name": "Tunde Late",
                    "version": exp_data["version"],
                },
            )
            assert accept_exp.status_code == 400, accept_exp.text
            assert "expired" in accept_exp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invoice_send_requires_finalize():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_email = f"invguard-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        cl_res = await client.post("/clients", json={"name": "Guard Client Ltd", "preferred_currency": "NGN"})
        client_id = cl_res.json()["id"]

        inv_res = await client.post("/invoices", json={
            "client_id": client_id,
            "currency": "NGN",
            "due_date": str(date.today() + timedelta(days=14)),
            "items": [{"description": "Service", "quantity": 1, "unit_price_minor": 100_000_00}],
        })
        assert inv_res.status_code == 201
        inv = inv_res.json()

        # Sending a draft invoice must be rejected
        send_draft = await client.post(f"/invoices/{inv['id']}/send")
        assert send_draft.status_code == 400

        # Finalize -> issued (not delivered yet)
        fin_res = await client.post(f"/invoices/{inv['id']}/finalize")
        assert fin_res.status_code == 200
        assert fin_res.json()["status"] == "issued"
        assert fin_res.json()["share_token"] is not None

        # Send -> sent
        send_res = await client.post(f"/invoices/{inv['id']}/send")
        assert send_res.status_code == 200
        assert send_res.json()["invoice"]["status"] == "sent"


@pytest.mark.asyncio
async def test_quote_send_requires_finalize():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_email = f"qguard-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        cl_res = await client.post("/clients", json={"name": "QGuard Client Ltd", "preferred_currency": "NGN"})
        client_id = cl_res.json()["id"]

        q_res = await client.post("/quotes", json={
            "client_id": client_id,
            "currency": "NGN",
            "items": [{"description": "Service", "quantity": 1, "unit_price_minor": 100_000_00}],
        })
        assert q_res.status_code == 201
        q = q_res.json()

        # Sending a draft quote must be rejected
        send_draft = await client.post(f"/quotes/{q['id']}/send")
        assert send_draft.status_code == 400

        # Finalize -> issued
        fin_res = await client.post(f"/quotes/{q['id']}/finalize")
        assert fin_res.status_code == 200
        assert fin_res.json()["status"] == "issued"

        # Send -> sent
        send_res = await client.post(f"/quotes/{q['id']}/send")
        assert send_res.status_code == 200
        assert send_res.json()["status"] == "sent"


@pytest.mark.asyncio
async def test_accept_version_mismatch_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_email = f"ver-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        cl_res = await client.post("/clients", json={"name": "Version Client Ltd", "preferred_currency": "NGN"})
        client_id = cl_res.json()["id"]

        q = await create_sent_quote(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "items": [{"description": "Service", "quantity": 1, "unit_price_minor": 100_000_00}],
            },
        )
        token = q["share_token"]

        async with AsyncClient(transport=transport, base_url="http://test") as anon_client:
            # Accepting a stale version is rejected
            bad = await anon_client.post(f"/quotes/share/{token}/accept", json={
                "accepted_by_name": "Ada Lovelace",
                "version": 999,
            })
            assert bad.status_code == 400
            assert "version" in bad.json()["detail"].lower()

            # Accepting the current version succeeds
            good = await anon_client.post(f"/quotes/share/{token}/accept", json={
                "accepted_by_name": "Ada Lovelace",
                "version": q["version"],
            })
            assert good.status_code == 200
            assert good.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_accept_idempotent_one_invoice():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_email = f"idem-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        cl_res = await client.post("/clients", json={"name": "Idem Client Ltd", "preferred_currency": "NGN"})
        client_id = cl_res.json()["id"]

        q = await create_sent_quote(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "items": [{"description": "Service", "quantity": 1, "unit_price_minor": 100_000_00}],
            },
        )
        token = q["share_token"]

        async with AsyncClient(transport=transport, base_url="http://test") as anon_client:
            r1 = await anon_client.post(f"/quotes/share/{token}/accept", json={
                "accepted_by_name": "Idem User", "version": q["version"],
            })
            assert r1.status_code == 200
            invoice_id = r1.json()["invoice_id"]

            # Double-accept returns the same invoice (idempotent)
            r2 = await anon_client.post(f"/quotes/share/{token}/accept", json={
                "accepted_by_name": "Idem User", "version": q["version"],
            })
            assert r2.status_code == 200
            assert r2.json()["invoice_id"] == invoice_id

            # Quote still has a single linked invoice
            q_check = await client.get(f"/quotes/{q['id']}")
            assert q_check.json()["invoice_id"] == invoice_id


@pytest.mark.asyncio
async def test_quote_revise_bumps_version():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_email = f"rev-{uuid.uuid4().hex[:6]}@studio.ng"
        req_res = await client.post("/auth/magic-link", json={"email": test_email})
        code = req_res.json()["dev_code"]
        verify_res = await client.post("/auth/verify", json={"email": test_email, "code": code})
        client.cookies.set("bagg_session", verify_res.cookies["bagg_session"])

        cl_res = await client.post("/clients", json={"name": "Revise Client Ltd", "preferred_currency": "NGN"})
        client_id = cl_res.json()["id"]

        q = await create_sent_quote(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "items": [{"description": "Service v1", "quantity": 1, "unit_price_minor": 100_000_00}],
            },
        )
        assert q["version"] == 1

        # Revising an issued/sent/viewed quote bumps the version
        rev_res = await client.post(f"/quotes/{q['id']}/revise", json={
            "notes": "Revised scope",
            "items": [{"description": "Service v2", "quantity": 1, "unit_price_minor": 150_000_00}],
            "reason": "Scope increased",
        })
        assert rev_res.status_code == 200
        assert rev_res.json()["version"] == 2
        assert rev_res.json()["notes"] == "Revised scope"

        # Accept the quote with the current version, then both revise and direct patch must be rejected (locked)
        # A revision invalidates the old public link.
        # Finalize and send the revised version to issue a fresh link.
        finalize_revised = await client.post(f"/quotes/{q['id']}/finalize")
        assert finalize_revised.status_code == 200

        send_revised = await client.post(f"/quotes/{q['id']}/send")
        assert send_revised.status_code == 200

        current_quote = await client.get(f"/quotes/{q['id']}")
        assert current_quote.status_code == 200

        current_version = current_quote.json()["version"]
        current_token = send_revised.json()["share_token"]

        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as anon_client:
            acc = await anon_client.post(
                f"/quotes/share/{current_token}/accept",
                json={
                    "accepted_by_name": "Revise User",
                    "version": current_version,
                },
            )
            assert acc.status_code == 200

        rev_locked = await client.post(f"/quotes/{q['id']}/revise", json={"notes": "after accept"})
        assert rev_locked.status_code == 400

        patch_locked = await client.patch(f"/quotes/{q['id']}", json={"notes": "after accept"})
        assert patch_locked.status_code == 400


@pytest.mark.asyncio
async def test_quote_revision_preserves_terms_and_accepts_only_current_version():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        email = f"revision-audit-{uuid.uuid4().hex[:8]}@studio.ng"

        request = await client.post(
            "/auth/magic-link",
            json={"email": email},
        )
        assert request.status_code == 200

        verification = await client.post(
            "/auth/verify",
            json={
                "email": email,
                "code": request.json()["dev_code"],
            },
        )
        assert verification.status_code == 200
        client.cookies.set(
            "bagg_session",
            verification.cookies["bagg_session"],
        )

        client_response = await client.post(
            "/clients",
            json={
                "name": "Revision Audit Client Ltd",
                "preferred_currency": "NGN",
            },
        )
        assert client_response.status_code == 201
        client_id = client_response.json()["id"]

        quote = await create_sent_quote(
            client,
            {
                "client_id": client_id,
                "currency": "NGN",
                "notes": "Original scope",
                "items": [
                    {
                        "description": "Original deliverable",
                        "quantity": 1,
                        "unit_price_minor": 100_000_00,
                    }
                ],
            },
        )

        original_token = quote["share_token"]
        original_version = quote["version"]
        original_total = quote["total_minor"]

        # Client requests changes to the existing sent quote.
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as public_client:
            review = await public_client.post(
                f"/quotes/share/{original_token}/request-review",
                json={"reason": "Please expand the scope."},
            )
            assert review.status_code == 200
            assert review.json()["status"] == "review_requested"

        # The issuer creates a new version.
        revision = await client.post(
            f"/quotes/{quote['id']}/revise",
            json={
                "reason": "Scope expanded",
                "notes": "Expanded scope",
                "items": [
                    {
                        "description": "Expanded deliverable",
                        "quantity": 1,
                        "unit_price_minor": 150_000_00,
                    }
                ],
            },
        )

        assert revision.status_code == 200
        revised_quote = revision.json()
        assert revised_quote["version"] == original_version + 1
        assert revised_quote["status"] == "draft"
        assert revised_quote["total_minor"] != original_total

        # The previous version remains available as a revision snapshot.
        history = await client.get(f"/quotes/{quote['id']}/revisions")
        assert history.status_code == 200

        previous = next(
            item for item in history.json() if item["version"] == original_version
        )

        assert previous["total_minor"] == original_total
        assert previous["notes"] == "Original scope"
        assert previous["items_snapshot"][0]["description"] == ("Original deliverable")

        # Finalize and issue the new version.
        finalized = await client.post(f"/quotes/{quote['id']}/finalize")
        assert finalized.status_code == 200
        assert finalized.json()["status"] == "issued"

        sent = await client.post(f"/quotes/{quote['id']}/send")
        assert sent.status_code == 200
        current = sent.json()

        # Acceptance must reference the current version.
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as public_client:
            stale = await public_client.post(
                f"/quotes/share/{current['share_token']}/accept",
                json={
                    "accepted_by_name": "Client Representative",
                    "version": original_version,
                },
            )
            assert stale.status_code == 400

            accepted = await public_client.post(
                f"/quotes/share/{current['share_token']}/accept",
                json={
                    "accepted_by_name": "Client Representative",
                    "version": current["version"],
                },
            )
            assert accepted.status_code == 200
            assert accepted.json()["status"] == "accepted"

        # Accepted commercial terms cannot be edited in place.
        locked = await client.patch(
            f"/quotes/{quote['id']}",
            json={"notes": "Attempted silent change"},
        )
        assert locked.status_code == 400
