"""Entitlement application services."""

from __future__ import annotations

from typing import Mapping, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.billing.repository import BillingRepository
from app.domains.entitlements.resolver import resolve_entitlements
from app.domains.workspaces.models import Workspace


async def get_workspace_entitlements(
    *,
    db: AsyncSession,
    workspace: Workspace,
    overrides: Mapping[str, Any] | None = None,
) -> dict:
    """Return effective entitlements and the separate credit balance."""
    repository = BillingRepository(db)

    subscription = await repository.get_subscription(workspace.id)
    credit_balance = await repository.get_credit_balance(workspace.id)

    resolution = resolve_entitlements(
        workspace_tier=workspace.tier,
        subscription=subscription,
        overrides=overrides,
    )

    return {
        "workspace_id": workspace.id,
        "plan": resolution.plan,
        "subscription_status": resolution.subscription_status,
        "access_source": resolution.access_source,
        "is_paid": resolution.is_paid,
        "in_grace_period": resolution.in_grace_period,
        "current_period_end": resolution.current_period_end,
        "entitlements": resolution.entitlements,
        "credits": {
            "balance": credit_balance,
        },
    }


def has_entitlement(
    snapshot: dict,
    entitlement_key: str,
) -> bool:
    """Return whether a boolean entitlement is enabled."""
    return snapshot["entitlements"].get(entitlement_key) is True
