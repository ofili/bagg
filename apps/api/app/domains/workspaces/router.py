from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.errors import NotFoundException
from app.domains.workspaces.schemas import (
    WorkspaceResponse,
    WorkspaceUpdate,
    WorkspaceOnboardingRequest,
)
from app.domains.workspaces.models import Workspace
from app.domains.auth.router import get_current_user_and_workspace

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


async def resolve_active_workspace(
    auth_data = Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db)
) -> Workspace:
    """Dependency to retrieve the authenticated user's active workspace with fallback for dev."""
    if auth_data:
        _, workspace = auth_data
        return workspace

    stmt = select(Workspace).limit(1)
    res = await db.execute(stmt)
    ws = res.scalars().first()
    if ws:
        return ws

    ws = Workspace(
        id="ws_demo_01",
        owner_id="usr_demo_01",
        name="Studio Bagg",
        business_name="Studio Bagg Creative Ltd",
        country="NG",
        default_currency="NGN"
    )
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    return ws


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
    """Save the initial business profile and mark onboarding complete."""

    # Never complete onboarding against the demo or an arbitrary workspace.
    if not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please sign in to complete onboarding.",
        )

    _, ws = auth_data

    business_name = payload.business_name.strip()
    country = payload.country.strip().upper()
    currency = payload.default_currency.strip().upper()
    address = payload.address.strip() if payload.address else None

    if not business_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Business name is required.",
        )

    ws.business_name = business_name
    ws.country = country
    ws.default_currency = currency
    ws.address = address
    ws.onboarding_completed = True

    await db.commit()
    await db.refresh(ws)

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
        onboarding_completed=ws.onboarding_completed,
        next_invoice_number=ws.next_invoice_number,
        next_quote_number=ws.next_quote_number,
        next_receipt_number=ws.next_receipt_number,
    )


@router.get("/current", response_model=WorkspaceResponse)
async def get_current_workspace(
    auth_data = Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db)
):
    """Returns the freelancer's active business workspace."""
    if auth_data:
        _, workspace = auth_data
        return WorkspaceResponse(
            id=workspace.id,
            owner_id=workspace.owner_id,
            name=workspace.name,
            business_name=workspace.business_name,
            logo_url=workspace.logo_url,
            brand_color=workspace.brand_color,
            country=workspace.country,
            default_currency=workspace.default_currency,
            tax_id=workspace.tax_id,
            address=workspace.address,
            invoice_prefix=workspace.invoice_prefix,
        )

    # Fallback to first existing workspace or demo
    stmt = select(Workspace).limit(1)
    res = await db.execute(stmt)
    ws = res.scalars().first()
    if ws:
        return WorkspaceResponse(
            id=ws.id,
            owner_id=ws.owner_id,
            name=ws.name,
            business_name=ws.business_name,
            logo_url=ws.logo_url,
            brand_color=ws.brand_color,
            country=ws.country,
            default_currency=ws.default_currency,
            tax_id=ws.tax_id,
            address=ws.address,
            invoice_prefix=ws.invoice_prefix,
        )

    return WorkspaceResponse(
        id="ws_demo_01",
        owner_id="usr_demo_01",
        name="Studio Bagg",
        business_name="Studio Bagg Creative Ltd",
        logo_url=None,
        brand_color="#10B981",
        default_currency="NGN",
        country="NG",
        tax_id="TIN-98765432-0001",
        address="12 Adeola Odeku St, Victoria Island, Lagos",
        invoice_prefix="INV-",
    )


@router.patch("/current", response_model=WorkspaceResponse)
async def update_current_workspace(
    payload: WorkspaceUpdate,
    auth_data = Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates workspace branding, logo, default currency, TIN, and address (US-ONB-02).
    Immutability guarantee: Drafts will reflect these changes, but already-sent invoices
    remain locked to their historical revision snapshot.
    """
    ws = None
    if auth_data:
        _, ws = auth_data
    else:
        stmt = select(Workspace).limit(1)
        res = await db.execute(stmt)
        ws = res.scalars().first()

    if not ws:
        raise NotFoundException("Workspace not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if value is not None:
            setattr(ws, field, value)

    await db.commit()
    await db.refresh(ws)

    return WorkspaceResponse(
        id=ws.id,
        owner_id=ws.owner_id,
        name=ws.name,
        business_name=ws.business_name,
        logo_url=ws.logo_url,
        brand_color=ws.brand_color,
        country=ws.country,
        default_currency=ws.default_currency,
        tax_id=ws.tax_id,
        address=ws.address,
        invoice_prefix=ws.invoice_prefix,
    )
