"""Billing application services; persistence is delegated to BillingRepository.

Invoice and Quote services retain their existing function signatures. Services
own business rules and transaction decisions; repositories own SQL construction.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.billing.catalog import (
    FREE_TIER_MONTHLY_SENDS_LIMIT,
    GRACE_PERIOD_DAYS,
)
from app.domains.billing.models import CreditLedgerEntry, Subscription
from app.domains.billing.repository import BillingRepository
from app.domains.workspaces.models import Workspace

CREDIT_REASON_PACK_PURCHASE = "pack_purchase"
CREDIT_REASON_SEND_DEDUCTION = "send_deduction"
CREDIT_REASON_SEND_REFUND = "send_refund"
CREDIT_REASON_INITIAL_GRANT = "initial_grant"


def _month_bounds(now: datetime | None = None) -> tuple[datetime, datetime]:
    current = now or datetime.now(timezone.utc)
    start = datetime(current.year, current.month, 1, tzinfo=timezone.utc)
    if current.month == 12:
        end = datetime(current.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(current.year, current.month + 1, 1, tzinfo=timezone.utc)
    return start, end


async def get_credit_balance(workspace_id: str, db: AsyncSession) -> int:
    return await BillingRepository(db).get_credit_balance(workspace_id)


async def get_free_sends_used_this_month(workspace_id: str, db: AsyncSession) -> int:
    start, end = _month_bounds()
    return await BillingRepository(db).count_dispatched_since(workspace_id, start, end)


async def check_delivery_quota(workspace: Workspace, db: AsyncSession) -> bool:
    """Return whether one credit must be deducted, or reject exhausted quota.

    The workspace lock serializes competing sends. It remains held until the
    caller commits the dispatch state and any credit-ledger mutation.
    """
    repository = BillingRepository(db)
    locked_workspace = await repository.lock_workspace(workspace.id)
    if locked_workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    if locked_workspace.tier in {"creator_pro", "professional"}:
        return False

    used = await get_free_sends_used_this_month(workspace.id, db)
    if used < FREE_TIER_MONTHLY_SENDS_LIMIT:
        return False

    if await get_credit_balance(workspace.id, db) >= 1:
        return True

    raise HTTPException(
        status_code=402,
        detail=(
            f"You have used your {FREE_TIER_MONTHLY_SENDS_LIMIT} free delivery "
            "sends for this month. Please upgrade or purchase a credit top-up "
            "pack to continue delivering invoices and quotes."
        ),
    )


async def consume_delivery_send(
    workspace: Workspace,
    db: AsyncSession,
    deduct_credit: bool = False,
    *,
    reference: str,
    commit: bool = True,
) -> None:
    """Meter one document dispatch against the workspace allowance.

    ``reference`` is required so the deduction is attributable and the
    corresponding compensation is idempotent. Email dispatches use the outbox
    message ID; link/WhatsApp hand-offs use a stable per-issuance key. A
    terminal delivery failure is refunded with the same reference and reason
    ``send_refund``.
    """
    if not deduct_credit:
        return

    repository = BillingRepository(db)
    locked_workspace = await repository.lock_workspace(workspace.id)

    if locked_workspace is None:
        raise HTTPException(
            status_code=404,
            detail="Workspace not found.",
        )

    if locked_workspace.tier in {"creator_pro", "professional"}:
        return

    await add_credits(
        workspace_id=workspace.id,
        amount=-1,
        reason=CREDIT_REASON_SEND_DEDUCTION,
        description="Metered invoice delivery send deduction",
        reference=reference,
        db=db,
        commit=commit,
    )


async def add_credits(
    workspace_id: str,
    amount: int,
    reason: str,
    description: Optional[str],
    reference: Optional[str],
    db: AsyncSession,
    *,
    commit: bool = True,
) -> int:
    """Append a ledger entry while serializing balance mutations per workspace."""
    if amount == 0:
        raise ValueError("Credit ledger entries must have a non-zero amount.")

    repository = BillingRepository(db)
    if await repository.lock_workspace(workspace_id) is None:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    if reference:
        existing = await repository.find_credit_entry(workspace_id, reason, reference)
        if existing:
            return await repository.get_credit_balance(workspace_id)

    current_balance = await repository.get_credit_balance(workspace_id)
    new_balance = current_balance + amount
    if new_balance < 0:
        raise HTTPException(status_code=402, detail="Insufficient credit balance.")

    entry = CreditLedgerEntry(
        workspace_id=workspace_id,
        amount=amount,
        balance_after=new_balance,
        reason=reason,
        description=description,
        reference=reference,
    )
    await repository.add(entry)

    if commit:
        await db.commit()
        await repository.refresh(entry)
    else:
        await repository.flush()

    return new_balance


async def get_or_create_subscription(
    workspace: Workspace, db: AsyncSession
) -> Subscription:
    repository = BillingRepository(db)
    await repository.lock_workspace(workspace.id)
    subscription = await repository.get_subscription(workspace.id, lock=True)
    if subscription:
        return subscription

    subscription = Subscription(
        workspace_id=workspace.id,
        tier=workspace.tier or "free",
        status="active",
        currency="NGN",
        amount_minor=0,
        billing_interval="annual",
        cancel_at_period_end=False,
    )
    await repository.add(subscription)
    await db.commit()
    await repository.refresh(subscription)
    return subscription



import calendar


def _add_billing_period(
        start: datetime,
        interval: str,
) -> datetime:
    """Add a calendar billing period, clamping month-end dates safely."""
    if interval == "monthly":
        year = start.year + (1 if start.month == 12 else 0)
        month = 1 if start.month == 12 else start.month + 1
    elif interval == "annual":
        year = start.year + 1
        month = start.month
    else:
        raise ValueError("Unsupported billing interval.")

    last_day = calendar.monthrange(year, month)[1]
    day = min(start.day, last_day)

    return start.replace(year=year, month=month, day=day)


async def activate_subscription(
        workspace_id: str,
        plan: str,
        currency: str,
        amount_minor: int,
        processor: str,
        processor_subscription_code: Optional[str],
        processor_customer_code: Optional[str],
        db: AsyncSession,
        *,
        billing_interval: str = "annual",
        processor_plan_code: Optional[str] = None,
        commit: bool = True,
) -> Subscription:
    if plan not in {"creator_pro", "professional"}:
        raise ValueError("Unsupported subscription plan.")

    if billing_interval not in {"monthly", "annual"}:
        raise ValueError("Unsupported billing interval.")

    if currency.upper() != "NGN":
        raise ValueError("Unsupported subscription currency.")

    repository = BillingRepository(db)
    workspace = await repository.lock_workspace(workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    subscription = await repository.get_subscription(workspace_id, lock=True)
    now = datetime.now(timezone.utc)
    period_end = _add_billing_period(now, billing_interval)

    if subscription is None:
        subscription = Subscription(workspace_id=workspace_id)
        await repository.add(subscription)

    subscription.plan_code = plan

    if processor_plan_code:
        subscription.processor_plan_code = processor_plan_code

    subscription.tier = plan
    subscription.status = "active"
    subscription.currency = currency.upper()
    subscription.amount_minor = amount_minor
    subscription.billing_interval = billing_interval
    subscription.processor = processor

    if processor_subscription_code:
        subscription.processor_subscription_code = processor_subscription_code

    if processor_customer_code:
        subscription.processor_customer_code = processor_customer_code

    subscription.current_period_start = now
    subscription.current_period_end = period_end
    subscription.cancel_at_period_end = False
    subscription.grace_period_end = None
    subscription.dunning_attempts = 0

    workspace.tier = plan

    await repository.flush()

    if commit:
        await db.commit()
        await repository.refresh(subscription)

    return subscription


async def handle_failed_payment(
    workspace_id: str,
    db: AsyncSession,
    *,
    commit: bool = True,
) -> Subscription | None:
    """Enter a three-day grace period without extending it on duplicate events."""
    repository = BillingRepository(db)
    workspace = await repository.lock_workspace(workspace_id)
    if workspace is None:
        return None

    subscription = await repository.get_subscription(workspace_id, lock=True)
    if subscription is None or subscription.status in {"canceled", "downgraded"}:
        return subscription

    if subscription.status != "past_due" or subscription.grace_period_end is None:
        subscription.status = "past_due"
        subscription.grace_period_end = datetime.now(timezone.utc) + timedelta(
            days=GRACE_PERIOD_DAYS
        )

    subscription.dunning_attempts = (subscription.dunning_attempts or 0) + 1
    await repository.flush()
    if commit:
        await db.commit()
        await repository.refresh(subscription)
    return subscription


from datetime import datetime, timezone


def _parse_provider_datetime(value: str | None) -> datetime | None:
    if not value:
        return None

    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)

    return parsed.astimezone(timezone.utc)


async def apply_subscription_renewal(
        *,
        subscription_code: str,
        amount_minor: int,
        currency: str,
        period_start: str | None,
        period_end: str | None,
        db: AsyncSession,
        commit: bool = True,
) -> Subscription:
    """Apply a verified, successful Paystack recurring invoice."""
    repository = BillingRepository(db)

    existing = await repository.get_subscription_by_provider_code(
        "paystack",
        subscription_code,
    )
    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="No Bagg subscription matches this Paystack subscription.",
        )

    workspace = await repository.lock_workspace(existing.workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    subscription = await repository.get_subscription(
        existing.workspace_id,
        lock=True,
    )
    if subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if subscription.processor_subscription_code != subscription_code:
        raise HTTPException(
            status_code=409,
            detail="Provider subscription reference mismatch.",
        )

    if not period_start or not period_end:
        raise HTTPException(
            status_code=409,
            detail="Paystack renewal invoice is missing its billing period.",
        )

    if not currency:
        raise HTTPException(
            status_code=409,
            detail="Paystack renewal invoice is missing its currency.",
        )

    if int(amount_minor) != int(subscription.amount_minor):
        raise HTTPException(
            status_code=409,
            detail="Renewal amount does not match the stored subscription price.",
        )

    if currency.upper() != subscription.currency.upper():
        raise HTTPException(
            status_code=409,
            detail="Renewal currency does not match the stored subscription currency.",
        )

    start = _parse_provider_datetime(period_start)
    end = _parse_provider_datetime(period_end)

    if start and end and end <= start:
        raise HTTPException(
            status_code=409,
            detail="Provider supplied an invalid subscription billing period.",
        )

    # Ignore stale invoices that would move the subscription period backwards.
    if (
            end
            and subscription.current_period_end
            and end <= subscription.current_period_end
    ):
        return subscription

    if start:
        subscription.current_period_start = start
    if end:
        subscription.current_period_end = end

    subscription.status = "active"
    subscription.grace_period_end = None
    subscription.dunning_attempts = 0

    # Do not clear cancel_at_period_end here. A renewal event must not
    # reverse an independently confirmed provider-side cancellation.
    await repository.flush()

    if commit:
        await db.commit()
        await repository.refresh(subscription)

    return subscription


async def cancel_subscription_renewal(
    workspace_id: str, db: AsyncSession
) -> Subscription:
    repository = BillingRepository(db)
    await repository.lock_workspace(workspace_id)
    subscription = await repository.get_subscription(workspace_id, lock=True)
    if subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    if subscription.current_period_end is None:
        raise HTTPException(
            status_code=409,
            detail="There is no active paid billing period to cancel.",
        )

    subscription.cancel_at_period_end = True
    # Paid entitlements remain active until the current period expires.
    if subscription.status != "past_due":
        subscription.status = "active"

    await db.commit()
    await repository.refresh(subscription)
    return subscription


async def expire_due_subscriptions(
    db: AsyncSession,
    *,
    now: datetime | None = None,
    batch_size: int = 100,
) -> int:
    """Downgrade expired subscriptions using workspace -> subscription lock order."""
    current = now or datetime.now(timezone.utc)
    repository = BillingRepository(db)
    workspace_ids = await repository.list_expirable_workspace_ids(current, batch_size)
    changed = 0

    for workspace_id in workspace_ids:
        workspace = await repository.lock_workspace(workspace_id)
        if workspace is None:
            continue
        subscription = await repository.get_subscription(workspace_id, lock=True)
        if subscription is None:
            continue

        canceled_expired = bool(
            subscription.cancel_at_period_end
            and subscription.current_period_end
            and subscription.current_period_end <= current
        )
        grace_expired = bool(
            subscription.status == "past_due"
            and subscription.grace_period_end
            and subscription.grace_period_end <= current
        )
        if not (canceled_expired or grace_expired):
            continue

        subscription.status = "downgraded"
        subscription.tier = "free"
        subscription.cancel_at_period_end = False
        workspace.tier = "free"
        changed += 1

    await db.commit()
    return changed


async def check_and_apply_grace_period_expiration(sub: Subscription, db: AsyncSession):
    """Backward-compatible wrapper for the consolidated expiry worker."""
    return await expire_due_subscriptions(db)


async def get_credit_history(workspace_id: str, db: AsyncSession, limit: int = 20):
    return await BillingRepository(db).list_credit_history(workspace_id, limit)
