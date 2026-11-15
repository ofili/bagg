"""Resolve effective workspace entitlements from billing state."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Mapping, Any

from app.domains.entitlements.catalog import (
    FREE_PLAN,
    PAID_PLANS,
    PLAN_ENTITLEMENTS,
    ENTITLEMENT_KEYS,
)


@dataclass(frozen=True)
class EntitlementResolution:
    plan: str
    subscription_status: str
    access_source: str
    is_paid: bool
    in_grace_period: bool
    current_period_end: datetime | None
    entitlements: dict[str, bool | int | None]


def _utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _normalise_plan(value: Any) -> str:
    if not isinstance(value, str):
        return FREE_PLAN

    plan = value.strip().lower()

    if plan in PLAN_ENTITLEMENTS:
        return plan

    return FREE_PLAN


def _apply_overrides(
    entitlements: dict[str, bool | int | None],
    overrides: Mapping[str, Any] | None,
) -> dict[str, bool | int | None]:
    """Apply trusted administrative overrides after validating their values.

    The caller must obtain overrides from a trusted control-plane source.
    Browser or workspace-user input must never be passed here.
    """
    if not overrides:
        return entitlements

    resolved = dict(entitlements)

    for key, value in overrides.items():
        if key not in ENTITLEMENT_KEYS:
            raise ValueError(f"Unknown entitlement override: {key}")

        current_value = resolved[key]

        if isinstance(current_value, bool):
            if type(value) is not bool:
                raise ValueError(f"Entitlement {key} requires a boolean override.")

        elif isinstance(current_value, int) or current_value is None:
            if value is not None and (type(value) is not int or value < 0):
                raise ValueError(
                    f"Entitlement {key} requires a non-negative integer " "or null."
                )

        resolved[key] = value

    return resolved


def resolve_entitlements(
    *,
    workspace_tier: str | None,
    subscription: Any | None,
    now: datetime | None = None,
    overrides: Mapping[str, Any] | None = None,
) -> EntitlementResolution:
    """Resolve the effective plan and entitlements for one workspace.

    Subscription is authoritative when present. Workspace.tier is retained
    only as a compatibility source when no subscription row exists.

    A paid subscription without a period end is treated as legacy access.
    This avoids removing access from existing records that predate complete
    billing-period data. Such records should be reviewed and backfilled.
    """
    current_time = _utc(now or datetime.now(timezone.utc))
    assert current_time is not None

    current_period_end = _utc(getattr(subscription, "current_period_end", None))

    in_grace_period = False
    access_source = "free"
    subscription_status = "free"
    effective_plan = FREE_PLAN
    allow_overrides = True

    if subscription is None:
        legacy_plan = _normalise_plan(workspace_tier)

        if legacy_plan in PAID_PLANS:
            effective_plan = legacy_plan
            subscription_status = "legacy"
            access_source = "workspace_compatibility"
        else:
            effective_plan = FREE_PLAN
            subscription_status = "free"
            access_source = "workspace_compatibility"

    else:
        subscription_status = (
            str(getattr(subscription, "status", "unknown") or "unknown").strip().lower()
        )

        candidate_plan = _normalise_plan(
            getattr(subscription, "plan_code", None)
            or getattr(subscription, "tier", None)
        )

        grace_period_end = _utc(getattr(subscription, "grace_period_end", None))

        if subscription_status == "suspended":
            # Suspension is a hard restriction. An entitlement override
            # must not silently bypass it.
            allow_overrides = False

        elif candidate_plan in PAID_PLANS:
            if subscription_status == "active":
                # A missing period end is a legacy compatibility case.
                # A known, expired period must never retain paid access.
                period_valid = (
                    current_period_end is None
                    or current_period_end > current_time
                )

                if period_valid:
                    effective_plan = candidate_plan
                    access_source = "subscription"

            elif subscription_status == "past_due":
                if (
                    grace_period_end is not None
                    and grace_period_end > current_time
                ):
                    effective_plan = candidate_plan
                    access_source = "subscription_grace"
                    in_grace_period = True

        if effective_plan == FREE_PLAN:
            access_source = "subscription"

    entitlements = dict(PLAN_ENTITLEMENTS[effective_plan])

    if allow_overrides:
        entitlements = _apply_overrides(entitlements, overrides)

    return EntitlementResolution(
        plan=effective_plan,
        subscription_status=subscription_status,
        access_source=access_source,
        is_paid=effective_plan in PAID_PLANS,
        in_grace_period=in_grace_period,
        current_period_end=current_period_end,
        entitlements=entitlements,
    )
