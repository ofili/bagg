import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.main import app
from tests.helpers import login_code_for
from app.domains.audit.models import AuditEvent

async def verify_step_up(
    client: AsyncClient,
    *,
    purpose: str,
    payload: dict,
    resource_type: str = "payment_profile",
    resource_id: str | None = None,
) -> str:
    request_response = await client.post(
        "/security/step-up/request",
        json={
            "purpose": purpose,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "payload": payload,
        },
    )

    assert request_response.status_code == 202, request_response.text

    challenge = request_response.json()
    code = challenge.get("code")

    assert code, (
        "The test environment must return the verification code "
        "in the step-up response."
    )

    verify_response = await client.post(
        "/security/step-up/verify",
        json={
            "challenge_id": challenge["challenge_id"],
            "code": code,
        },
    )

    assert verify_response.status_code == 200, verify_response.text
    assert verify_response.json()["verified"] is True

    return challenge["challenge_id"]


async def create_profile(
    client: AsyncClient,
    payload: dict,
) -> dict:
    challenge_id = await verify_step_up(
        client,
        purpose="payment_profile_create",
        payload=payload,
    )

    response = await client.post(
        "/payments/profiles",
        json=payload,
        headers={
            "X-Security-Challenge-ID": challenge_id,
        },
    )

    assert response.status_code == 201, response.text

    return response.json()


