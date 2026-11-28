"""Quote acceptance must leave evidence: what was accepted, by whom, when and from where."""

import re

import pytest
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.domains.quotes.acceptance import CONSENT_TEXT, CONSENT_TEXT_VERSION, hash_terms_snapshot
from app.domains.quotes.models import Quote
from tests.test_approval_link_regeneration import provider

SHA256 = re.compile(r"^[0-9a-f]{64}$")


async def _sent_quote(client) -> tuple[str, str]:
    cl = await client.post(
        "/clients",
        json={
            "name": "Evidence Client",
            "email": "pay@evidence.ng",
            "phone": "+2348011223344",
            "preferred_currency": "NGN",
            "default_payment_terms_days": 14,
        },
    )
    assert cl.status_code == 201
    q = await client.post(
        "/quotes",
        json={
            "client_id": cl.json()["id"],
            "currency": "NGN",
            "validity_days": 14,
            "items": [
                {"description": "Brand identity", "quantity": 2, "unit_price_minor": 150_000_00},
                {"description": "Guidelines PDF", "quantity": 1, "unit_price_minor": 50_000_00},
            ],
            "deposit_percentage": 50.0,
            "notes": "Revisions: two rounds.",
        },
    )
    assert q.status_code == 201, q.text
    fin = await client.post(f"/quotes/{q.json()['id']}/finalize")
    assert fin.status_code == 200, fin.text
    return q.json()["id"], fin.json()["share_token"]


def _accept_payload(**overrides):
    payload = {"accepted_by_name": "Ngozi Eze", "version": 1, "agreed_to_terms": True}
    payload.update(overrides)
    return payload


@pytest.mark.asyncio
async def test_acceptance_requires_explicit_consent_and_leaves_quote_unaccepted():
    async with provider() as client:
        quote_id, token = await _sent_quote(client)

        declined_consent = await client.post(
            f"/quotes/share/{token}/accept", json=_accept_payload(agreed_to_terms=False)
        )
        assert declined_consent.status_code == 400
        assert "agree" in declined_consent.json()["detail"].lower()

        missing_field = await client.post(
            f"/quotes/share/{token}/accept",
            json={"accepted_by_name": "Ngozi Eze", "version": 1},
        )
        assert missing_field.status_code == 422

        # Nothing was recorded
        assert (await client.get(f"/quotes/{quote_id}/acceptance-record")).status_code == 404
        assert (await client.get(f"/quotes/{quote_id}")).json()["accepted_at"] is None


@pytest.mark.asyncio
async def test_acceptance_records_who_what_when_and_where():
    async with provider() as client:
        quote_id, token = await _sent_quote(client)
        quote = (await client.get(f"/quotes/{quote_id}")).json()

        accepted = await client.post(
            f"/quotes/share/{token}/accept",
            json=_accept_payload(),
            headers={"user-agent": "Mozilla/5.0 (BaggTest)"},
        )
        assert accepted.status_code == 200, accepted.text

        res = await client.get(f"/quotes/{quote_id}/acceptance-record")
        assert res.status_code == 200, res.text
        record = res.json()

        assert record["evidence_captured"] is True
        assert record["accepted_by_name"] == "Ngozi Eze"
        assert record["accepted_at"]
        assert record["ip_address"]
        assert record["user_agent"] == "Mozilla/5.0 (BaggTest)"
        assert record["consent_text"] == CONSENT_TEXT
        assert record["consent_version"] == CONSENT_TEXT_VERSION
        assert SHA256.match(record["terms_hash"])
        assert record["hash_verified"] is True

        snapshot = record["terms_snapshot"]
        assert snapshot["quote_number"] == quote["quote_number"]
        assert snapshot["version"] == 1
        assert snapshot["total_minor"] == quote["total_minor"]
        assert snapshot["currency"] == "NGN"
        assert snapshot["prepared_for"] == "Evidence Client"
        assert snapshot["notes"] == "Revisions: two rounds."
        assert [i["description"] for i in snapshot["items"]] == ["Brand identity", "Guidelines PDF"]
        assert snapshot["issued_by"]["business_name"]
        assert record["terms_hash"] == hash_terms_snapshot(snapshot)


