from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import NotFoundException
from app.domains.engagements import service as engagement_service
from app.domains.engagements.repository import EngagementRepository, ScopeChangeRepository
from app.domains.engagements.schemas import (
    EngagementCreate,
    EngagementMarginResponse,
    EngagementResponse,
    ScopeChangeAcceptRequest,
    ScopeChangeCreateRequest,
    ScopeChangeDeclineRequest,
    ScopeChangeResponse,
)
from app.domains.workspaces.dependencies import resolve_active_workspace
from app.domains.workspaces.models import Workspace

router = APIRouter(prefix="/engagements", tags=["engagements"])


@router.get("", response_model=List[EngagementResponse])
async def list_engagements(
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    return await EngagementRepository(db).list_by_workspace(workspace.id)


@router.post("", response_model=EngagementResponse, status_code=status.HTTP_201_CREATED)
async def create_engagement(
    payload: EngagementCreate,
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    return await engagement_service.create_manual_engagement(db, workspace, payload)


@router.get("/{engagement_id}", response_model=EngagementResponse)
async def get_engagement(
    engagement_id: str,
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    engagement = await EngagementRepository(db).get_by_id(workspace.id, engagement_id)
    if not engagement:
        raise NotFoundException(f"Engagement '{engagement_id}' not found.")
    return engagement


@router.get("/{engagement_id}/margin", response_model=EngagementMarginResponse)
async def get_engagement_margin(
    engagement_id: str,
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    return await engagement_service.get_engagement_margin(db, workspace, engagement_id)


@router.get("/{engagement_id}/scope-changes", response_model=List[ScopeChangeResponse])
async def list_scope_changes(
    engagement_id: str,
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    return await ScopeChangeRepository(db).list_by_engagement(workspace.id, engagement_id)


@router.post(
    "/{engagement_id}/scope-changes",
    response_model=ScopeChangeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_scope_change(
    engagement_id: str,
    payload: ScopeChangeCreateRequest,
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    change, approval_token, email_queued = (
        await engagement_service.create_scope_change_request(
            db, workspace, engagement_id, payload
        )
    )
    return engagement_service.map_scope_change_to_response(
        change,
        approval_token=approval_token,
        approval_email_queued=email_queued,
    )


@router.post(
    "/scope-changes/{change_request_id}/approval-link/regenerate",
    response_model=ScopeChangeResponse,
)
async def regenerate_scope_change_approval_link(
    change_request_id: str,
    send_email: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    change, approval_token, email_queued = (
        await engagement_service.regenerate_scope_change_approval_link(
            db, workspace, change_request_id, send_email=send_email
        )
    )
    return engagement_service.map_scope_change_to_response(
        change,
        approval_token=approval_token,
        approval_email_queued=email_queued,
    )


@router.get("/scope-changes/public/{token}", response_model=ScopeChangeResponse)
async def get_public_scope_change(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    change = await ScopeChangeRepository(db).get_by_approval_token(token)
    if not change:
        raise NotFoundException("Scope change request not found or invalid link.")
    return change


@router.post("/scope-changes/public/{token}/accept", response_model=ScopeChangeResponse)
async def accept_public_scope_change(
    token: str,
    payload: ScopeChangeAcceptRequest,
    db: AsyncSession = Depends(get_db),
):
    return await engagement_service.accept_public_scope_change(db, token, payload)


@router.post("/scope-changes/public/{token}/decline", response_model=ScopeChangeResponse)
async def decline_public_scope_change(
    token: str,
    payload: ScopeChangeDeclineRequest,
    db: AsyncSession = Depends(get_db),
):
    return await engagement_service.decline_public_scope_change(db, token, payload)
