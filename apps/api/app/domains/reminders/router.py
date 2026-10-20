from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import date, timezone
from urllib.parse import quote
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.money import format_money
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.invoices.models import Invoice
from app.domains.reminders.models import ReminderJob
from app.domains.reminders.schemas import (
    ReminderSettings,
    ReminderSchedule,
    ReminderJobResponse,
    WhatsAppNudgeResponse,
    ReminderProcessResult,
)
from app.domains.reminders.service import process_due_reminders

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get("/settings", response_model=ReminderSettings)
async def get_reminder_settings(
    workspace: Workspace = Depends(resolve_active_workspace),
):
    """Returns workspace default reminder schedule (US-REM-01)."""
    return ReminderSettings(
        workspace_id=workspace.id,
        auto_remind=True,
        schedules=[
            ReminderSchedule(days_relative_to_due=-3, reminder_type="upcoming_3d", channel="email", enabled=True),
            ReminderSchedule(days_relative_to_due=0, reminder_type="due_today", channel="email", enabled=True),
            ReminderSchedule(days_relative_to_due=3, reminder_type="overdue_3d", channel="email", enabled=True),
            ReminderSchedule(days_relative_to_due=7, reminder_type="overdue_7d", channel="email", enabled=True),
        ],
    )


@router.post("/process", response_model=ReminderProcessResult)
async def trigger_process_reminders(
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers reliable job claiming via PostgreSQL SKIP LOCKED (US-REM-03).
    Can be invoked by cron runners, background queue workers, or manual triggers.
    """
    count = await process_due_reminders(db=db, limit=limit)
    return ReminderProcessResult(
        processed_count=count,
        message=f"Successfully processed {count} due reminder job(s).",
    )


@router.get("/invoices/{invoice_id}", response_model=List[ReminderJobResponse])
async def list_invoice_reminders(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Lists scheduled reminder jobs and audit history for an invoice (US-REM-01)."""
    inv_stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    inv = (await db.execute(inv_stmt)).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    job_stmt = (
        select(ReminderJob)
        .where(ReminderJob.invoice_id == invoice_id)
        .order_by(ReminderJob.due_at.asc())
    )
    jobs = (await db.execute(job_stmt)).scalars().all()
    return jobs


@router.get("/invoices/{invoice_id}/nudge/whatsapp", response_model=WhatsAppNudgeResponse)
async def generate_whatsapp_nudge(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    1-Tap WhatsApp Nudge for Freelancer (US-REM-02).
    Generates a pre-composed WhatsApp intent for overdue or unpaid invoices.
    """
    inv_stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    inv = (await db.execute(inv_stmt)).scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    client_name = inv.client.name if inv.client else "Client"
    client_phone = inv.client.phone if inv.client else ""
    clean_phone = (client_phone or "").replace("+", "").replace(" ", "").replace("-", "")

    today = date.today()
    days_overdue = (today - inv.due_date).days
    is_overdue = days_overdue > 0

    share_url = f"http://localhost:3000/i/{inv.share_token}" if inv.share_token else ""
    formatted_total = format_money(inv.total_minor, inv.currency)
    formatted_due_date = inv.due_date.strftime("%B %d, %Y")

    if is_overdue:
        message = (
            f"Hi {client_name}, polite follow-up on invoice {inv.invoice_number} ({formatted_total}) "
            f"from {workspace.business_name} which was due on {formatted_due_date}. "
            f"You can view and settle it here: {share_url}. Let me know if you need any clarification. Thanks!"
        )
    else:
        message = (
            f"Hi {client_name}, friendly reminder regarding invoice {inv.invoice_number} ({formatted_total}) "
            f"from {workspace.business_name}, due on {formatted_due_date}. "
            f"Link: {share_url}. Thanks!"
        )

    wa_url = f"https://wa.me/{clean_phone}?text={quote(message)}"

    return WhatsAppNudgeResponse(
        whatsapp_url=wa_url,
        client_name=client_name,
        invoice_number=inv.invoice_number,
        total_formatted=formatted_total,
        due_date=formatted_due_date,
        is_overdue=is_overdue,
        days_overdue=max(0, days_overdue),
    )
