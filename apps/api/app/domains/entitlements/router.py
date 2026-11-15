from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.entitlements.schemas import EntitlementsResponse
from app.domains.entitlements.service import get_workspace_entitlements
from app.domains.workspaces.dependencies import resolve_active_workspace
from app.domains.workspaces.models import Workspace

router = APIRouter(
    prefix="/entitlements",
    tags=["Entitlements"],
)


@router.get(
    "",
    response_model=EntitlementsResponse,
)
async def get_entitlements(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    return await get_workspace_entitlements(
        db=db,
        workspace=workspace,
    )
