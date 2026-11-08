"""Persistence boundary for recurring invoice workflows."""

from __future__ import annotations

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.repository import SQLAlchemyRepository
from app.domains.clients.models import Client
from app.domains.invoices.models import Invoice
from app.domains.payments.models import PaymentProfile
from app.domains.recurring_invoices.models import RecurringInvoiceSchedule
from app.domains.workspaces.models import Workspace


class RecurringInvoiceRepository(SQLAlchemyRepository[RecurringInvoiceSchedule]):
    def __init__(self, session: AsyncSession):
        super().__init__(session, RecurringInvoiceSchedule)

    async def get_for_workspace(
        self, schedule_id: str, workspace_id: str, *, for_update: bool = False
    ) -> RecurringInvoiceSchedule | None:
        statement = select(RecurringInvoiceSchedule).where(
            RecurringInvoiceSchedule.id == schedule_id,
            RecurringInvoiceSchedule.workspace_id == workspace_id,
        )
        if for_update:
            statement = statement.with_for_update()
        return (await self.session.execute(statement)).scalar_one_or_none()

    async def get_for_worker(
        self, schedule_id: str, *, skip_locked: bool = True
    ) -> RecurringInvoiceSchedule | None:
        statement = (
            select(RecurringInvoiceSchedule)
            .where(RecurringInvoiceSchedule.id == schedule_id)
            .with_for_update(skip_locked=skip_locked)
        )
        return (await self.session.execute(statement)).scalar_one_or_none()

    async def get_due_ids(self, *, limit: int) -> list[str]:
        statement = (
            select(RecurringInvoiceSchedule.id)
            .where(RecurringInvoiceSchedule.status == "active")
            .order_by(RecurringInvoiceSchedule.next_run_date.asc())
            .limit(limit)
        )
        return list((await self.session.execute(statement)).scalars().all())

    async def list_for_workspace(
        self, workspace_id: str, *, status: str | None, limit: int, offset: int
    ) -> tuple[list[RecurringInvoiceSchedule], int]:
        filters = [RecurringInvoiceSchedule.workspace_id == workspace_id]
        if status is not None:
            filters.append(RecurringInvoiceSchedule.status == status)
        total = (
            await self.session.execute(
                select(func.count(RecurringInvoiceSchedule.id)).where(*filters)
            )
        ).scalar_one()
        rows = (
            (
                await self.session.execute(
                    select(RecurringInvoiceSchedule)
                    .where(*filters)
                    .order_by(RecurringInvoiceSchedule.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
        return list(rows), int(total)

    async def get_client(self, client_id: str, workspace_id: str) -> Client | None:
        return (
            await self.session.execute(
                select(Client).where(
                    Client.id == client_id, Client.workspace_id == workspace_id
                )
            )
        ).scalar_one_or_none()

    async def get_payment_profile(
        self, profile_id: str, workspace_id: str
    ) -> PaymentProfile | None:
        return (
            await self.session.execute(
                select(PaymentProfile).where(
                    PaymentProfile.id == profile_id,
                    PaymentProfile.workspace_id == workspace_id,
                )
            )
        ).scalar_one_or_none()

    async def get_workspace(self, workspace_id: str) -> Workspace | None:
        return await self.session.get(Workspace, workspace_id)

    async def get_period_invoice(
        self, schedule_id: str, period_key: str
    ) -> Invoice | None:
        return (
            await self.session.execute(
                select(Invoice).where(
                    Invoice.recurring_schedule_id == schedule_id,
                    Invoice.recurring_period_key == period_key,
                )
            )
        ).scalar_one_or_none()

    async def list_generated_invoices(
        self, workspace_id: str, schedule_id: str, *, limit: int, offset: int
    ) -> tuple[list[Invoice], int]:
        filters = [
            Invoice.workspace_id == workspace_id,
            Invoice.recurring_schedule_id == schedule_id,
        ]
        total = (
            await self.session.execute(select(func.count(Invoice.id)).where(*filters))
        ).scalar_one()
        rows = (
            (
                await self.session.execute(
                    select(Invoice)
                    .where(*filters)
                    .order_by(
                        Invoice.recurring_period_start.desc(), Invoice.created_at.desc()
                    )
                    .limit(limit)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
        return list(rows), int(total)

    async def list_auto_issue_drafts_for_date(self, period_date: date) -> list[Invoice]:
        return list(
            (
                await self.session.execute(
                    select(Invoice)
                    .join(
                        RecurringInvoiceSchedule,
                        RecurringInvoiceSchedule.id == Invoice.recurring_schedule_id,
                    )
                    .where(
                        RecurringInvoiceSchedule.issue_mode == "auto_issue",
                        Invoice.status == "draft",
                        Invoice.recurring_period_start == period_date,
                    )
                )
            )
            .scalars()
            .all()
        )
