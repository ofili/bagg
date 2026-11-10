"""Invoice reminder scheduling and durable email enqueueing."""

from __future__ import annotations

import logging

from datetime import date, datetime, time, timedelta, timezone
from html import escape
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.money import format_money
from app.domains.invoices.models import Invoice
from app.domains.reminders.models import ReminderJob
from app.domains.reminders.repository import ReminderRepository
from app.integrations.email_outbox import enqueue_email

logger = logging.getLogger(__name__)

REMINDER_LEASE_SECONDS = 300
REMINDER_RATE_LIMIT_HOURS = 24

ACTIVE_INVOICE_STATUSES = {
    "issued",
    "sent",
    "viewed",
    "partially_paid",
}


def calculate_schedule_datetime(
    target_date: date,
    hour_utc: int = 9,
) -> datetime:
    """Calculate the existing reminder convention: 09:00 UTC."""

    return datetime.combine(
        target_date,
        time(hour_utc, 0),
        tzinfo=timezone.utc,
    )


async def list_invoice_reminders(
    invoice_id: str,
    workspace_id: str,
    db: AsyncSession,
) -> list[ReminderJob]:
    """List reminder jobs only when the invoice belongs to the workspace."""
    return await ReminderRepository(db).get_invoice_reminders(
        invoice_id,
        workspace_id,
    )


async def schedule_invoice_reminders(
    invoice: Invoice,
    db: AsyncSession,
    *,
    commit: bool = False,
) -> List[ReminderJob]:
    """Create the standard reminder cadence without owning the caller's commit.

    Idempotency is enforced by reminder_jobs.idempotency_key. The invoice
    sender should call this before committing the dispatch transaction.
    """

    if not invoice.due_date:
        return []

    repository = ReminderRepository(db)

    cadence = [
        ("upcoming_3d", invoice.due_date - timedelta(days=3)),
        ("due_today", invoice.due_date),
        ("overdue_3d", invoice.due_date + timedelta(days=3)),
        ("overdue_7d", invoice.due_date + timedelta(days=7)),
    ]

    jobs: list[ReminderJob] = []

    generation = invoice.issuance_generation or 0

    # Legacy invoices were never assigned a generation. Keep their ``:0:``
    # idempotency keys, but only schedule once the invoice has actually been
    # dispatched. Recall returns the invoice to draft and clears sent_at.
    if invoice.status == "draft" or invoice.sent_at is None:
        return []

    for reminder_type, target_date in cadence:
        idempotency_key = (
            f"{invoice.id}:{generation}:{reminder_type}"
        )

        existing = await repository.get_by_idempotency_key(
            idempotency_key
        )

        if existing is not None:
            jobs.append(existing)
            continue

        job = ReminderJob(
            invoice_id=invoice.id,
            reminder_type=reminder_type,
            due_at=calculate_schedule_datetime(target_date),
            status="pending",
            idempotency_key=idempotency_key,
            attempts=0,
            max_attempts=3,
        )

        db.add(job)
        jobs.append(job)

    await db.flush()

    if commit:
        await db.commit()

    return jobs


async def cancel_invoice_reminders(
    invoice_id: str,
    db: AsyncSession,
    commit: bool = True,
) -> int:
    """Cancel reminder jobs and queued outbox messages for an invoice.

    This is called when an invoice is paid, payment-claimed, recalled or
    otherwise made ineligible for reminders.
    """

    repository = ReminderRepository(db)

    # Match the worker's lock order: outbox first, then reminder jobs. A
    # worker reconciling a reminder holds the outbox row before the job row.
    await repository.cancel_queued_outbox_messages(invoice_id)

    cancelled_count = await repository.cancel_invoice_jobs(invoice_id)

    if commit:
        await db.commit()

    return cancelled_count


def _reminder_email_content(
    *,
    client_name: str,
    invoice_number: str,
    formatted_balance: str,
    due_date: str,
    share_url: str,
    reminder_type: str,
) -> tuple[str, str]:
    subject_map = {
        "upcoming_3d": (
            f"Upcoming: Invoice {invoice_number} is due in 3 days"
        ),
        "due_today": (
            f"Payment Due Today: Invoice {invoice_number}"
        ),
        "overdue_3d": (
            f"Polite Follow-up: Invoice {invoice_number} "
            "was due 3 days ago"
        ),
        "overdue_7d": (
            f"Reminder: Invoice {invoice_number} is overdue"
        ),
    }

    subject = subject_map.get(
        reminder_type,
        f"Payment Reminder: Invoice {invoice_number}",
    )

    safe_client = escape(client_name)
    safe_invoice = escape(invoice_number)
    safe_balance = escape(formatted_balance)
    safe_due_date = escape(due_date)
    safe_url = escape(share_url, quote=True)

    body = (
        f"<p>Dear {safe_client},</p>"
        f"<p>This is a courteous reminder that invoice "
        f"<strong>{safe_invoice}</strong> has an outstanding balance of "
        f"<strong>{safe_balance}</strong>, due on "
        f"<strong>{safe_due_date}</strong>.</p>"
        f'<p><a href="{safe_url}" '
        'style="background-color: #1FA971; color: #ffffff; '
        'padding: 12px 24px; text-decoration: none; border-radius: 8px; '
        'font-weight: bold; display: inline-block;">'
        "View &amp; Pay Invoice</a></p>"
        '<p style="color: #6b7280; font-size: 13px;">'
        'If you have already initiated this transfer, open the link '
        'and tap "I have paid" to submit your confirmation.'
        "</p>"
    )

    html = (
        '<div style="font-family: -apple-system, BlinkMacSystemFont, '
        "'Segoe UI', Roboto, Helvetica, Arial, sans-serif; "
        'max-width: 560px; margin: 0 auto; padding: 24px;">'
        f'<h2 style="color: #3A1F0A; margin: 0 0 16px;">'
        f"Invoice {escape(invoice_number)}</h2>"
        f"{body}"
        '<p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">'
        "Sent via Bagg</p></div>"
    )

    return subject, html


