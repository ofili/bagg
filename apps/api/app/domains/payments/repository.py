"""Persistence operations for payment profiles, attempts and claims."""

from __future__ import annotations
from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.payments.models import (
    PaymentProfile,
    InvoicePaymentAttempt,
    PaymentClaim,
)
from app.domains.invoices.models import Invoice
from app.domains.workspaces.models import Workspace


class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_profiles(self, workspace_id: str, currency: str | None = None):
        stmt = select(PaymentProfile).where(PaymentProfile.workspace_id == workspace_id)
        if currency:
            stmt = stmt.where(PaymentProfile.currency == currency.upper().strip())
        result = await self.db.execute(
            stmt.order_by(
                PaymentProfile.currency,
                PaymentProfile.is_default.desc(),
                PaymentProfile.created_at.desc(),
            )
        )
        return list(result.scalars().all())

    async def get_profile(
        self, workspace_id: str, profile_id: str, *, lock: bool = False
    ):
        stmt = select(PaymentProfile).where(
            PaymentProfile.workspace_id == workspace_id, PaymentProfile.id == profile_id
        )
        if lock:
            stmt = stmt.with_for_update()
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_currency_profiles(self, workspace_id: str, currency: str):
        result = await self.db.execute(
            select(PaymentProfile)
            .where(
                PaymentProfile.workspace_id == workspace_id,
                PaymentProfile.currency == currency.upper().strip(),
            )
            .order_by(
                PaymentProfile.is_default.desc(), PaymentProfile.created_at.desc()
            )
        )
        return list(result.scalars().all())

    async def unset_default_profiles(
        self, workspace_id: str, currency: str, *, exclude_id: str | None = None
    ):
        stmt = update(PaymentProfile).where(
            PaymentProfile.workspace_id == workspace_id,
            PaymentProfile.currency == currency,
            PaymentProfile.is_default.is_(True),
        )
        if exclude_id:
            stmt = stmt.where(PaymentProfile.id != exclude_id)
        await self.db.execute(stmt.values(is_default=False))

    async def lock_workspace(self, workspace_id: str):
        return (
            await self.db.execute(
                select(Workspace)
                .where(Workspace.id == workspace_id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
        ).scalar_one_or_none()

    async def get_public_invoice_for_checkout(self, token: str):
        from app.domains.clients.models import Client

        result = await self.db.execute(
            select(Invoice, Client, Workspace)
            .join(Client, Invoice.client_id == Client.id, isouter=True)
            .join(Workspace, Invoice.workspace_id == Workspace.id)
            .where(Invoice.share_token == token)
            .with_for_update(of=Invoice)
            .execution_options(populate_existing=True)
        )
        row = result.first()
        return (row[0], row[1], row[2]) if row else None

    async def get_public_invoice(self, token: str):
        result = await self.db.execute(
            select(Invoice).where(Invoice.share_token == token)
        )
        return result.scalar_one_or_none()

    async def get_public_invoice_for_update(self, token: str):
        stmt = (
            select(Invoice)
            .where(Invoice.share_token == token)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def add(self, entity):
        self.db.add(entity)

    async def delete(self, entity):
        await self.db.delete(entity)

    async def flush(self):
        await self.db.flush()

    async def refresh(self, entity):
        await self.db.refresh(entity)

    async def get_attempt_by_reference(
        self, provider: str, reference: str, *, lock: bool = False
    ):
        stmt = select(InvoicePaymentAttempt).where(
            InvoicePaymentAttempt.provider == provider,
            InvoicePaymentAttempt.provider_reference == reference,
        )
        if lock:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def get_attempt(self, attempt_id: str, *, lock: bool = False):
        stmt = select(InvoicePaymentAttempt).where(
            InvoicePaymentAttempt.id == attempt_id
        )
        if lock:
            stmt = stmt.with_for_update().execution_options(populate_existing=True)
        return (await self.db.execute(stmt)).scalar_one_or_none()

    async def list_open_attempts(self, invoice_id: str):
        stmt = (
            select(InvoicePaymentAttempt)
            .where(
                InvoicePaymentAttempt.invoice_id == invoice_id,
                InvoicePaymentAttempt.status.in_(["initializing", "pending"]),
            )
            .with_for_update()
        )
        return list((await self.db.execute(stmt)).scalars().all())

    async def has_processing_attempt(self, invoice_id: str) -> bool:
        stmt = (
            select(InvoicePaymentAttempt.id)
            .where(
                InvoicePaymentAttempt.invoice_id == invoice_id,
                InvoicePaymentAttempt.status == "processing",
            )
            .limit(1)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none() is not None

    async def get_invoice_for_update(self, workspace_id: str, invoice_id: str):
        stmt = (
            select(Invoice)
            .where(Invoice.id == invoice_id, Invoice.workspace_id == workspace_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        return (await self.db.execute(stmt)).scalar_one_or_none()
