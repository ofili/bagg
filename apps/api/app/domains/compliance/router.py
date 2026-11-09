"""HTTP endpoints for compliance and data portability."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.dependencies import require_auth
from app.domains.compliance.schemas import (
    AccountDeletionRequest,
    AccountDeletionResponse,
)
from app.domains.compliance.service import ComplianceService
from app.domains.workspaces.dependencies import resolve_active_workspace

router = APIRouter(prefix="/compliance", tags=["Compliance"])


@router.get("/export/csv")
async def export_data_csv(
    auth_data=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    _user, workspace = auth_data

    content, filename = await ComplianceService(db).export_csv(workspace.id)

    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/export/zip")
async def export_data_zip(
    auth_data=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    _user, workspace = auth_data

    content, filename = await ComplianceService(db).export_zip(workspace.id)

    return StreamingResponse(
        iter([content]),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post(
    "/delete-account",
    response_model=AccountDeletionResponse,
)
async def delete_account(
    payload: AccountDeletionRequest,
    auth_data=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth_data

    completed_at = await ComplianceService(db).delete_account(
        user=user,
        workspace=workspace,
        challenge_id=payload.challenge_id,
        confirmation_phrase=payload.confirmation_phrase,
    )

    return AccountDeletionResponse(
        status="deactivated",
        message=(
            "Your account has been deactivated. Active sessions and "
            "authentication credentials have been revoked, and your "
            "account profile has been anonymised. Financial documents, "
            "payment records and relevant audit history have been retained."
        ),
        data_purge_scheduled_at=completed_at,
    )