@pytest.mark.asyncio
async def test_payment_profiles_lifecycle(db_session):
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        email = f"payments-{uuid.uuid4().hex[:8]}@creator.africa"

        request_response = await client.post(
            "/auth/magic-link",
            json={"email": email},
        )
        assert request_response.status_code in (200, 202)

        verify_response = await client.post(
            "/auth/verify",
            json={
                "email": email,
                "code": login_code_for(email),
                "intent": "signup",
                "full_name": "Payment Profiles Test User",
            },
        )
        assert verify_response.status_code == 200, verify_response.text

        client.cookies.set(
            "bagg_session",
            verify_response.cookies["bagg_session"],
        )

        # Empty profiles must not be accepted.
        invalid_response = await client.post(
            "/payments/profiles",
            json={
                "currency": "NGN",
                "is_default": True,
            },
        )
        assert invalid_response.status_code == 422

        # Create an NGN bank-transfer profile.
        ngn_profile = await create_profile(
            client,
            {
                "currency": "NGN",
                "bank_name": "Guaranty Trust Bank",
                "account_name": "Lagos Creative Ltd",
                "account_number": "0123456789",
                "instructions": "Use invoice number as reference",
                "is_default": True,
            },
        )

        assert ngn_profile["currency"] == "NGN"
        assert ngn_profile["is_default"] is True
        assert ngn_profile["is_usable"] is True
        assert "bank_transfer" in ngn_profile["methods"]

        # Create a USD payment-link profile.
        usd_profile = await create_profile(
            client,
            {
                "currency": "USD",
                "payment_link": "https://pay.example.com/lagoscreative",
                "instructions": "Wire or debit card accepted",
                "is_default": True,
            },
        )

        assert usd_profile["currency"] == "USD"
        assert usd_profile["is_usable"] is True
        assert "payment_link" in usd_profile["methods"]

        # A second NGN profile becomes the default.
        ngn_second = await create_profile(
            client,
            {
                "currency": "NGN",
                "bank_name": "Zenith Bank",
                "account_name": "Lagos Creative Ltd",
                "account_number": "2098765432",
                "is_default": True,
            },
        )

        assert ngn_second["is_default"] is True

        # The original NGN profile is no longer the default.
        list_response = await client.get(
            "/payments/profiles",
            params={"currency": "NGN"},
        )
        assert list_response.status_code == 200

        ngn_profiles = list_response.json()
        assert len(ngn_profiles) == 2

        first = next(item for item in ngn_profiles if item["id"] == ngn_profile["id"])
        second = next(item for item in ngn_profiles if item["id"] == ngn_second["id"])

        assert first["is_default"] is False
        assert second["is_default"] is True

        # Update an existing profile with a new security challenge.
        changes = {
            "instructions": "Include the invoice number in the transfer note.",
        }
        update_payload = {
            "profile_id": ngn_second["id"],
            "changes": changes,
        }

        update_challenge = await verify_step_up(
            client,
            purpose="payment_profile_update",
            payload=update_payload,
            resource_id=ngn_second["id"],
        )

        update_response = await client.patch(
            f"/payments/profiles/{ngn_second['id']}",
            json=changes,
            headers={
                "X-Security-Challenge-ID": update_challenge,
            },
        )

        assert update_response.status_code == 200, update_response.text
        assert update_response.json()["instructions"] == changes["instructions"]

        # The currency validation endpoint must return a usable default.
        validation_response = await client.get(
            "/payments/profiles/validate/NGN",
        )
        assert validation_response.status_code == 200

        validation = validation_response.json()
        assert validation["has_profile"] is True
        assert validation["default_profile"]["id"] == ngn_second["id"]

        # KES has no configured profile.
        kes_response = await client.get(
            "/payments/profiles/validate/KES",
        )
        assert kes_response.status_code == 200
        assert kes_response.json()["has_profile"] is False

        # The consolidated setup endpoint reports all supported currencies.
        setup_response = await client.get("/payments/setup")
        assert setup_response.status_code == 200

        setup = setup_response.json()

        assert setup["supported_currency_count"] == 7
        assert setup["configured_currency_count"] == 2

        setup_by_currency = {item["currency"]: item for item in setup["currencies"]}

        assert setup_by_currency["NGN"]["is_configured"] is True
        assert setup_by_currency["NGN"]["profile_count"] == 2
        assert setup_by_currency["NGN"]["default_profile_id"] == ngn_second["id"]

        assert setup_by_currency["USD"]["is_configured"] is True
        assert setup_by_currency["KES"]["is_configured"] is False

        # Delete the original, non-default NGN profile.
        delete_payload = {
            "profile_id": ngn_profile["id"],
        }

        delete_challenge = await verify_step_up(
            client,
            purpose="payment_profile_delete",
            payload=delete_payload,
            resource_id=ngn_profile["id"],
        )

        delete_response = await client.delete(
            f"/payments/profiles/{ngn_profile['id']}",
            headers={
                "X-Security-Challenge-ID": delete_challenge,
            },
        )

        assert delete_response.status_code == 204

        # The remaining NGN profile is still configured.
        final_validation = await client.get(
            "/payments/profiles/validate/NGN",
        )
        assert final_validation.status_code == 200
        assert final_validation.json()["has_profile"] is True
        assert final_validation.json()["default_profile"]["id"] == ngn_second["id"]

        # Business audit events must exist for all three mutations.
        audit_result = await db_session.execute(
            select(AuditEvent).where(
                AuditEvent.entity_type == "payment_profile",
                AuditEvent.entity_id.in_(
                    [
                        ngn_profile["id"],
                        ngn_second["id"],
                        usd_profile["id"],
                    ]
                ),
            )
        )
        audit_events = audit_result.scalars().all()

        events_by_entity = {}
        for event in audit_events:
            events_by_entity.setdefault(event.entity_id, []).append(event)

        assert {event.action for event in events_by_entity[ngn_profile["id"]]} == {
            "payment_profile.created",
            "payment_profile.deleted",
        }

        assert {event.action for event in events_by_entity[ngn_second["id"]]} == {
            "payment_profile.created",
            "payment_profile.updated",
        }

        assert {event.action for event in events_by_entity[usd_profile["id"]]} == {
            "payment_profile.created",
        }

        # Every event must be attributed to the authenticated user.
        assert all(
            event.actor_type == "user"
            and event.actor_id is not None
            and event.workspace_id
            for event in audit_events
        )

        # The audit snapshots must not contain sensitive payment details.
        forbidden_fields = {
            "account_number",
            "routing_number",
            "payment_link",
            "mobile_money_number",
            "instructions",
            "bank_name",
            "account_name",
        }

        for event in audit_events:
            for snapshot in (event.before_state, event.after_state):
                if snapshot:
                    assert forbidden_fields.isdisjoint(snapshot.keys())
