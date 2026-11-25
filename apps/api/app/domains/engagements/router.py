from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import NotFoundException
from app.domains.engagements import service as engagement_service
from app.domains.engagements.repository import EngagementRepository, ScopeChangeRepository
from app.domains.engagements.schemas import (
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
    return await engagement_service.create_scope_change_request(
        db, workspace, engagement_id, payload
    )


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
