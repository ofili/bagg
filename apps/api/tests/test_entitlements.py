from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from app.domains.entitlements.resolver import resolve_entitlements

NOW = datetime(2026, 11, 15, 12, 0, tzinfo=timezone.utc)


def subscription(
    *,
    tier="creator_pro",
    plan_code=None,
    status="active",
    period_end=None,
    grace_period_end=None,
    cancel_at_period_end=False,
):
    return SimpleNamespace(
        tier=tier,
        plan_code=plan_code,
        status=status,
        current_period_end=period_end,
        grace_period_end=grace_period_end,
        cancel_at_period_end=cancel_at_period_end,
    )


def test_free_workspace_receives_free_entitlements():
    result = resolve_entitlements(
        workspace_tier="free",
        subscription=None,
        now=NOW,
    )

    assert result.plan == "free"
    assert result.is_paid is False
    assert result.entitlements["documents.invoice.create"] is True
    assert result.entitlements["documents.quote.create"] is True
    assert result.entitlements["documents.send.monthly_limit"] == 3
    assert result.entitlements["invoices.recurring.enabled"] is False


@pytest.mark.parametrize(
    "plan",
    ["creator_pro", "professional"],
)
def test_active_paid_subscription_receives_paid_entitlements(plan):
    result = resolve_entitlements(
        workspace_tier="free",
        subscription=subscription(
            tier=plan,
            period_end=NOW + timedelta(days=30),
        ),
        now=NOW,
    )

    assert result.plan == plan
    assert result.is_paid is True
    assert result.access_source == "subscription"
    assert result.entitlements["documents.send.monthly_limit"] is None
    assert result.entitlements["invoices.recurring.enabled"] is True


def test_plan_code_takes_precedence_over_legacy_tier():
    result = resolve_entitlements(
        workspace_tier="free",
        subscription=subscription(
            tier="free",
            plan_code="professional",
            period_end=NOW + timedelta(days=30),
        ),
        now=NOW,
    )

    assert result.plan == "professional"
    assert result.is_paid is True


def test_active_subscription_expires_at_period_end():
    result = resolve_entitlements(
        workspace_tier="creator_pro",
        subscription=subscription(
            period_end=NOW - timedelta(seconds=1),
        ),
        now=NOW,
    )

    assert result.plan == "free"
    assert result.is_paid is False
    assert result.entitlements["invoices.recurring.enabled"] is False


def test_cancel_at_period_end_preserves_access_before_expiry():
    result = resolve_entitlements(
        workspace_tier="free",
        subscription=subscription(
            period_end=NOW + timedelta(days=5),
            cancel_at_period_end=True,
        ),
        now=NOW,
    )

    assert result.plan == "creator_pro"
    assert result.is_paid is True


def test_cancel_at_period_end_removes_access_after_expiry():
    result = resolve_entitlements(
        workspace_tier="creator_pro",
        subscription=subscription(
            period_end=NOW - timedelta(seconds=1),
            cancel_at_period_end=True,
        ),
        now=NOW,
    )

    assert result.plan == "free"
    assert result.is_paid is False


def test_past_due_subscription_retains_access_during_grace():
    result = resolve_entitlements(
        workspace_tier="free",
        subscription=subscription(
            status="past_due",
            period_end=NOW - timedelta(days=1),
            grace_period_end=NOW + timedelta(days=2),
        ),
        now=NOW,
    )

    assert result.plan == "creator_pro"
    assert result.is_paid is True
    assert result.in_grace_period is True
    assert result.access_source == "subscription_grace"


def test_past_due_subscription_loses_access_after_grace():
    result = resolve_entitlements(
        workspace_tier="creator_pro",
        subscription=subscription(
            status="past_due",
            grace_period_end=NOW - timedelta(seconds=1),
        ),
        now=NOW,
    )

    assert result.plan == "free"
    assert result.is_paid is False
    assert result.in_grace_period is False


def test_suspended_subscription_denies_paid_access():
    result = resolve_entitlements(
        workspace_tier="creator_pro",
        subscription=subscription(
            status="suspended",
            period_end=NOW + timedelta(days=30),
        ),
        now=NOW,
        overrides={
            "invoices.recurring.enabled": True,
        },
    )

    assert result.plan == "free"
    assert result.is_paid is False
    assert result.entitlements["invoices.recurring.enabled"] is False


def test_legacy_paid_workspace_without_subscription_keeps_access():
    result = resolve_entitlements(
        workspace_tier="creator_pro",
        subscription=None,
        now=NOW,
    )

    assert result.plan == "creator_pro"
    assert result.is_paid is True
    assert result.access_source == "workspace_compatibility"
    assert result.subscription_status == "legacy"


def test_unknown_legacy_workspace_tier_falls_back_to_free():
    result = resolve_entitlements(
        workspace_tier="unknown_plan",
        subscription=None,
        now=NOW,
    )

    assert result.plan == "free"
    assert result.is_paid is False


def test_administrative_override_can_change_an_entitlement():
    result = resolve_entitlements(
        workspace_tier="free",
        subscription=None,
        now=NOW,
        overrides={
            "invoices.recurring.enabled": True,
            "documents.send.monthly_limit": 10,
        },
    )

    assert result.plan == "free"
    assert result.is_paid is False
    assert result.entitlements["invoices.recurring.enabled"] is True
    assert result.entitlements["documents.send.monthly_limit"] == 10


def test_invalid_override_key_is_rejected():
    with pytest.raises(ValueError, match="Unknown entitlement override"):
        resolve_entitlements(
            workspace_tier="free",
            subscription=None,
            now=NOW,
            overrides={
                "billing.subscription.price": 100,
            },
        )


def test_invalid_boolean_override_is_rejected():
    with pytest.raises(ValueError, match="requires a boolean"):
        resolve_entitlements(
            workspace_tier="free",
            subscription=None,
            now=NOW,
            overrides={
                "invoices.recurring.enabled": 1,
            },
        )


def test_negative_limit_override_is_rejected():
    with pytest.raises(ValueError, match="non-negative integer"):
        resolve_entitlements(
            workspace_tier="free",
            subscription=None,
            now=NOW,
            overrides={
                "documents.send.monthly_limit": -1,
            },
        )


def test_credits_are_not_part_of_plan_entitlements():
    result = resolve_entitlements(
        workspace_tier="free",
        subscription=None,
        now=NOW,
    )

    assert "credits" not in result.entitlements
