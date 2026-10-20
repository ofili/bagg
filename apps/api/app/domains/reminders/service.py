from datetime import datetime, timezone, timedelta, time
from typing import List, Optional
from sqlalchemy import select, and_, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.reminders.models import ReminderJob
from app.domains.invoices.models import Invoice
from app.integrations.email import EmailSender
from app.core.money import format_money
import logging

logger = logging.getLogger(__name__)


def calculate_schedule_datetime(target_date, hour_utc: int = 9) -> datetime:
    """Calculates UTC datetime at 09:00 UTC for a given calendar date."""
    return datetime.combine(target_date, time(hour_utc, 0), tzinfo=timezone.utc)


async def schedule_invoice_reminders(invoice: Invoice, db: AsyncSession) -> List[ReminderJob]:
    """
    Schedules standard 4-stage courteous payment reminder cadence (US-REM-01):
    - 3 days before due date (upcoming_3d)
    - On the due date (due_today)
    - 3 days after due date (overdue_3d)
    - 7 days after due date (overdue_7d)
    """
    if not invoice.due_date:
        return []

    cadence = [
        ("upcoming_3d", invoice.due_date - timedelta(days=3)),
        ("due_today", invoice.due_date),
        ("overdue_3d", invoice.due_date + timedelta(days=3)),
        ("overdue_7d", invoice.due_date + timedelta(days=7)),
    ]

    jobs: List[ReminderJob] = []

    for reminder_type, target_date in cadence:
        idempotency_key = f"{invoice.id}:{reminder_type}"
        # Check if already exists
        stmt = select(ReminderJob).where(ReminderJob.idempotency_key == idempotency_key)
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            jobs.append(existing)
            continue

        scheduled_dt = calculate_schedule_datetime(target_date)

        job = ReminderJob(
            invoice_id=invoice.id,
            reminder_type=reminder_type,
            due_at=scheduled_dt,
            status="pending",
            idempotency_key=idempotency_key,
            attempts=0,
            max_attempts=3,
        )
        db.add(job)
        jobs.append(job)

    await db.commit()
    return jobs


async def cancel_invoice_reminders(invoice_id: str, db: AsyncSession) -> int:
    """
    Auto-Stop Guarantee (US-REM-01):
    Permanently cancels all pending or claimed reminders when an invoice is claimed, paid, or voided.
    """
    stmt = (
        update(ReminderJob)
        .where(
            and_(
                ReminderJob.invoice_id == invoice_id,
                ReminderJob.status.in_(["pending", "claimed"]),
            )
        )
        .values(status="cancelled", updated_at=func.now())
    )
    res = await db.execute(stmt)
    await db.commit()
    return res.rowcount


async def process_due_reminders(db: AsyncSession, limit: int = 10) -> int:
    """
    Reliable Job Claiming via PostgreSQL SKIP LOCKED (US-REM-03).
    Claims due pending reminder jobs, checks 24-hr rate limits, dispatches courteous emails,
    and handles retries / dead-lettering.
    """
    now = datetime.now(timezone.utc)

    # SELECT ... FOR UPDATE SKIP LOCKED
    stmt = (
        select(ReminderJob)
        .where(
            and_(
                ReminderJob.status == "pending",
                ReminderJob.due_at <= now,
                ReminderJob.attempts < ReminderJob.max_attempts,
            )
        )
        .order_by(ReminderJob.due_at.asc())
        .limit(limit)
        .with_for_update(skip_locked=True)
    )
    res = await db.execute(stmt)
    jobs = res.scalars().all()

    processed_count = 0
    email_sender = EmailSender()

    for job in jobs:
        # Mark as claimed
        job.status = "claimed"
        job.last_attempt_at = now
        job.attempts += 1
        await db.commit()

        invoice = job.invoice
        # Auto-stop check
        if not invoice or invoice.status in ["payment_claimed", "paid", "cancelled", "draft"]:
            job.status = "cancelled"
            await db.commit()
            continue

        # 24-hr rate limit per client (US-REM-01)
        recent_sent_stmt = select(ReminderJob).where(
            and_(
                ReminderJob.invoice_id == invoice.id,
                ReminderJob.status == "sent",
                ReminderJob.sent_at >= now - timedelta(hours=24),
                ReminderJob.id != job.id,
            )
        )
        recent_sent = (await db.execute(recent_sent_stmt)).scalars().first()
        if recent_sent:
            # Re-schedule for 24h after the recent send
            job.due_at = recent_sent.sent_at + timedelta(hours=24)
            job.status = "pending"
            await db.commit()
            continue

        client_email = invoice.client.email if (invoice.client and invoice.client.email) else None
        if not client_email:
            job.status = "failed"
            job.error_message = "No client email address on file"
            await db.commit()
            continue

        try:
            share_url = f"http://localhost:3000/i/{invoice.share_token}"
            client_name = invoice.client.name if invoice.client else "Valued Client"
            formatted_total = format_money(invoice.total_minor, invoice.currency)

            await email_sender.send_reminder_email(
                to_email=client_email,
                client_name=client_name,
                invoice_number=invoice.invoice_number,
                formatted_total=formatted_total,
                due_date=invoice.due_date.strftime("%B %d, %Y"),
                share_url=share_url,
                reminder_type=job.reminder_type,
            )
            job.status = "sent"
            job.sent_at = datetime.now(timezone.utc)
            processed_count += 1
        except Exception as exc:
            logger.error(f"Failed to send reminder job {job.id}: {exc}")
            job.error_message = str(exc)
            if job.attempts >= job.max_attempts:
                job.status = "failed"
            else:
                job.status = "pending"

        await db.commit()

    return processed_count
