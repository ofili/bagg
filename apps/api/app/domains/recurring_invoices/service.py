from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import and_, desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BadRequestException, NotFoundException
from app.core.money import calculate_invoice_totals
from app.domains.clients.models import Client
from app.domains.invoices.models import Invoice, InvoiceLineItem
from app.domains.invoices.service import finalize_invoice
from app.domains.recurring_invoices.calendar import (
    is_schedule_ended,
)
from app.domains.recurring_invoices.calendar import (
    next_occurrence,
    period_end,
    period_key,
)
from app.domains.recurring_invoices.models import (
    RecurringInvoiceSchedule,
    RecurringInvoiceScheduleRevision,
)
from app.domains.recurring_invoices.repository import RecurringInvoiceRepository
from app.domains.recurring_invoices.schemas import (
    RecurringScheduleCreate,
    RecurringScheduleUpdate,
)
from app.domains.workspaces.models import Workspace

logger = logging.getLogger(__name__)


PAID_TIERS = {"creator_pro", "professional"}


def validate_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError):
        raise BadRequestException(f"Invalid timezone: {value}")
    return value


def local_today(timezone_name: str) -> date:
    return datetime.now(ZoneInfo(timezone_name)).date()


async def require_recurring_entitlement(
    db: AsyncSession,
    workspace: Workspace,
) -> None:
    """
    Use Workspace.tier, matching Bagg's existing delivery-quota entitlement
    check. Subscription lifecycle jobs are responsible for changing the
    workspace tier when grace expires or a plan is downgraded.
    """
    if workspace.tier not in PAID_TIERS:
        raise BadRequestException(
            "Recurring invoices are available on Creator Pro and Professional plans."
        )


async def get_schedule(
    db: AsyncSession,
    workspace: Workspace,
    schedule_id: str,
    *,
    lock: bool = False,
) -> RecurringInvoiceSchedule:
    schedule = await RecurringInvoiceRepository(db).get_for_workspace(
        schedule_id, workspace.id, for_update=lock
    )
    if schedule is None:
        raise NotFoundException("Recurring invoice schedule not found.")
    return schedule


async def _validate_payment_profile(
    db: AsyncSession,
    workspace: Workspace,
    payment_profile_id: str | None,
    currency: str,
) -> None:
    if not payment_profile_id:
        return

    profile = await RecurringInvoiceRepository(db).get_payment_profile(
        payment_profile_id, workspace.id
    )

    if profile is None:
        raise NotFoundException("Payment profile not found.")
    if profile.currency.upper() != currency.upper():
        raise BadRequestException(
            "Payment profile currency must match schedule currency."
        )


def _validate_deposit_configuration(
    deposit_percentage: float | None,
    deposit_amount_minor: int | None,
) -> None:
    if deposit_percentage is not None and deposit_amount_minor is not None:
        raise BadRequestException(
            "Specify either a deposit percentage or a fixed deposit amount, not both."
        )


def _validate_end_configuration(
    *,
    end_rule: str,
    end_after_count: int | None,
    end_date: date | None,
    generated_count: int,
    next_run_date: date,
) -> None:
    if end_rule == "never":
        if end_after_count is not None or end_date is not None:
            raise BadRequestException(
                "end_after_count and end_date must be omitted when end_rule is never."
            )
        return

    if end_rule == "after_count":
        if end_after_count is None:
            raise BadRequestException(
                "end_after_count is required when end_rule is after_count."
            )
        if end_date is not None:
            raise BadRequestException(
                "end_date must be omitted when end_rule is after_count."
            )
        if end_after_count <= generated_count:
            raise BadRequestException(
                "end_after_count must be greater than the number of invoices already generated."
            )
        return

    if end_rule == "on_date":
        if end_date is None:
            raise BadRequestException("end_date is required when end_rule is on_date.")
        if end_after_count is not None:
            raise BadRequestException(
                "end_after_count must be omitted when end_rule is on_date."
            )
        if end_date < next_run_date:
            raise BadRequestException(
                "end_date cannot be earlier than the next scheduled period."
            )
        return

    raise BadRequestException("Unsupported recurring schedule end rule.")


