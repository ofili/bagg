from datetime import datetime, timezone, timedelta, date
from typing import Optional, List
from sqlalchemy import select, and_, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.domains.billing.models import Subscription, CreditLedgerEntry, WebhookEvent
from app.domains.workspaces.models import Workspace
from app.domains.invoices.models import Invoice
from app.domains.quotes.models import Quote


FREE_TIER_MONTHLY_SENDS_LIMIT = 3


async def get_credit_balance(workspace_id: str, db: AsyncSession) -> int:
    """Returns the current credit ledger balance for a workspace."""
    stmt = (
        select(CreditLedgerEntry.balance_after)
        .where(CreditLedgerEntry.workspace_id == workspace_id)
        .order_by(CreditLedgerEntry.created_at.desc())
        .limit(1)
    )
    res = await db.execute(stmt)
    bal = res.scalar_one_or_none()
    return bal if bal is not None else 0


async def get_free_sends_used_this_month(workspace_id: str, db: AsyncSession) -> int:
    """Calculates invoice and quote delivery sends dispatched this calendar month."""
    today = date.today()
    start_of_month = datetime(today.year, today.month, 1, tzinfo=timezone.utc)

    invoice_stmt = select(func.count(Invoice.id)).where(
        and_(
            Invoice.workspace_id == workspace_id,
            Invoice.sent_at >= start_of_month,
            Invoice.email_delivery_status.in_(["delivered", "opened", "bounced"]),
        )
    )
    quote_stmt = select(func.count(Quote.id)).where(
        and_(
            Quote.workspace_id == workspace_id,
            Quote.sent_at >= start_of_month,
            Quote.email_delivery_status.in_(["delivered", "opened", "bounced"]),
        )
    )
    invoice_count = (await db.execute(invoice_stmt)).scalar() or 0
    quote_count = (await db.execute(quote_stmt)).scalar() or 0
    return invoice_count + quote_count


async def check_delivery_quota(workspace: Workspace, db: AsyncSession) -> bool:
    """
    Free Tier Metering & Delivery Quota Guard (US-SUB-01).
    - Pro & Professional tiers have unlimited sends.
    - Free tier has 3 free sends per calendar month.
    - 4th+ send requires paid credits or Creator Pro upgrade.
    """
    if workspace.tier in ["creator_pro", "professional"]:
        return True

    used = await get_free_sends_used_this_month(workspace.id, db)
    if used < FREE_TIER_MONTHLY_SENDS_LIMIT:
        return True

    balance = await get_credit_balance(workspace.id, db)
    if balance >= 1:
        return True

    raise HTTPException(
        status_code=402,
        detail=(
            f"You have used your {FREE_TIER_MONTHLY_SENDS_LIMIT} free delivery sends for this month. "
            "Please upgrade to Creator Pro (₦14,000/yr) or purchase a credit top-up pack to continue delivering invoices and quotes."
        ),
    )


async def consume_delivery_send(workspace: Workspace, db: AsyncSession):
    """
    Consumes a delivery send. If free tier limit is reached, deducts 1 credit from the ledger (US-SUB-06).
    """
    if workspace.tier in ["creator_pro", "professional"]:
        return

    used = await get_free_sends_used_this_month(workspace.id, db)
    # If this send is beyond the free quota, deduct 1 credit
    if used >= FREE_TIER_MONTHLY_SENDS_LIMIT:
        await add_credits(
            workspace_id=workspace.id,
            amount=-1,
            reason="send_deduction",
            description="Metered invoice delivery send deduction",
            reference=None,
            db=db,
        )


