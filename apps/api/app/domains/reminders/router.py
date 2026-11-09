"""HTTP adapter for reminder settings, history and manual nudges."""
from __future__ import annotations

import secrets
from datetime import date
from urllib.parse import quote

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.money import format_money
from app.domains.auth.dependencies import require_auth
from app.domains.invoices.models import Invoice
from app.domains.lifecycle.service import invoice_balance_minor
from app.domains.reminders.schemas import (
    ReminderJobResponse,
    ReminderProcessResult,
    ReminderSchedule,
    ReminderSettings,
    WhatsAppNudgeResponse,
)
from app.domains.reminders.service import (
    list_invoice_reminders,
    process_due_reminders,
)
from app.domains.workspaces.dependencies import resolve_active_workspace

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get("/settings", response_model=ReminderSettings)
async def get_reminder_settings(
    auth=Depends(require_auth),
):
    """Return the default reminder cadence for the active workspace."""
    _, workspace = auth

    return ReminderSettings(
        workspace_id=workspace.id,
        auto_remind=True,
        schedules=[
            ReminderSchedule(
                days_relative_to_due=-3,
                reminder_type="upcoming_3d",
                channel="email",
                enabled=True,
            ),
            ReminderSchedule(
                days_relative_to_due=0,
                reminder_type="due_today",
                channel="email",
                enabled=True,
            ),
            ReminderSchedule(
                days_relative_to_due=3,
                reminder_type="overdue_3d",
                channel="email",
                enabled=True,
            ),
            ReminderSchedule(
                days_relative_to_due=7,
                reminder_type="overdue_7d",
                channel="email",
                enabled=True,
            ),
        ],
    )


@router.post(
    "/process",
    response_model=ReminderProcessResult,
)
async def trigger_process_reminders(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Internal worker endpoint protected by a constant-time token check."""
    configured_token = settings.INTERNAL_JOB_TOKEN

    if not configured_token or not configured_token.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Reminder processing is not configured.",
        )

    authorization = request.headers.get("Authorization", "")
    supplied_token = (
        authorization.removeprefix("Bearer ").strip()
        if authorization.startswith("Bearer ")
        else ""
    )

    if not supplied_token or not secrets.compare_digest(
        supplied_token,
        configured_token,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid internal service credentials are required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    count = await process_due_reminders(
        db=db,
        limit=limit,
    )

    return ReminderProcessResult(
        processed_count=count,
        message=f"Successfully queued {count} due reminder email(s).",
    )


@router.get(
    "/invoices/{invoice_id}",
    response_model=list[ReminderJobResponse],
)
async def list_invoice_reminders_route(
    invoice_id: str,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """List reminder history for an invoice in the active workspace."""
    _, workspace = auth

    jobs = await list_invoice_reminders(
        invoice_id=invoice_id,
        workspace_id=workspace.id,
        db=db,
    )

    # The repository returns an empty list for an unknown or foreign invoice.
    # Distinguish those cases without exposing cross-workspace existence.
    if not jobs:
        from app.domains.reminders.repository import ReminderRepository

        # This repository method checks invoice ownership.
        exists = await ReminderRepository(db).invoice_belongs_to_workspace(
            invoice_id,
            workspace.id,
        )

        if not exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invoice not found",
            )

    return jobs


@router.get(
    "/invoices/{invoice_id}/nudge/whatsapp",
    response_model=WhatsAppNudgeResponse,
)
async def generate_whatsapp_nudge(
    invoice_id: str,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Generate a pre-composed WhatsApp payment reminder."""
    from app.domains.reminders.repository import ReminderRepository

    _, workspace = auth

    invoice = await ReminderRepository(db).get_invoice_for_workspace(
        invoice_id,
        workspace.id,
    )

    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found",
        )

    client = invoice.client
    client_name = client.name if client else "Client"
    client_phone = client.phone if client else ""

    clean_phone = "".join(
        character
        for character in (client_phone or "")
        if character.isdigit()
    )

    if not clean_phone:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The client does not have a usable phone number.",
        )

    today = date.today()

    if not invoice.due_date:
        raise HTTPException(
            status_code=400,
            detail="Invoice has no due date",
        )

    days_overdue = (
        max(0, (today - invoice.due_date).days)
        if invoice.due_date
        else 0
    )
    is_overdue = days_overdue > 0

    base_url = settings.WEB_BASE_URL.rstrip("/")
    share_url = (
        f"{base_url}/i/{invoice.share_token}"
        if invoice.share_token
        else ""
    )

    if not share_url:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This invoice does not have an active public link.",
        )

    outstanding = invoice_balance_minor(invoice)
    formatted_total = format_money(
        outstanding,
        invoice.currency,
    )

    due_date = (
        invoice.due_date.strftime("%B %d, %Y")
        if invoice.due_date
        else "the agreed date"
    )

    if is_overdue:
        message = (
            f"Hi {client_name}, a polite follow-up on invoice "
            f"{invoice.invoice_number} ({formatted_total}) from "
            f"{workspace.business_name}, which was due on {due_date}. "
            f"You can view and settle it here: {share_url}. "
            "Please let me know if you need any clarification. Thanks!"
        )
    else:
        message = (
            f"Hi {client_name}, a friendly reminder about invoice "
            f"{invoice.invoice_number} ({formatted_total}) from "
            f"{workspace.business_name}, due on {due_date}. "
            f"You can view it here: {share_url}. Thanks!"
        )

    return WhatsAppNudgeResponse(
        whatsapp_url=(
            f"https://wa.me/{clean_phone}?text={quote(message)}"
        ),
        client_name=client_name,
        invoice_number=invoice.invoice_number or invoice.bagg_reference,
        total_formatted=formatted_total,
        due_date=due_date,
        is_overdue=is_overdue,
        days_overdue=days_overdue,
    )
