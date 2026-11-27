"""Entitlement application and governance services."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.audit.service import record_audit_event
from app.domains.billing.repository import BillingRepository
from app.domains.entitlements.catalog import (
    ENTITLEMENT_KEYS,
    PLAN_ENTITLEMENTS,
)
from app.domains.entitlements.models import EntitlementOverride
from app.domains.entitlements.repository import EntitlementOverrideRepository
from app.domains.entitlements.resolver import resolve_entitlements
from app.domains.workspaces.models import Workspace


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_datetime(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("Datetime values must include a timezone.")
    return value.astimezone(timezone.utc)


def _validate_override_value(
    *,
    entitlement_key: str,
    value: Any,
) -> Any:
    if entitlement_key not in ENTITLEMENT_KEYS:
        raise ValueError(f"Unknown entitlement override: {entitlement_key}")

    # All plans must define a consistent value type for a given key.
    catalog_values = [plan[entitlement_key] for plan in PLAN_ENTITLEMENTS.values()]

    if any(type(item) is bool for item in catalog_values):
        if type(value) is not bool:
            raise ValueError(
                f"Entitlement {entitlement_key} requires a boolean override."
            )
        return value

    if any(item is None or type(item) is int for item in catalog_values):
        if value is not None and (type(value) is not int or value < 0):
            raise ValueError(
                f"Entitlement {entitlement_key} requires a "
                "non-negative integer or null."
            )
        return value

    raise ValueError(f"Entitlement {entitlement_key} has an unsupported catalog type.")


def _override_state(override: EntitlementOverride) -> dict:
    """Allowlisted audit representation; never serialise the ORM object."""
    return {
        "entitlement_key": override.entitlement_key,
        "override_value": override.override_value,
        "status": override.status,
        "effective_at": override.effective_at.isoformat(),
        "expires_at": override.expires_at.isoformat(),
    }


async def get_workspace_entitlements(
    *,
    db: AsyncSession,
    workspace: Workspace,
) -> dict:
    """Resolve plan entitlements with persisted, currently effective overrides."""
    billing_repository = BillingRepository(db)
    override_repository = EntitlementOverrideRepository(db)

    subscription = await billing_repository.get_subscription(workspace.id)
    credit_balance = await billing_repository.get_credit_balance(workspace.id)

    now = _utc_now()
    persisted_overrides = await override_repository.list_effective(
        workspace_id=workspace.id,
        now=now,
    )
    override_values = {
        item.entitlement_key: item.override_value for item in persisted_overrides
    }

    resolution = resolve_entitlements(
        workspace_tier=workspace.tier,
        subscription=subscription,
        now=now,
        overrides=override_values,
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


async def grant_entitlement_override(
    db: AsyncSession,
    *,
    workspace_id: str,
    entitlement_key: str,
    override_value: Any,
    reason: str,
    admin_id: str,
    effective_at: datetime | None = None,
    expires_at: datetime,
) -> EntitlementOverride:
    """Grant a time-bounded override, atomically recording its audit event."""
    if not isinstance(reason, str) or not reason.strip():
        raise ValueError("A reason is required.")

    if len(reason.strip()) > 1000:
        raise ValueError("Reason cannot exceed 1000 characters.")

    if not isinstance(admin_id, str) or not admin_id.strip():
        raise ValueError("An administrator identity is required.")

    value = _validate_override_value(
        entitlement_key=entitlement_key,
        value=override_value,
    )

    now = _utc_now()
    starts = _normalise_datetime(effective_at or now)
    ends = _normalise_datetime(expires_at)

    if ends <= starts:
        raise ValueError("expires_at must be later than effective_at.")

    if ends <= now:
        raise ValueError("expires_at must be in the future.")

    # Serialise grants for this workspace. This also prevents two concurrent
    # requests from racing against the partial unique index.
    workspace_result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id).with_for_update()
    )
    workspace = workspace_result.scalar_one_or_none()

    if workspace is None:
        raise ValueError("Workspace not found.")

    repository = EntitlementOverrideRepository(db)

    await repository.expire_stale(
        workspace_id=workspace_id,
        now=now,
    )

    override = EntitlementOverride(
        workspace_id=workspace_id,
        entitlement_key=entitlement_key,
        override_value=value,
        reason=reason.strip(),
        status="active",
        created_by_admin_id=admin_id.strip(),
        effective_at=starts,
        expires_at=ends,
    )

    try:
        await repository.create(override)

        await record_audit_event(
            db,
            workspace_id=workspace_id,
            actor_type="admin",
            actor_id=admin_id.strip(),
            action="entitlement_override.granted",
            entity_type="entitlement_override",
            entity_id=override.id,
            after_state={
                **_override_state(override),
                "reason": override.reason,
            },
            metadata={
                "entitlement_key": entitlement_key,
                "workspace_id": workspace_id,
            },
        )

        await db.commit()
        await db.refresh(override)
        return override

    except IntegrityError as exc:
        await db.rollback()
        raise ValueError(
            "An active override already exists for this workspace and entitlement."
        ) from exc
    except Exception:
        await db.rollback()
        raise


async def revoke_entitlement_override(
    db: AsyncSession,
    *,
    workspace_id: str,
    override_id: str,
    admin_id: str,
    reason: str,
) -> EntitlementOverride:
    """Revoke an active override and append its audit event atomically."""
    if not isinstance(reason, str) or not reason.strip():
        raise ValueError("A revocation reason is required.")

    if len(reason.strip()) > 1000:
        raise ValueError("Revocation reason cannot exceed 1000 characters.")

    if not isinstance(admin_id, str) or not admin_id.strip():
        raise ValueError("An administrator identity is required.")

    workspace_result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id).with_for_update()
    )
    workspace = workspace_result.scalar_one_or_none()

    if workspace is None:
        raise ValueError("Workspace not found.")

    repository = EntitlementOverrideRepository(db)
    override = await repository.get_for_workspace(
        workspace_id=workspace_id,
        override_id=override_id,
        lock=True,
    )

    if override is None:
        raise ValueError("Entitlement override not found.")

    if override.status != "active":
        raise ValueError(
            f"Only active overrides can be revoked; current status is "
            f"{override.status}."
        )

    now = _utc_now()
    before_state = _override_state(override)

    override.status = "revoked"
    override.revoked_at = now
    override.revoked_by_admin_id = admin_id.strip()
    override.revocation_reason = reason.strip()
    override.updated_at = now

    try:
        await db.flush()

        await record_audit_event(
            db,
            workspace_id=workspace_id,
            actor_type="admin",
            actor_id=admin_id.strip(),
            action="entitlement_override.revoked",
            entity_type="entitlement_override",
            entity_id=override.id,
            before_state=before_state,
            after_state={
                **_override_state(override),
                "revocation_reason": override.revocation_reason,
            },
            metadata={
                "entitlement_key": override.entitlement_key,
                "workspace_id": workspace_id,
            },
        )

        await db.commit()
        await db.refresh(override)
        return override

    except Exception:
        await db.rollback()
        raise


async def list_entitlement_overrides(
    db: AsyncSession,
    *,
    workspace_id: str,
    status: str | None = None,
    entitlement_key: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[EntitlementOverride]:
    return await EntitlementOverrideRepository(db).list_for_workspace(
        workspace_id=workspace_id,
        status=status,
        entitlement_key=entitlement_key,
        limit=limit,
        offset=offset,
    )


def has_entitlement(
    snapshot: dict,
    entitlement_key: str,
) -> bool:
    """Return whether a boolean entitlement is enabled."""
    return snapshot["entitlements"].get(entitlement_key) is True
