from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.dependencies import get_current_user_and_workspace
from app.domains.recurring_invoices import service
from app.domains.recurring_invoices.schemas import (
    RecurringOccurrenceResponse,
    RecurringScheduleCreate,
    RecurringScheduleResponse,
    RecurringScheduleUpdate,
    ResumeScheduleRequest,
)
from app.domains.workspaces.models import Workspace

router = APIRouter(
    prefix="/recurring-invoices",
    tags=["Recurring Invoices"],
)


@router.post(
    "",
    response_model=RecurringScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_schedule(
    payload: RecurringScheduleCreate,
    auth=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth
    return await service.create_schedule(
        db,
        workspace,
        payload,
        user_id=user.id,
    )


@router.get(
    "",
    response_model=list[RecurringScheduleResponse],
)
async def list_schedules(
    schedule_status: str | None = Query(
        default=None,
        alias="status",
        pattern="^(active|paused|cancelled|completed)$",
    ),
    client_id: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    auth=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    _, workspace = auth
    schedules, total = await service.list_schedules(
        db,
        workspace,
        client_id=client_id,
        schedule_status=schedule_status,
        limit=limit,
        offset=offset,
    )
    return schedules


@router.get(
    "/{schedule_id}",
    response_model=RecurringScheduleResponse,
)
async def get_schedule(
    schedule_id: str,
    auth=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    _, workspace = auth
    return await service.get_schedule(db, workspace, schedule_id)


@router.patch(
    "/{schedule_id}",
    response_model=RecurringScheduleResponse,
)
async def update_schedule(
    schedule_id: str,
    payload: RecurringScheduleUpdate,
    auth=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    _, workspace = auth
    return await service.update_schedule(
        db,
        workspace,
        schedule_id,
        payload,
    )


@router.post(
    "/{schedule_id}/pause",
    response_model=RecurringScheduleResponse,
)
async def pause_schedule(
    schedule_id: str,
    auth=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    _, workspace = auth
    return await service.pause_schedule(
        db,
        workspace,
        schedule_id,
    )


@router.post(
    "/{schedule_id}/resume",
    response_model=RecurringScheduleResponse,
)
async def resume_schedule(
    schedule_id: str,
    payload: ResumeScheduleRequest,
    auth=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    _, workspace = auth
    return await service.resume_schedule(
        db,
        workspace,
        schedule_id,
        payload.missed_period_policy,
    )


@router.post(
    "/{schedule_id}/cancel",
    response_model=RecurringScheduleResponse,
)
async def cancel_schedule(
    schedule_id: str,
    auth=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    _, workspace = auth
    return await service.cancel_schedule(
        db,
        workspace,
        schedule_id,
    )


@router.get(
    "/{schedule_id}/invoices",
    response_model=list[RecurringOccurrenceResponse],
)
@router.get(
    "/{schedule_id}/occurrences",
    response_model=list[RecurringOccurrenceResponse],
    include_in_schema=False,
)
async def list_occurrences(
    schedule_id: str,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    auth=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    _, workspace = auth
    invoices, total = await service.list_generated_invoices(
        db,
        workspace,
        schedule_id,
        limit=limit,
        offset=offset,
    )

    items = [
        {
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "invoice_status": invoice.status,
            "period_key": invoice.recurring_period_key,
            "period_start": invoice.recurring_period_start,
            "period_end": invoice.recurring_period_end,
            "recurring_label": invoice.recurring_label,
            "due_date": invoice.due_date,
            "total_minor": invoice.total_minor,
            "currency": invoice.currency,
            "created_at": invoice.created_at,
        }
        for invoice in invoices
    ]

    return items
