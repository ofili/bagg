from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest

from app.domains.activation.models import ProductEvent
from app.domains.auth.models import User
from app.domains.billing.models import BillingCheckout
from app.domains.clients.models import Client
from app.domains.control_plane import analytics_service
from app.domains.invoices.models import Invoice
from app.domains.workspaces.models import Workspace


def make_datetime(days_ago: int = 0) -> datetime:
    return datetime.now(UTC) - timedelta(days=days_ago)


async def create_user(
    db_session,
    *,
    email: str | None = None,
    created_at: datetime | None = None,
) -> User:
    user = User(
        email=email or f"{uuid4().hex}@example.test",
        is_active=True,
        created_at=created_at or make_datetime(60),
    )
    db_session.add(user)
    await db_session.flush()
    return user


async def create_workspace(
    db_session,
    owner: User,
    *,
    name: str = "Test Workspace",
    country: str = "NG",
    onboarding_completed: bool = False,
) -> Workspace:
    workspace = Workspace(
        owner_id=owner.id,
        name=name,
        business_name=name,
        country=country,
        default_currency="NGN",
        onboarding_completed=onboarding_completed,
    )
    db_session.add(workspace)
    await db_session.flush()
    return workspace


async def create_event(
    db_session,
    workspace: Workspace,
    event_name: str,
    *,
    occurred_at: datetime | None = None,
    user_id: str | None = None,
    properties: dict | None = None,
) -> ProductEvent:
    event = ProductEvent(
        event_id=f"test_{uuid4().hex}",
        workspace_id=workspace.id,
        user_id=user_id,
        event_name=event_name,
        source="test",
        properties=properties or {},
        occurred_at=occurred_at or make_datetime(1),
    )
    db_session.add(event)
    await db_session.flush()
    return event


async def create_draft_invoice(
    db_session,
    workspace: Workspace,
) -> Invoice:
    client = Client(
        workspace_id=workspace.id,
        name="Test Client",
        preferred_currency="NGN",
    )
    db_session.add(client)
    await db_session.flush()

    invoice = Invoice(
        workspace_id=workspace.id,
        client_id=client.id,
        currency="NGN",
        status="draft",
    )
    db_session.add(invoice)
    await db_session.flush()
    return invoice


async def create_checkout(
    db_session,
    workspace: Workspace,
    *,
    created_at: datetime,
    status: str = "succeeded",
    currency: str = "NGN",
    amount_minor: int = 350000,
    purchase_type: str = "subscription",
) -> BillingCheckout:
    checkout = BillingCheckout(
        workspace_id=workspace.id,
        provider="paystack",
        provider_reference=f"test_{uuid4().hex}",
        purchase_type=purchase_type,
        currency=currency,
        amount_minor=amount_minor,
        status=status,
        created_at=created_at,
    )
    db_session.add(checkout)
    await db_session.flush()
    return checkout


@pytest.mark.asyncio
async def test_account_cohort_includes_users_without_workspaces(db_session):
    user_with_workspace = await create_user(db_session)
    user_without_workspace = await create_user(db_session)

    workspace = await create_workspace(db_session, user_with_workspace)

    account_ids = await analytics_service._account_cohort_ids(
        db_session,
        workspace_ids=[workspace.id],
        from_date=None,
        to_date=None,
        country=None,
        plan_code=None,
        acquisition_source=None,
    )

    assert user_with_workspace.id in account_ids
    assert user_without_workspace.id in account_ids


@pytest.mark.asyncio
async def test_workspace_dimension_filters_account_cohort(db_session):
    ng_user = await create_user(db_session)
    gb_user = await create_user(db_session)

    ng_workspace = await create_workspace(
        db_session,
        ng_user,
        country="NG",
    )
    await create_workspace(
        db_session,
        gb_user,
        country="GB",
    )

    workspace_ids = await analytics_service._workspace_scope(
        db_session,
        country="NG",
    )

    account_ids = await analytics_service._account_cohort_ids(
        db_session,
        workspace_ids=workspace_ids,
        from_date=None,
        to_date=None,
        country="NG",
        plan_code=None,
        acquisition_source=None,
    )

    assert account_ids == {ng_user.id}
    assert ng_user.id in account_ids
    assert gb_user.id not in account_ids


