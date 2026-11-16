from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import select

from app.domains.auth.models import User
from app.domains.billing.models import BillingCheckout, Subscription
from app.domains.control_plane import analytics_service
from app.domains.workspaces.models import Workspace


@pytest.mark.asyncio
async def test_account_cohort_includes_users_without_workspaces(db_session):
    user_with_workspace = User(
        email="with-workspace@example.test",
        is_active=True,
    )
    user_without_workspace = User(
        email="without-workspace@example.test",
        is_active=True,
    )

    db_session.add_all([user_with_workspace, user_without_workspace])
    await db_session.flush()

    workspace = Workspace(
        owner_id=user_with_workspace.id,
        name="Workspace",
        business_name="Workspace",
        country="NG",
        default_currency="NGN",
    )
    db_session.add(workspace)
    await db_session.commit()

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
async def test_workspace_dimension_filters_account_cohort(
    db_session,
):
    ng_user = User(email="ng@example.test", is_active=True)
    gb_user = User(email="gb@example.test", is_active=True)

    db_session.add_all([ng_user, gb_user])
    await db_session.flush()

    ng_workspace = Workspace(
        owner_id=ng_user.id,
        name="NG",
        business_name="NG",
        country="NG",
        default_currency="NGN",
    )
    gb_workspace = Workspace(
        owner_id=gb_user.id,
        name="GB",
        business_name="GB",
        country="GB",
        default_currency="GBP",
    )

    db_session.add_all([ng_workspace, gb_workspace])
    await db_session.commit()

    ids = await analytics_service._workspace_scope(
        db_session,
        country="NG",
    )

    account_ids = await analytics_service._account_cohort_ids(
        db_session,
        workspace_ids=ids,
        from_date=None,
        to_date=None,
        country="NG",
        plan_code=None,
        acquisition_source=None,
    )

    assert account_ids == {ng_user.id}


def test_safe_properties_excludes_urls_and_unknown_fields():
    properties = {
        "utm_source": "referral",
        "landing_path": "/signup",
        "referrer": "https://example.test/?email=user@example.test",
        "email": "user@example.test",
        "bank_account_number": "0123456789",
        "plan_code": "creator_pro",
    }

    safe = analytics_service._safe_properties(properties)

    assert safe == {
        "utm_source": "referral",
        "plan_code": "creator_pro",
    }


def test_rate_handles_empty_denominator():
    assert analytics_service._rate(10, 0) == 0.0
    assert analytics_service._rate(1, 4) == 25.0