async def create_schedule(
    db: AsyncSession,
    workspace: Workspace,
    payload: RecurringScheduleCreate,
    *,
    user_id: str,
) -> RecurringInvoiceSchedule:
    await require_recurring_entitlement(db, workspace)

    timezone_name = validate_timezone(payload.timezone)
    if payload.start_date < local_today(timezone_name):
        raise BadRequestException("The start date cannot be in the past.")

    _validate_end_configuration(
        end_rule=payload.end_rule,
        end_after_count=payload.end_after_count,
        end_date=payload.end_date,
        generated_count=0,
        next_run_date=payload.start_date,
    )
    _validate_deposit_configuration(
        payload.deposit_percentage,
        payload.deposit_amount_minor,
    )

    client = await RecurringInvoiceRepository(db).get_client(
        payload.client_id, workspace.id
    )
    if not client:
        raise NotFoundException("Client not found.")

    await _validate_payment_profile(
        db,
        workspace,
        payload.payment_profile_id,
        payload.currency,
    )

    items = [item.model_dump() for item in payload.items]
    schedule = RecurringInvoiceSchedule(
        workspace_id=workspace.id,
        client_id=client.id,
        name=payload.name.strip(),
        currency=payload.currency,
        frequency=payload.frequency,
        interval=payload.interval,
        start_date=payload.start_date,
        next_run_date=payload.start_date,
        anchor_day=payload.start_date.day,
        anchor_month=payload.start_date.month,
        end_rule=payload.end_rule,
        end_after_count=payload.end_after_count,
        end_date=payload.end_date,
        draft_lead_days=payload.draft_lead_days,
        due_date_offset_days=payload.due_date_offset_days,
        issue_mode=payload.issue_mode,
        review_reminder_days=payload.review_reminder_days,
        items=items,
        discount_minor=payload.discount_minor,
        tax_rate_percent=payload.tax_rate_percent,
        wht_rate_percent=payload.wht_rate_percent,
        deposit_percentage=payload.deposit_percentage,
        deposit_amount_minor=payload.deposit_amount_minor,
        payment_profile_id=payload.payment_profile_id,
        direct_checkout_enabled=payload.direct_checkout_enabled,
        notes=payload.notes,
        timezone=timezone_name,
        pause_if_previous_overdue_days=payload.pause_if_previous_overdue_days,
        created_by_user_id=user_id,
    )
    db.add(schedule)
    await db.flush()

    db.add(
        RecurringInvoiceScheduleRevision(
            schedule_id=schedule.id,
            version=1,
            effective_from=payload.start_date,
            items_snapshot=items,
            currency=payload.currency,
            discount_minor=payload.discount_minor,
            tax_rate_percent=payload.tax_rate_percent,
            wht_rate_percent=payload.wht_rate_percent,
            deposit_percentage=payload.deposit_percentage,
            deposit_amount_minor=payload.deposit_amount_minor,
            direct_checkout_enabled=payload.direct_checkout_enabled,
            notes=payload.notes,
            change_reason="Initial schedule configuration",
        )
    )

    await db.commit()
    await db.refresh(schedule)
    return schedule