@pytest.mark.asyncio
async def test_overview_separates_account_and_workspace_counts(db_session):
    owner = await create_user(db_session)
    account_without_workspace = await create_user(db_session)

    first_workspace = await create_workspace(
        db_session,
        owner,
        name="First Workspace",
        onboarding_completed=True,
    )
    second_workspace = await create_workspace(
        db_session,
        owner,
        name="Second Workspace",
    )

    await create_event(
        db_session,
        first_workspace,
        "invoice.first_created",
        user_id=owner.id,
    )
    await create_event(
        db_session,
        first_workspace,
        "document.first_dispatched",
        user_id=owner.id,
    )
    await create_event(
        db_session,
        second_workspace,
        "invoice.first_created",
        user_id=owner.id,
    )

    result = await analytics_service.get_overview(db_session)

    assert result["account_count"] == 2
    assert result["workspace_count"] == 2

    # Workspace metrics use workspaces as their denominator.
    assert result["profile_completed"] == 1
    assert result["first_document_created"] == 2
    assert result["first_document_dispatched"] == 1
    assert result["first_payment_confirmed"] == 0

    assert result["profile_completion_rate"] == 50.0
    assert result["document_creation_rate"] == 100.0
    assert result["dispatch_rate"] == 50.0
    assert result["client_payment_rate"] == 0.0

    assert account_without_workspace.id is not None


@pytest.mark.asyncio
async def test_funnel_counts_owner_once_across_multiple_workspaces(db_session):
    owner = await create_user(db_session)
    account_without_workspace = await create_user(db_session)

    first_workspace = await create_workspace(
        db_session,
        owner,
        name="First Workspace",
        onboarding_completed=True,
    )
    second_workspace = await create_workspace(
        db_session,
        owner,
        name="Second Workspace",
        onboarding_completed=True,
    )

    await create_event(
        db_session,
        first_workspace,
        "invoice.first_created",
        user_id=owner.id,
    )
    await create_event(
        db_session,
        second_workspace,
        "quote.first_created",
        user_id=owner.id,
    )

    await create_event(
        db_session,
        first_workspace,
        "document.first_dispatched",
        user_id=owner.id,
    )
    await create_event(
        db_session,
        second_workspace,
        "document.first_dispatched",
        user_id=owner.id,
    )

    result = await analytics_service.get_funnel(db_session)

    stages = {stage["key"]: stage for stage in result["stages"]}

    assert result["measurement_unit"] == "accounts"
    assert result["cohort_size"] == 2

    assert stages["account_created"]["count"] == 2
    assert stages["workspace_created"]["count"] == 1
    assert stages["profile_completed"]["count"] == 1
    assert stages["first_document_created"]["count"] == 1
    assert stages["first_document_dispatched"]["count"] == 1

    # A dispatch is not a confirmed client payment.
    assert stages["first_payment_confirmed"]["count"] == 0
    assert stages["paid_subscription"]["count"] == 0

    assert account_without_workspace.id is not None


@pytest.mark.asyncio
async def test_checkout_or_claim_does_not_count_as_confirmed_payment(db_session):
    owner = await create_user(db_session)
    workspace = await create_workspace(db_session, owner)

    await create_checkout(
        db_session,
        workspace,
        created_at=make_datetime(1),
        status="pending",
    )

    result = await analytics_service.get_funnel(db_session)

    stages = {stage["key"]: stage["count"] for stage in result["stages"]}

    assert stages["first_payment_confirmed"] == 0
    assert stages["paid_subscription"] == 0


@pytest.mark.asyncio
async def test_cohort_denominator_includes_account_without_workspace(db_session):
    owner = await create_user(
        db_session,
        created_at=make_datetime(60),
    )
    account_without_workspace = await create_user(
        db_session,
        created_at=make_datetime(60),
    )

    workspace = await create_workspace(db_session, owner)

    await create_event(
        db_session,
        workspace,
        "document.first_dispatched",
        occurred_at=make_datetime(59),
        user_id=owner.id,
    )

    result = await analytics_service.get_cohorts(db_session)

    assert result["measurement_unit"] == "accounts"
    assert len(result["items"]) == 1

    cohort = result["items"][0]
    assert cohort["signup_accounts"] == 2

    window = cohort["windows"]["30d"]

    assert window["eligible_accounts"] == 2
    assert window["initially_activated"] == 1
    assert window["commercially_activated"] == 0
    assert window["initial_activation_rate"] == 50.0
    assert window["commercial_activation_rate"] == 0.0

    assert account_without_workspace.id is not None