def _outbox_status_to_reminder_status(
    outbox_status: str,
) -> str:
    return {
        "pending": "queued",
        "processing": "queued",
        "sent": "sent",
        "failed": "failed",
        "superseded": "cancelled",
    }.get(outbox_status, "failed")


async def _recover_stale_claim(
    job: ReminderJob,
    repository: ReminderRepository,
) -> bool:
    """Recover legacy claimed jobs without creating duplicate outbox rows.

    Returns True when the job has an existing outbox message and has been
    reconciled. Returns False when it is safe to enqueue a new message.
    """

    existing = await repository.get_latest_outbox_message(job.id)

    if existing is None:
        return False

    job.status = _outbox_status_to_reminder_status(existing.status)

    if existing.status == "sent":
        job.sent_at = existing.sent_at

    if existing.status == "failed":
        job.error_message = (
            existing.last_error_code or "email_delivery_failed"
        )

    if existing.status == "superseded":
        job.error_message = "Reminder email was superseded"

    return True


async def process_due_reminders(
    db: AsyncSession,
    limit: int = 10,
) -> int:
    """Enqueue due reminder emails into the transactional email outbox.

    This function performs no network delivery. The email worker owns provider
    delivery, retry handling and delivery-attempt recording.

    A single database transaction locks reminder jobs, validates invoice
    eligibility, and inserts outbox messages. The unique reminder idempotency
    key and row lock prevent concurrent processors from enqueuing duplicates.
    """

    now = datetime.now(timezone.utc)
    stale_before = now - timedelta(seconds=REMINDER_LEASE_SECONDS)

    repository = ReminderRepository(db)

    queued_count = 0

    try:
        jobs = await repository.get_due_or_stale_jobs(
            now=now,
            stale_before=stale_before,
            limit=limit,
        )

        for job in jobs:
            invoice = job.invoice

            if not invoice:
                job.status = "cancelled"
                job.error_message = "Invoice no longer exists"
                continue

            if job.status == "claimed":
                recovered = await _recover_stale_claim(
                    job,
                    repository,
                )
                if recovered:
                    continue

            if (
                job.status == "claimed"
                and job.attempts >= job.max_attempts
            ):
                job.status = "failed"
                job.error_message = (
                    "Maximum reminder enqueue attempts exceeded"
                )
                continue

            if invoice.status not in ACTIVE_INVOICE_STATUSES:
                job.status = "cancelled"
                job.error_message = (
                    f"Invoice status '{invoice.status}' is not reminder-eligible"
                )
                continue

            payable_minor = (
                invoice.net_payable_minor
                if invoice.net_payable_minor is not None
                else invoice.total_minor
            )
            outstanding_minor = max(
                0,
                payable_minor - (invoice.amount_paid_minor or 0),
            )

            if outstanding_minor <= 0:
                job.status = "cancelled"
                job.error_message = "Invoice has no outstanding balance"
                continue

            client = invoice.client

            if not client or not client.email or not client.email.strip():
                job.status = "failed"
                job.error_message = "No client email address on file"
                continue

            recent_sent = await repository.get_recent_sent_reminder(
                invoice_id=invoice.id,
                exclude_job_id=job.id,
                since=now - timedelta(hours=REMINDER_RATE_LIMIT_HOURS),
            )

            if recent_sent and recent_sent.sent_at:
                job.due_at = recent_sent.sent_at + timedelta(
                    hours=REMINDER_RATE_LIMIT_HOURS
                )
                job.status = "pending"
                continue

            if not invoice.share_token:
                job.status = "failed"
                job.error_message = "Invoice has no active public share token"
                continue

            base_url = settings.WEB_BASE_URL.rstrip("/")
            share_url = f"{base_url}/i/{invoice.share_token}"

            client_name = client.name or "Valued Client"
            invoice_number = invoice.invoice_number or invoice.id

            formatted_balance = format_money(
                outstanding_minor,
                invoice.currency,
            )

            due_date_text = (
                invoice.due_date.strftime("%B %d, %Y")
                if invoice.due_date
                else "the agreed date"
            )

            subject, html = _reminder_email_content(
                client_name=client_name,
                invoice_number=invoice_number,
                formatted_balance=formatted_balance,
                due_date=due_date_text,
                share_url=share_url,
                reminder_type=job.reminder_type,
            )

            # The encrypted outbox row and the reminder's queued state are
            # committed in the same transaction.
            enqueue_email(
                db,
                message_type="invoice_reminder",
                aggregate_id=job.id,
                payload={
                    "to_email": client.email.strip(),
                    "subject": subject,
                    "html": html,
                },
            )

            job.status = "queued"
            job.last_attempt_at = now
            job.attempts += 1
            job.error_message = None
            job.updated_at = now

            queued_count += 1

        await db.commit()
        return queued_count

    except Exception:
        await db.rollback()
        logger.exception("Failed to enqueue due invoice reminders")
        raise
