from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.router import get_current_user_and_workspace
from app.domains.notifications.schemas import NotificationResponse, UnreadCountResponse
from app.domains.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def require_auth(
    auth_data=Depends(get_current_user_and_workspace),
):
    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )
    return auth_data


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(False, description="Filter for unread notifications only"),
    limit: int = Query(30, ge=1, le=100, description="Max notifications to return"),
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth
    notifications = await NotificationService.list_notifications(
        db,
        user_id=user.id,
        workspace_id=workspace.id,
        unread_only=unread_only,
        limit=limit,
    )
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth
    count = await NotificationService.get_unread_count(
        db,
        user_id=user.id,
        workspace_id=workspace.id,
    )
    return UnreadCountResponse(unread_count=count)


@router.patch("/{id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    id: str,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    user, _ = auth
    notification = await NotificationService.mark_as_read(
        db,
        notification_id=id,
        user_id=user.id,
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return NotificationResponse.model_validate(notification)


@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    user, workspace = auth
    updated_count = await NotificationService.mark_all_as_read(
        db,
        user_id=user.id,
        workspace_id=workspace.id,
    )
    return {"message": "All notifications marked as read", "updated_count": updated_count}
