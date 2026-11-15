from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.activation.schemas import (
    ActivationResponse,
    ClientEventCreate,
    ClientEventResponse,
)
from app.domains.activation.service import (
    get_activation,
    ingest_client_event,
)
from app.domains.workspaces.dependencies import resolve_active_workspace
from app.domains.workspaces.models import Workspace

activation_router = APIRouter(
    prefix="/activation",
    tags=["Activation"],
)

analytics_router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@activation_router.get(
    "",
    response_model=ActivationResponse,
)
async def get_workspace_activation(
    response: Response,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"

    return await get_activation(db, workspace)


@analytics_router.post(
    "/events",
    response_model=ClientEventResponse,
)
async def create_client_event(
    payload: ClientEventCreate,
    response: Response,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"

    inserted = await ingest_client_event(
        db,
        workspace,
        event_id=payload.event_id,
        event_name=payload.event_name,
        event_version=payload.event_version,
        properties=payload.properties,
        occurred_at=payload.occurred_at,
    )

    await db.commit()

    return ClientEventResponse(
        accepted=True,
        duplicate=not inserted,
    )
