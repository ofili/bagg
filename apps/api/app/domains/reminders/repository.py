"""Persistence boundary for invoice reminders."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, or_, select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domains.reminders.models import ReminderJob
from app.integrations.email_models import EmailOutbox


class ReminderRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_idempotency_key(
        self,
        idempotency_key: str,
    ) -> ReminderJob | None:
        result = await self.db.execute(
            select(ReminderJob).where(ReminderJob.idempotency_key == idempotency_key)
        )
        return result.scalar_one_or_none()

    async def list_for_invoice(
        self,
        invoice_id: str,
    ) -> list[ReminderJob]:
        result = await self.db.execute(
            select(ReminderJob)
            .where(ReminderJob.invoice_id == invoice_id)
            .order_by(ReminderJob.due_at.asc())
        )
        return list(result.scalars().all())

    async def get_due_or_stale_jobs(
        self,
        *,
        now: datetime,
        stale_before: datetime,
        limit: int,
    ) -> list[ReminderJob]:
        """Lock eligible jobs so concurrent processors cannot enqueue twice."""

        result = await self.db.execute(
            select(ReminderJob)
            .options(selectinload(ReminderJob.invoice))
            .where(
                or_(
                    and_(
                        ReminderJob.status == "pending",
                        ReminderJob.due_at <= now,
                        ReminderJob.attempts < ReminderJob.max_attempts,
                    ),
                    and_(
                        ReminderJob.status == "claimed",
                        ReminderJob.last_attempt_at.is_not(None),
                        ReminderJob.last_attempt_at <= stale_before,
                    ),
                )
            )
            .order_by(ReminderJob.due_at.asc())
            .limit(limit)
            .with_for_update(skip_locked=True)
        )
        return list(result.scalars().all())

    async def get_latest_outbox_message(
        self,
        reminder_job_id: str,
    ) -> EmailOutbox | None:
        result = await self.db.execute(
            select(EmailOutbox)
            .where(
                EmailOutbox.message_type == "invoice_reminder",
                EmailOutbox.aggregate_id == reminder_job_id,
            )
            .order_by(EmailOutbox.created_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    async def get_recent_sent_reminder(
        self,
        *,
        invoice_id: str,
        exclude_job_id: str,
        since: datetime,
    ) -> ReminderJob | None:
        result = await self.db.execute(
            select(ReminderJob)
            .where(
                ReminderJob.invoice_id == invoice_id,
                ReminderJob.status == "sent",
                ReminderJob.sent_at >= since,
                ReminderJob.id != exclude_job_id,
            )
            .order_by(ReminderJob.sent_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    async def cancel_invoice_jobs(
        self,
        invoice_id: str,
    ) -> int:
        result = await self.db.execute(
            update(ReminderJob)
            .where(
                ReminderJob.invoice_id == invoice_id,
                ReminderJob.status.in_(["pending", "claimed", "queued"]),
            )
            .values(
                status="cancelled",
                updated_at=func.now(),
            )
        )
        return result.rowcount or 0

    async def cancel_queued_outbox_messages(
        self,
        invoice_id: str,
    ) -> int:
        reminder_ids = select(ReminderJob.id).where(
            ReminderJob.invoice_id == invoice_id
        )

        result = await self.db.execute(
            update(EmailOutbox)
            .where(
                EmailOutbox.message_type == "invoice_reminder",
                EmailOutbox.aggregate_id.in_(reminder_ids),
                EmailOutbox.status.in_(["pending", "processing"]),
            )
            .values(
                status="superseded",
                encrypted_payload=None,
                locked_at=None,
                locked_by=None,
                updated_at=func.now(),
            )
        )
        return result.rowcount or 0

    async def get_invoice_reminders(
        self,
        invoice_id: str,
        workspace_id: str,
    ) -> list[ReminderJob]:
        from app.domains.invoices.models import Invoice

        invoice_result = await self.db.execute(
            select(Invoice.id).where(
                Invoice.id == invoice_id,
                Invoice.workspace_id == workspace_id,
            )
        )

        if invoice_result.scalar_one_or_none() is None:
            return []

        return await self.list_for_invoice(invoice_id)