@pytest.mark.asyncio
async def test_draft_segment_includes_new_draft_after_historical_dispatch(
    db_session,
):
    owner = await create_user(db_session)
    workspace = await create_workspace(db_session, owner)

    await create_draft_invoice(db_session, workspace)

    # A previous dispatch must not hide a currently undispatched draft.
    await create_event(
        db_session,
        workspace,
        "document.first_dispatched",
        user_id=owner.id,
    )

    segments = await analytics_service._segment_workspace_ids(
        db_session,
        [workspace.id],
    )

    assert workspace.id in segments["drafts_not_dispatched"]


@pytest.mark.asyncio
async def test_draft_segment_excludes_workspace_without_current_draft(
    db_session,
):
    owner = await create_user(db_session)
    workspace = await create_workspace(db_session, owner)

    await create_event(
        db_session,
        workspace,
        "document.first_dispatched",
        user_id=owner.id,
    )

    segments = await analytics_service._segment_workspace_ids(
        db_session,
        [workspace.id],
    )

    assert workspace.id not in segments["drafts_not_dispatched"]


@pytest.mark.asyncio
async def test_billing_date_filter_uses_checkout_created_at(db_session):
    owner = await create_user(
        db_session,
        created_at=datetime(2020, 1, 1, tzinfo=UTC),
    )
    workspace = await create_workspace(db_session, owner)

    await create_checkout(
        db_session,
        workspace,
        created_at=datetime(2026, 11, 15, 10, 0, tzinfo=UTC),
        status="succeeded",
        amount_minor=350000,
    )

    await create_checkout(
        db_session,
        workspace,
        created_at=datetime(2026, 11, 14, 10, 0, tzinfo=UTC),
        status="succeeded",
        amount_minor=850000,
    )

    result = await analytics_service.get_billing(
        db_session,
        from_date=date(2026, 11, 15),
        to_date=date(2026, 11, 15),
    )

    assert result["checkout_count"] == 1
    assert result["successful_checkouts"] == 1
    assert result["revenue_by_currency"] == [
        {
            "currency": "NGN",
            "subscription_revenue_minor": 350000,
            "credit_pack_revenue_minor": 0,
            "total_revenue_minor": 350000,
        }
    ]


@pytest.mark.asyncio
async def test_billing_revenue_is_separated_by_currency(db_session):
    owner = await create_user(db_session)
    workspace = await create_workspace(db_session, owner)

    await create_checkout(
        db_session,
        workspace,
        created_at=make_datetime(1),
        currency="NGN",
        amount_minor=350000,
    )
    await create_checkout(
        db_session,
        workspace,
        created_at=make_datetime(1),
        currency="USD",
        amount_minor=3500,
    )

    result = await analytics_service.get_billing(db_session)

    revenue = {row["currency"]: row for row in result["revenue_by_currency"]}

    assert revenue["NGN"]["total_revenue_minor"] == 350000
    assert revenue["USD"]["total_revenue_minor"] == 3500
    assert len(revenue) == 2


def test_safe_properties_excludes_unknown_and_sensitive_fields():
    properties = {
        "utm_source": "referral",
        "plan_code": "creator_pro",
        "landing_path": "/signup?email=user@example.test#verify",
        "referrer": "https://example.test/pricing?token=secret#plans",
        "email": "user@example.test",
        "bank_account_number": "0123456789",
        "authorization": "secret",
        "nested": {"email": "user@example.test"},
    }

    safe = analytics_service._safe_properties(properties)

    assert safe == {
        "utm_source": "referral",
        "plan_code": "creator_pro",
        "landing_path": "/signup",
        "referrer": "https://example.test/pricing",
    }


def test_safe_referrer_removes_embedded_credentials():
    safe = analytics_service._safe_properties(
        {
            "referrer": (
                "https://user:password@example.test/path" "?token=secret#fragment"
            )
        }
    )

    assert safe == {
        "referrer": "https://example.test/path",
    }


def test_safe_properties_rejects_non_http_referrers():
    safe = analytics_service._safe_properties(
        {
            "referrer": "javascript:alert(1)",
            "landing_path": "/signup?token=secret",
        }
    )

    assert safe == {
        "landing_path": "/signup",
    }


def test_safe_properties_rejects_non_dictionary_values():
    assert analytics_service._safe_properties(None) == {}
    assert analytics_service._safe_properties("not a dictionary") == {}


def test_rate_handles_empty_denominator():
    assert analytics_service._rate(10, 0) == 0.0
    assert analytics_service._rate(1, 4) == 25.0