@pytest.mark.asyncio
async def test_repeated_acceptance_never_overwrites_the_original_evidence():
    async with provider() as client:
        quote_id, token = await _sent_quote(client)

        first = await client.post(
            f"/quotes/share/{token}/accept",
            json=_accept_payload(),
            headers={"user-agent": "FirstDevice/1.0"},
        )
        assert first.status_code == 200
        before = (await client.get(f"/quotes/{quote_id}/acceptance-record")).json()

        again = await client.post(
            f"/quotes/share/{token}/accept",
            json=_accept_payload(accepted_by_name="Someone Else"),
            headers={"user-agent": "SecondDevice/2.0"},
        )
        assert again.status_code == 200

        after = (await client.get(f"/quotes/{quote_id}/acceptance-record")).json()
        assert after["accepted_by_name"] == "Ngozi Eze"
        assert after["user_agent"] == "FirstDevice/1.0"
        assert after["accepted_at"] == before["accepted_at"]
        assert after["terms_hash"] == before["terms_hash"]


@pytest.mark.asyncio
async def test_tampering_with_the_stored_snapshot_is_detected():
    async with provider() as client:
        quote_id, token = await _sent_quote(client)
        assert (
            await client.post(f"/quotes/share/{token}/accept", json=_accept_payload())
        ).status_code == 200

        async with AsyncSessionLocal() as session:
            quote = (
                await session.execute(select(Quote).where(Quote.id == quote_id))
            ).scalar_one()
            tampered = dict(quote.accepted_terms_snapshot)
            tampered["total_minor"] = 1
            quote.accepted_terms_snapshot = tampered
            await session.commit()

        record = (await client.get(f"/quotes/{quote_id}/acceptance-record")).json()
        assert record["hash_verified"] is False


@pytest.mark.asyncio
async def test_quotes_accepted_before_evidence_capture_report_no_evidence():
    async with provider() as client:
        quote_id, token = await _sent_quote(client)
        assert (
            await client.post(f"/quotes/share/{token}/accept", json=_accept_payload())
        ).status_code == 200

        async with AsyncSessionLocal() as session:
            quote = (
                await session.execute(select(Quote).where(Quote.id == quote_id))
            ).scalar_one()
            quote.accepted_terms_snapshot = None
            quote.accepted_terms_hash = None
            quote.accepted_consent_text = None
            quote.accepted_ip = None
            await session.commit()

        record = (await client.get(f"/quotes/{quote_id}/acceptance-record")).json()
        assert record["evidence_captured"] is False
        assert record["hash_verified"] is None
        assert record["accepted_by_name"] == "Ngozi Eze"


@pytest.mark.asyncio
async def test_acceptance_record_is_workspace_scoped():
    async with provider() as owner, provider() as other:
        quote_id, token = await _sent_quote(owner)
        assert (
            await owner.post(f"/quotes/share/{token}/accept", json=_accept_payload())
        ).status_code == 200

        assert (await owner.get(f"/quotes/{quote_id}/acceptance-record")).status_code == 200
        assert (await other.get(f"/quotes/{quote_id}/acceptance-record")).status_code == 404


def test_snapshot_hash_ignores_key_order_but_not_content():
    a = {"total_minor": 100, "items": [{"description": "x", "quantity": 1}], "currency": "NGN"}
    reordered = {"currency": "NGN", "items": [{"quantity": 1, "description": "x"}], "total_minor": 100}
    changed = {**a, "total_minor": 101}
    assert hash_terms_snapshot(a) == hash_terms_snapshot(reordered)
    assert hash_terms_snapshot(a) != hash_terms_snapshot(changed)


@pytest.mark.asyncio
async def test_public_view_shows_the_exact_consent_wording_that_gets_recorded():
    async with provider() as client:
        _, token = await _sent_quote(client)
        public = await client.get(f"/quotes/share/{token}")
        assert public.status_code == 200
        assert public.json()["acceptance_consent_text"] == CONSENT_TEXT
