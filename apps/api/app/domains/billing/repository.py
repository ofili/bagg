"""Persistence boundary for subscriptions, credits and billing webhooks."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.auth.models import User
from app.domains.billing.models import (
    BillingCheckout,
    CreditLedgerEntry,
    Subscription,
    WebhookEvent,
)
from app.domains.invoices.models import Invoice
from app.domains.quotes.models import Quote
from app.domains.workspaces.models import Workspace


class BillingRepository:
    """Owns SQL construction for workspace billing aggregates."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def lock_workspace(self, workspace_id: str) -> Workspace | None:
        statement = (
            select(Workspace)
            .where(Workspace.id == workspace_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return (await self.db.execute(statement)).scalar_one_or_none()

    async def get_subscription(
        self, workspace_id: str, *, lock: bool = False
    ) -> Subscription | None:
        statement = select(Subscription).where(
            Subscription.workspace_id == workspace_id
        )
        if lock:
            statement = statement.with_for_update().execution_options(
                populate_existing=True
            )
        return (await self.db.execute(statement)).scalar_one_or_none()

    async def get_subscription_by_provider_code(
        self, provider: str, subscription_code: str
    ) -> Subscription | None:
        statement = select(Subscription).where(
            Subscription.processor == provider,
            Subscription.processor_subscription_code == subscription_code,
        )
        return (await self.db.execute(statement)).scalar_one_or_none()

    async def get_credit_balance(self, workspace_id: str) -> int:
        """Return the authoritative balance from the append-only ledger."""
        statement = select(func.coalesce(func.sum(CreditLedgerEntry.amount), 0)).where(
            CreditLedgerEntry.workspace_id == workspace_id
        )
        return int((await self.db.execute(statement)).scalar_one() or 0)

    async def find_credit_entry(
        self, workspace_id: str, reason: str, reference: str
    ) -> CreditLedgerEntry | None:
        statement = select(CreditLedgerEntry).where(
            CreditLedgerEntry.workspace_id == workspace_id,
            CreditLedgerEntry.reason == reason,
            CreditLedgerEntry.reference == reference,
        )
        return (await self.db.execute(statement)).scalar_one_or_none()

    async def count_dispatched_since(
        self, workspace_id: str, start: datetime, end: datetime
    ) -> int:
        """Count successful dispatches, independent of later email retries."""

        def dispatched(model):
            return and_(
                model.workspace_id == workspace_id,
                model.sent_at >= start,
                model.sent_at < end,
            )

        invoice_count = (
            await self.db.execute(
                select(func.count(Invoice.id)).where(dispatched(Invoice))
            )
        ).scalar_one()
        quote_count = (
            await self.db.execute(select(func.count(Quote.id)).where(dispatched(Quote)))
        ).scalar_one()
        return int(invoice_count or 0) + int(quote_count or 0)

    async def list_credit_history(
        self, workspace_id: str, limit: int = 20
    ) -> list[CreditLedgerEntry]:
        statement = (
            select(CreditLedgerEntry)
            .where(CreditLedgerEntry.workspace_id == workspace_id)
            .order_by(
                CreditLedgerEntry.created_at.desc(),
                CreditLedgerEntry.id.desc(),
            )
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def get_subscription_by_customer_code(
            self,
            provider: str,
            customer_code: str,
            *,
            lock: bool = False,
    ) -> Subscription | None:
        statement = select(Subscription).where(
            Subscription.processor == provider,
            Subscription.processor_customer_code == customer_code,
            Subscription.processor_subscription_code.is_(None),
            )

        if lock:
            statement = statement.with_for_update().execution_options(
                populate_existing=True
            )

        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def get_checkout_by_id(
            self,
            workspace_id: str,
            checkout_id: str,
            *,
            lock: bool = False,
    ) -> BillingCheckout | None:
        statement = select(BillingCheckout).where(
            BillingCheckout.id == checkout_id,
            BillingCheckout.workspace_id == workspace_id,
            )

        if lock:
            statement = statement.with_for_update().execution_options(
                populate_existing=True
            )

        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def add(self, entity) -> None:
        self.db.add(entity)

    async def flush(self) -> None:
        await self.db.flush()

    async def refresh(self, entity) -> None:
        await self.db.refresh(entity)

    async def get_checkout(
        self, reference: str, *, lock: bool = False
    ) -> BillingCheckout | None:
        statement = select(BillingCheckout).where(
            BillingCheckout.provider_reference == reference
        )
        if lock:
            statement = statement.with_for_update().execution_options(
                populate_existing=True
            )
        return (await self.db.execute(statement)).scalar_one_or_none()

    async def list_expirable_workspace_ids(
        self, now: datetime, limit: int
    ) -> list[str]:
        statement = (
            select(Subscription.workspace_id)
            .where(
                or_(
                    and_(
                        Subscription.cancel_at_period_end.is_(True),
                        Subscription.current_period_end.is_not(None),
                        Subscription.current_period_end <= now,
                    ),
                    and_(
                        Subscription.status == "past_due",
                        Subscription.grace_period_end.is_not(None),
                        Subscription.grace_period_end <= now,
                    ),
                )
            )
            .order_by(Subscription.workspace_id)
            .limit(limit)
        )
        result = await self.db.execute(statement)
        return list(result.scalars().all())

    async def get_owner_email(self, workspace_id: str) -> str | None:
        statement = (
            select(User.email)
            .join(Workspace, Workspace.owner_id == User.id)
            .where(Workspace.id == workspace_id)
        )
        return (await self.db.execute(statement)).scalar_one_or_none()

    async def get_webhook_event(
        self, key: str, *, lock: bool = False
    ) -> WebhookEvent | None:
        statement = select(WebhookEvent).where(WebhookEvent.idempotency_key == key)
        if lock:
            statement = statement.with_for_update().execution_options(
                populate_existing=True
            )
        return (await self.db.execute(statement)).scalar_one_or_none()