async def update_schedule(
    db: AsyncSession,
    workspace: Workspace,
    schedule_id: str,
    payload: RecurringScheduleUpdate,
) -> RecurringInvoiceSchedule:
    await require_recurring_entitlement(db, workspace)
    schedule = await get_schedule(db, workspace, schedule_id, lock=True)

    if schedule.status in {"cancelled", "completed"}:
        raise BadRequestException(f"A {schedule.status} schedule cannot be edited.")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return schedule

    if "currency" in changes and changes["currency"] is not None:
        currency = changes["currency"].upper().strip()
        from app.core.money import validate_currency

        if not validate_currency(currency):
            raise BadRequestException("Unsupported currency.")
        changes["currency"] = currency

    if "items" in changes and changes["items"] is not None:
        changes["items"] = [
            item.model_dump() if hasattr(item, "model_dump") else item
            for item in changes["items"]
        ]
        if not changes["items"]:
            raise BadRequestException(
                "A recurring schedule must contain at least one line item."
            )

    merged = {
        "end_rule": schedule.end_rule,
        "end_after_count": schedule.end_after_count,
        "end_date": schedule.end_date,
        "generated_count": schedule.generated_count,
        "next_run_date": schedule.next_run_date,
        "deposit_percentage": schedule.deposit_percentage,
        "deposit_amount_minor": schedule.deposit_amount_minor,
    }
    merged.update(changes)

    _validate_end_configuration(
        end_rule=merged["end_rule"],
        end_after_count=merged["end_after_count"],
        end_date=merged["end_date"],
        generated_count=merged["generated_count"],
        next_run_date=merged["next_run_date"],
    )
    _validate_deposit_configuration(
        merged["deposit_percentage"],
        merged["deposit_amount_minor"],
    )

    target_currency = changes.get("currency", schedule.currency)
    target_profile_id = changes.get(
        "payment_profile_id",
        schedule.payment_profile_id,
    )
    if "payment_profile_id" in changes or "currency" in changes:
        await _validate_payment_profile(
            db,
            workspace,
            target_profile_id,
            target_currency,
        )

    # Fields represented in a revision must be resolved from that revision
    # when Package 3 generates the next invoice. Keep schedule configuration
    # and the immutable revision snapshot in sync.
    revision_fields = {
        "items",
        "currency",
        "discount_minor",
        "tax_rate_percent",
        "wht_rate_percent",
        "deposit_percentage",
        "deposit_amount_minor",
        "direct_checkout_enabled",
        "notes",
    }
    revision_changed = bool(revision_fields.intersection(changes))

    for field, value in changes.items():
        setattr(schedule, field, value)

    if revision_changed:
        latest_version = max(
            (revision.version for revision in schedule.revisions),
            default=0,
        )
        db.add(
            RecurringInvoiceScheduleRevision(
                schedule_id=schedule.id,
                version=latest_version + 1,
                effective_from=schedule.next_run_date,
                items_snapshot=schedule.items,
                currency=schedule.currency,
                discount_minor=schedule.discount_minor,
                tax_rate_percent=schedule.tax_rate_percent,
                wht_rate_percent=schedule.wht_rate_percent,
                deposit_percentage=schedule.deposit_percentage,
                deposit_amount_minor=schedule.deposit_amount_minor,
                direct_checkout_enabled=schedule.direct_checkout_enabled,
                notes=schedule.notes,
                change_reason="Schedule updated",
            )
        )

    await db.commit()
    await db.refresh(schedule)
    return schedule


async def process_schedule(
    db: AsyncSession,
    schedule_id: str,
    *,
    today: date | None = None,
) -> list[Invoice]:
    """
    Backwards-compatible service entry point.

    Generation is delegated to generate_one_due_schedule so the legacy
    worker path cannot independently backfill periods or bypass the
    schedule's idempotency and snapshot rules.
    """
    invoice = await generate_one_due_schedule(
        db,
        schedule_id,
        today=today,
    )
    return [invoice] if invoice is not None else []


async def list_schedules(
    db: AsyncSession,
    workspace: Workspace,
    *,
    schedule_status: str | None = None,
    limit: int = 25,
    offset: int = 0,
) -> tuple[list[RecurringInvoiceSchedule], int]:
    return await RecurringInvoiceRepository(db).list_for_workspace(
        workspace.id, status=schedule_status, limit=limit, offset=offset
    )


async def pause_schedule(
    db: AsyncSession,
    workspace: Workspace,
    schedule_id: str,
):
    schedule = await get_schedule(db, workspace, schedule_id, lock=True)
    if schedule.status != "active":
        raise BadRequestException("Only active schedules can be paused.")

    schedule.status = "paused"
    schedule.paused_at = datetime.now(timezone.utc)
    schedule.pause_started_on = local_today(schedule.timezone)

    await db.commit()
    await db.refresh(schedule)
    return schedule


