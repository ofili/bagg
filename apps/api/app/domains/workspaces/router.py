from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import NotFoundException

from app.domains.workspaces.schemas import (
    WorkspaceResponse,
    WorkspaceUpdate,
    WorkspaceOnboardingRequest,
)
from app.domains.workspaces.models import Workspace
from app.domains.auth.dependencies import get_current_user_and_workspace

from app.domains.onboarding.service import OnboardingService


router = APIRouter(
    prefix="/workspaces",
    tags=["Workspaces"],
)


def build_workspace_response(ws: Workspace) -> WorkspaceResponse:

    return WorkspaceResponse(
        id=ws.id,
        owner_id=ws.owner_id,
        name=ws.name,
        business_name=ws.business_name,
        brand_color=ws.brand_color,
        country=ws.country,
        default_currency=ws.default_currency,
        tax_id=ws.tax_id,
        address=ws.address,
        logo_url=ws.logo_url,
        invoice_prefix=ws.invoice_prefix,
        quote_prefix=ws.quote_prefix,
        receipt_prefix=ws.receipt_prefix,
        onboarding_completed=ws.onboarding_completed,
        next_invoice_number=ws.next_invoice_number,
        next_quote_number=ws.next_quote_number,
        next_receipt_number=ws.next_receipt_number,
    )


@router.post(
    "/current/complete-onboarding",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_200_OK,
)
async def complete_current_workspace_onboarding(
        payload: WorkspaceOnboardingRequest,
        auth_data=Depends(get_current_user_and_workspace),
        db: AsyncSession = Depends(get_db),
):
    """Legacy-compatible endpoint backed by the onboarding domain."""

    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in to complete onboarding.",
        )

    _, workspace = auth_data

    try:
        await OnboardingService(db).complete_business_profile(
            workspace=workspace,
            payload=payload,
        )

        await db.commit()
        await db.refresh(workspace)

    except ValueError as exc:
        await db.rollback()

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    except Exception:
        await db.rollback()
        raise

    return build_workspace_response(workspace)


@router.get(
    "/current",
    response_model=WorkspaceResponse,
)
async def get_current_workspace(
        auth_data=Depends(get_current_user_and_workspace),
):
    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )

    _, workspace = auth_data

    return build_workspace_response(workspace)


@router.patch(
    "/current",
    response_model=WorkspaceResponse,
)
async def update_current_workspace(
        payload: WorkspaceUpdate,
        auth_data=Depends(get_current_user_and_workspace),
        db: AsyncSession = Depends(get_db),
):
    """
    Update workspace branding and business information.

    Existing document revision snapshots remain immutable.
    """

    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )

    _, workspace = auth_data

    if not workspace:
        raise NotFoundException("Workspace not found")

    update_dict = payload.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        if value is not None:
            setattr(workspace, field, value)

    await db.commit()
    await db.refresh(workspace)

    return build_workspace_response(workspace)