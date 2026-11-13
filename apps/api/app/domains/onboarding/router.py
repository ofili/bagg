from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.onboarding.schemas import (
    BusinessProfileUpdate,
    OnboardingProgressResponse,
)
from app.domains.onboarding.service import OnboardingService
from app.domains.workspaces.dependencies import resolve_active_workspace
from app.domains.workspaces.models import Workspace


router = APIRouter(
    prefix="/onboarding",
    tags=["Onboarding"],
)


@router.get(
    "",
    response_model=OnboardingProgressResponse,
)
async def get_onboarding_progress(
        response: Response,
        workspace: Workspace = Depends(resolve_active_workspace),
        db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"

    service = OnboardingService(db)

    result = await service.get_progress(workspace)

    # GET may initialize a missing progress record.
    await db.commit()

    return result


@router.post(
    "/resume",
    response_model=OnboardingProgressResponse,
)
async def resume_onboarding(
        response: Response,
        workspace: Workspace = Depends(resolve_active_workspace),
        db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"

    service = OnboardingService(db)

    result = await service.resume(workspace)

    await db.commit()

    return result


@router.patch(
    "/business-profile",
    response_model=OnboardingProgressResponse,
)
async def complete_business_profile(
        payload: BusinessProfileUpdate,
        response: Response,
        workspace: Workspace = Depends(resolve_active_workspace),
        db: AsyncSession = Depends(get_db),
):
    response.headers["Cache-Control"] = "no-store"

    service = OnboardingService(db)

    try:
        result = await service.complete_business_profile(
            workspace=workspace,
            payload=payload,
        )

        await db.commit()

        return result

    except ValueError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    except Exception:
        await db.rollback()
        raise