async def resume_schedule(
    db: AsyncSession,
    workspace: Workspace,
    schedule_id: str,
    missed_period_policy: str,
):
    schedule = await get_schedule(db, workspace, schedule_id, lock=True)
    if schedule.status != "paused":
        raise BadRequestException("Only paused schedules can be resumed.")

    if missed_period_policy != "skip_missed":
        raise BadRequestException(
            "The only supported missed-period policy is skip_missed."
        )

    await require_recurring_entitlement(db, workspace)

    today = local_today(schedule.timezone)
    while schedule.next_run_date < today:
        schedule.next_run_date = next_occurrence(
            schedule.next_run_date,
            schedule.frequency,
            schedule.interval,
            anchor_day=schedule.anchor_day,
            anchor_month=schedule.anchor_month,
        )

    schedule.paused_at = None
    schedule.pause_started_on = None
    schedule.resume_policy = "skip_missed"

    if is_schedule_ended(
        end_rule=schedule.end_rule,
        generated_count=schedule.generated_count,
        end_after_count=schedule.end_after_count,
        end_date=schedule.end_date,
        next_run_date=schedule.next_run_date,
    ):
        schedule.status = "completed"
        schedule.completed_at = datetime.now(timezone.utc)
    else:
        schedule.status = "active"

    # A resume is an explicit lifecycle event, not a schedule-term revision.
    await db.commit()
    await db.refresh(schedule)
    return schedule


async def cancel_schedule(
    db: AsyncSession,
    workspace: Workspace,
    schedule_id: str,
):
    schedule = await get_schedule(db, workspace, schedule_id, lock=True)
    if schedule.status == "cancelled":
        return schedule
    if schedule.status == "completed":
        raise BadRequestException("A completed schedule cannot be cancelled.")

    schedule.status = "cancelled"
    schedule.cancelled_at = datetime.now(timezone.utc)

    # Generated invoices are independent financial records and are retained.
    await db.commit()
    await db.refresh(schedule)
    return schedule


async def list_generated_invoices(
    db: AsyncSession,
    workspace: Workspace,
    schedule_id: str,
    *,
    limit: int = 25,
    offset: int = 0,
) -> tuple[list[Invoice], int]:
    # Check schedule ownership before querying its invoice history.
    schedule = await get_schedule(db, workspace, schedule_id)
    return await RecurringInvoiceRepository(db).list_generated_invoices(
        workspace.id, schedule.id, limit=limit, offset=offset
    )


class RecurringInvoiceError(Exception):
    pass


def _local_today(timezone_name: str) -> date:
    try:
        return datetime.now(ZoneInfo(timezone_name)).date()
    except Exception as exc:
        raise RecurringInvoiceError(
            f"Invalid schedule timezone: {timezone_name}"
        ) from exc


def _effective_terms(
    schedule: RecurringInvoiceSchedule,
    period_start: date,
) -> dict[str, Any]:
    """
    Resolve the terms applicable to a new invoice.

    Revisions are effective from their effective_from date. Existing invoices
    are never rewritten when a schedule is revised.
    """
    eligible = [
        revision
        for revision in schedule.revisions
        if revision.effective_from <= period_start
    ]

    if not eligible:
        return {
            "currency": schedule.currency,
            "items": schedule.items,
            "discount_minor": schedule.discount_minor,
            "tax_rate_percent": schedule.tax_rate_percent,
            "wht_rate_percent": schedule.wht_rate_percent,
            "deposit_percentage": schedule.deposit_percentage,
            "deposit_amount_minor": schedule.deposit_amount_minor,
            "direct_checkout_enabled": schedule.direct_checkout_enabled,
            "notes": schedule.notes,
        }

    revision = max(
        eligible,
        key=lambda item: (item.effective_from, item.version),
    )

    return {
        "currency": revision.currency,
        "items": revision.items_snapshot,
        "discount_minor": revision.discount_minor,
        "tax_rate_percent": revision.tax_rate_percent,
        "wht_rate_percent": revision.wht_rate_percent,
        "deposit_percentage": revision.deposit_percentage,
        "deposit_amount_minor": revision.deposit_amount_minor,
        "direct_checkout_enabled": revision.direct_checkout_enabled,
        "notes": revision.notes,
    }


async def _get_workspace(
    db: AsyncSession,
    workspace_id: str,
) -> Workspace | None:
    return await RecurringInvoiceRepository(db).get_workspace(workspace_id)


async def _has_paid_entitlement(
    db: AsyncSession,
    workspace: Workspace,
) -> bool:
    try:
        await require_recurring_entitlement(db, workspace)
        return True
    except BadRequestException:
        return False