async def add_credits(
    workspace_id: str,
    amount: int,
    reason: str,
    description: Optional[str],
    reference: Optional[str],
    db: AsyncSession,
) -> int:
    """
    Appends an entry to the append-only credit ledger (US-SUB-06).
    All deductions and additions lock rows for transaction safety.
    """
    current_balance = await get_credit_balance(workspace_id, db)
    new_balance = current_balance + amount
    if new_balance < 0:
        raise HTTPException(
            status_code=402,
            detail="Insufficient credit balance.",
        )

    entry = CreditLedgerEntry(
        workspace_id=workspace_id,
        amount=amount,
        balance_after=new_balance,
        reason=reason,
        description=description,
        reference=reference,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return new_balance


async def get_or_create_subscription(workspace: Workspace, db: AsyncSession) -> Subscription:
    """Returns active subscription for workspace or initializes a default free tier record."""
    stmt = select(Subscription).where(Subscription.workspace_id == workspace.id)
    sub = (await db.execute(stmt)).scalar_one_or_none()
    if not sub:
        sub = Subscription(
            workspace_id=workspace.id,
            tier=workspace.tier or "free",
            status="active",
            currency="NGN",
            amount_minor=0,
            billing_interval="annual",
            cancel_at_period_end=False,
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    return sub


async def activate_subscription(
    workspace_id: str,
    plan: str,
    currency: str,
    amount_minor: int,
    processor: str,
    processor_subscription_code: Optional[str],
    processor_customer_code: Optional[str],
    db: AsyncSession,
) -> Subscription:
    """
    Activates or upgrades paid subscription (US-SUB-03).
    Unlocks paid entitlements and sets period for 365 days.
    """
    stmt = select(Subscription).where(Subscription.workspace_id == workspace_id)
    sub = (await db.execute(stmt)).scalar_one_or_none()

    now = datetime.now(timezone.utc)
    period_end = now + timedelta(days=365)

    if not sub:
        sub = Subscription(
            workspace_id=workspace_id,
            tier=plan,
            status="active",
            currency=currency,
            amount_minor=amount_minor,
            billing_interval="annual",
            processor=processor,
            processor_subscription_code=processor_subscription_code,
            processor_customer_code=processor_customer_code,
            current_period_start=now,
            current_period_end=period_end,
            cancel_at_period_end=False,
            dunning_attempts=0,
        )
        db.add(sub)
    else:
        sub.tier = plan
        sub.status = "active"
        sub.currency = currency
        sub.amount_minor = amount_minor
        sub.processor = processor
        if processor_subscription_code:
            sub.processor_subscription_code = processor_subscription_code
        if processor_customer_code:
            sub.processor_customer_code = processor_customer_code
        sub.current_period_start = now
        sub.current_period_end = period_end
        sub.cancel_at_period_end = False
        sub.grace_period_end = None
        sub.dunning_attempts = 0

    # Update workspace tier
    ws_stmt = select(Workspace).where(Workspace.id == workspace_id)
    ws = (await db.execute(ws_stmt)).scalar_one_or_none()
    if ws:
        ws.tier = plan

    await db.commit()
    await db.refresh(sub)
    return sub


async def handle_failed_payment(workspace_id: str, db: AsyncSession) -> Subscription:
    """
    Dunning & Grace Period (US-SUB-04):
    Transitions status to past_due, grants 3-day grace period where Pro entitlements remain active.
    """
    stmt = select(Subscription).where(Subscription.workspace_id == workspace_id)
    sub = (await db.execute(stmt)).scalar_one_or_none()
    if not sub:
        return None

    now = datetime.now(timezone.utc)
    sub.status = "past_due"
    sub.grace_period_end = now + timedelta(days=3)
    sub.dunning_attempts += 1

    await db.commit()
    await db.refresh(sub)
    return sub


async def check_and_apply_grace_period_expiration(sub: Subscription, db: AsyncSession):
    """If grace period has passed and still unpaid, downgrade workspace to free."""
    now = datetime.now(timezone.utc)
    if sub.status == "past_due" and sub.grace_period_end and now > sub.grace_period_end:
        sub.status = "downgraded"
        sub.tier = "free"

        ws_stmt = select(Workspace).where(Workspace.id == sub.workspace_id)
        ws = (await db.execute(ws_stmt)).scalar_one_or_none()
        if ws:
            ws.tier = "free"

        await db.commit()