async def _previous_invoice(
    db: AsyncSession,
    schedule: RecurringInvoiceSchedule,
) -> Invoice | None:
    result = await db.execute(
        select(Invoice)
        .where(
            Invoice.recurring_schedule_id == schedule.id,
            Invoice.status != "cancelled",
        )
        .order_by(desc(Invoice.recurring_period_start))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _should_pause_for_overdue(
    db: AsyncSession,
    schedule: RecurringInvoiceSchedule,
    today: date,
) -> bool:
    threshold = schedule.pause_if_previous_overdue_days
    if threshold is None:
        return False

    previous = await _previous_invoice(db, schedule)
    if previous is None or previous.due_date is None:
        return False

    if previous.status not in {
        "issued",
        "sent",
        "viewed",
        "payment_claimed",
        "partially_paid",
    }:
        return False

    # A payment claim is not proof of payment, but it should not be treated
    # as a fully paid invoice. The actual confirmed balance remains decisive.
    payable = (
        previous.net_payable_minor
        if previous.net_payable_minor and previous.net_payable_minor > 0
        else previous.total_minor
    )
    outstanding = max(
        0,
        payable - (previous.amount_paid_minor or 0),
    )

    if outstanding <= 0:
        return False

    return (today - previous.due_date).days >= threshold


async def _existing_period_invoice(
    db: AsyncSession,
    schedule_id: str,
    key: str,
) -> Invoice | None:
    return await RecurringInvoiceRepository(db).get_period_invoice(schedule_id, key)


async def _create_period_invoice(
    db: AsyncSession,
    schedule: RecurringInvoiceSchedule,
    workspace: Workspace,
    client: Client,
    period_start: date,
    period_finish: date,
    key: str,
) -> Invoice:
    """
    Create a normal draft invoice without allocating an invoice number.

    Invoice numbering belongs to finalize_invoice(), which is the existing
    issuance boundary in Bagg.
    """
    terms = _effective_terms(schedule, period_start)
    items = terms["items"] or []

    if not items:
        raise RecurringInvoiceError(
            f"Recurring schedule {schedule.id} has no line items."
        )

    normalized_items: list[dict[str, Any]] = []
    for item in items:
        description = str(item.get("description", "")).strip()
        quantity = int(item.get("quantity", 0))
        unit_price_minor = int(item.get("unit_price_minor", -1))

        if not description:
            raise RecurringInvoiceError(
                "Recurring invoice line item description cannot be empty."
            )
        if quantity < 1 or unit_price_minor < 0:
            raise RecurringInvoiceError(
                "Recurring invoice line item quantity or price is invalid."
            )

        normalized_items.append(
            {
                "description": description,
                "quantity": quantity,
                "unit_price_minor": unit_price_minor,
            }
        )

    totals = calculate_invoice_totals(
        items=[
            {
                "quantity": item["quantity"],
                "unit_price_minor": item["unit_price_minor"],
            }
            for item in normalized_items
        ],
        discount_minor=terms["discount_minor"],
        tax_percent=terms["tax_rate_percent"],
        wht_percent=terms["wht_rate_percent"],
        deposit_percent=terms["deposit_percentage"] or 0.0,
        deposit_amount_minor=terms["deposit_amount_minor"],
    )

    if totals["total_minor"] <= 0:
        raise RecurringInvoiceError(
            "Recurring invoice total must be greater than zero."
        )

    due_date = period_start + timedelta(days=schedule.due_date_offset_days)

    invoice = Invoice(
        workspace_id=workspace.id,
        client_id=client.id,
        currency=terms["currency"],
        status="draft",
        issue_date=period_start,
        due_date=due_date,
        subtotal_minor=totals["subtotal_minor"],
        discount_minor=terms["discount_minor"],
        tax_rate_percent=terms["tax_rate_percent"],
        tax_minor=totals["tax_minor"],
        total_minor=totals["total_minor"],
        wht_rate_percent=terms["wht_rate_percent"],
        wht_minor=totals["wht_minor"],
        net_payable_minor=totals["net_payable_minor"],
        deposit_percentage=terms["deposit_percentage"],
        deposit_amount_minor=totals["deposit_amount_minor"],
        direct_checkout_enabled=terms["direct_checkout_enabled"],
        amount_paid_minor=0,
        payment_profile_id=schedule.payment_profile_id,
        notes=terms["notes"],
        version=1,
        recurring_schedule_id=schedule.id,
        recurring_period_key=key,
        recurring_period_start=period_start,
        recurring_period_end=period_finish,
        recurring_label=(
            f"{schedule.name} · {schedule.generated_count + 1}"
            if schedule.name
            else f"Recurring invoice · {schedule.generated_count + 1}"
        ),
    )

    db.add(invoice)
    await db.flush()

    for position, item in enumerate(normalized_items):
        db.add(
            InvoiceLineItem(
                invoice_id=invoice.id,
                position=position,
                description=item["description"],
                quantity=item["quantity"],
                unit_price_minor=item["unit_price_minor"],
                total_minor=(item["quantity"] * item["unit_price_minor"]),
            )
        )

    await db.flush()
    return invoice


def _generation_date(schedule: RecurringInvoiceSchedule) -> date:
    """Return when an occurrence may be created for its issue mode."""
    if schedule.issue_mode == "auto_issue":
        return schedule.next_run_date
    return schedule.next_run_date - timedelta(days=schedule.draft_lead_days)


async def generate_one_due_schedule(
    db: AsyncSession,
    schedule_id: str,
    *,
    today: date | None = None,
) -> Invoice | None:
    """
    Generate at most one occurrence for a schedule.

    Uses a row lock to serialize concurrent workers. The unique constraint
    on (recurring_schedule_id, recurring_period_key) remains the final
    idempotency guarantee.
    """
    schedule = await RecurringInvoiceRepository(db).get_for_worker(
        schedule_id, skip_locked=True
    )

    if schedule is None or schedule.status != "active":
        return None

    today = today or _local_today(schedule.timezone)

    workspace = await _get_workspace(db, schedule.workspace_id)
    if workspace is None:
        schedule.status = "cancelled"
        schedule.cancelled_at = datetime.now(timezone.utc)
        await db.commit()
        return None

    if not await _has_paid_entitlement(db, workspace):
        # Do not destroy or cancel the schedule. It can resume after upgrade.
        await db.commit()
        return None

    if is_schedule_ended(
        end_rule=schedule.end_rule,
        generated_count=schedule.generated_count,
        end_after_count=schedule.end_after_count,
        end_date=schedule.end_date,
        next_run_date=schedule.next_run_date,
    ):
        schedule.status = "completed"
        schedule.completed_at = datetime.now(timezone.utc)
        await db.commit()
        return None

    if await _should_pause_for_overdue(db, schedule, today):
        schedule.status = "paused"
        schedule.paused_at = datetime.now(timezone.utc)
        await db.commit()
        return None

    # Draft-review schedules can be prepared in advance. Auto-issue schedules
    # are generated only on their actual period date so a delayed worker can
    # never silently issue a stale invoice.
    generation_date = _generation_date(schedule)

    if today < generation_date:
        await db.rollback()
        return None

    period_start = schedule.next_run_date
    next_start = next_occurrence(
        period_start,
        schedule.frequency,
        schedule.interval,
        anchor_day=schedule.anchor_day,
        anchor_month=schedule.anchor_month,
    )
    period_finish = period_end(period_start, next_start)
    key = period_key(period_start, schedule.frequency)

    existing = await _existing_period_invoice(
        db,
        schedule.id,
        key,
    )
    if existing is not None:
        # Repair schedule advancement if a prior deployment or manual
        # intervention left an invoice without an advanced schedule.
        schedule.generated_count += 1
        schedule.next_run_date = next_start
        await db.commit()
        return existing

    client = await RecurringInvoiceRepository(db).get_client(
        schedule.client_id, workspace.id
    )

    if client is None:
        schedule.status = "paused"
        schedule.paused_at = datetime.now(timezone.utc)
        await db.commit()
        logger.error(
            "Recurring schedule %s paused: client no longer exists.",
            schedule.id,
        )
        return None

    try:
        invoice = await _create_period_invoice(
            db,
            schedule,
            workspace,
            client,
            period_start,
            period_finish,
            key,
        )

        schedule.generated_count += 1
        schedule.next_run_date = next_start

        if is_schedule_ended(
            end_rule=schedule.end_rule,
            generated_count=schedule.generated_count,
            end_after_count=schedule.end_after_count,
            end_date=schedule.end_date,
            next_run_date=schedule.next_run_date,
        ):
            schedule.status = "completed"
            schedule.completed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(invoice)
        return invoice

    except IntegrityError:
        await db.rollback()

        # Another worker may have won the race. Query after rollback.
        existing = await _existing_period_invoice(
            db,
            schedule.id,
            key,
        )
        if existing is not None:
            return existing
        raise

    except Exception:
        await db.rollback()
        raise


async def process_due_recurring_invoices(
    db: AsyncSession,
    *,
    limit: int = 50,
    today: date | None = None,
) -> dict[str, int]:
    """Generate due invoices and issue eligible auto-issue invoices.

    Generation and issuance are separate operations. Delivery is deliberately
    excluded: email, WhatsApp and PDF dispatch remain explicit invoice actions.
    Auto-issue drafts are retried only on their scheduled local calendar date;
    a worker outage never causes a late automatic issue on a subsequent day.
    """
    repository = RecurringInvoiceRepository(db)
    schedule_ids = await repository.get_due_ids(limit=limit)
    generated = skipped = errors = auto_issued = 0
    issued_invoice_ids: set[str] = set()

    async def issue_if_due(invoice: Invoice) -> bool:
        nonlocal errors, auto_issued
        if invoice.status != "draft" or not invoice.recurring_schedule_id:
            return False
        schedule = await db.get(RecurringInvoiceSchedule, invoice.recurring_schedule_id)
        if schedule is None or schedule.issue_mode != "auto_issue":
            return False
        local_date = today or _local_today(schedule.timezone)
        if invoice.recurring_period_start != local_date:
            return False
        workspace = await repository.get_workspace(schedule.workspace_id)
        if workspace is None:
            return False
        try:
            await finalize_invoice(db, workspace, invoice.id)
            issued_invoice_ids.add(invoice.id)
            auto_issued += 1
            return True
        except Exception:
            errors += 1
            logger.exception(
                "Auto-issue failed for recurring invoice %s on its scheduled date",
                invoice.id,
            )
            await db.rollback()
            return False

    for schedule_id in schedule_ids:
        try:
            invoice = await generate_one_due_schedule(db, schedule_id, today=today)
            if invoice is None:
                skipped += 1
                continue
            # Count only a newly created occurrence. An idempotent retry may
            # return an already existing invoice.
            generated += 1
            await issue_if_due(invoice)
        except Exception:
            errors += 1
            logger.exception("Failed processing recurring schedule %s", schedule_id)
            await db.rollback()

    # If generation committed but finalisation failed, the schedule has already
    # advanced. Revisit today's auto-issue drafts in this same-day retry window.
    current_date = today
    if current_date is None:
        # Schedules may have different timezones. The generated pass above
        # already attempts issuance in each schedule's timezone. The fallback
        # scan is therefore limited to dates represented by active auto-issue
        # schedules in this batch to avoid comparing UTC dates incorrectly.
        retry_dates: set[date] = set()
        for schedule_id in schedule_ids:
            schedule = await db.get(RecurringInvoiceSchedule, schedule_id)
            if schedule and schedule.issue_mode == "auto_issue":
                retry_dates.add(_local_today(schedule.timezone))
    else:
        retry_dates = {current_date}

    for retry_date in retry_dates:
        try:
            drafts = await repository.list_auto_issue_drafts_for_date(retry_date)
            for invoice in drafts:
                if invoice.id in issued_invoice_ids:
                    continue
                await issue_if_due(invoice)
        except Exception:
            errors += 1
            logger.exception(
                "Failed scanning same-day recurring auto-issue retries for %s",
                retry_date,
            )
            await db.rollback()

    return {
        "examined": len(schedule_ids),
        "generated": generated,
        "skipped": skipped,
        "auto_issued": auto_issued,
        "errors": errors,
    }
