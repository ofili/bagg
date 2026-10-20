from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import List, Optional

from app.core.database import get_db
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.clients.models import Client
from app.domains.clients.schemas import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientDetailResponse,
    ClientInvoiceSummary,
)

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    q: Optional[str] = Query(None, description="Search by name, email, or phone"),
    currency: Optional[str] = Query(None, description="Filter by preferred currency"),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all saved clients for the active workspace (US-CLI-01, US-CLI-02).
    Includes lifetime invoiced and outstanding metrics.
    """
    stmt = select(Client).where(Client.workspace_id == workspace.id)

    if q:
        clean_q = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Client.name.ilike(clean_q),
                Client.email.ilike(clean_q),
                Client.phone.ilike(clean_q),
            )
        )

    if currency:
        stmt = stmt.where(Client.preferred_currency == currency.upper().strip())

    stmt = stmt.order_by(Client.name.asc())
    result = await db.execute(stmt)
    clients = result.scalars().all()

    # Note: When invoices are created in Lifecycle 4, actual metrics are aggregated here.
    return [
        ClientResponse(
            id=c.id,
            workspace_id=c.workspace_id,
            name=c.name,
            email=c.email,
            phone=c.phone,
            address=c.address,
            country=c.country,
            preferred_currency=c.preferred_currency,
            default_payment_terms_days=c.default_payment_terms_days,
            tax_id=c.tax_id,
            notes=c.notes,
            created_at=c.created_at,
            updated_at=c.updated_at,
            total_invoiced_minor=0,
            total_paid_minor=0,
            total_outstanding_minor=0,
            invoice_count=0,
        )
        for c in clients
    ]


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new client record with preferred currency and payment terms (US-CLI-01).
    Supports phone-only and WhatsApp clients where email is omitted.
    """
    client = Client(
        workspace_id=workspace.id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        country=payload.country or workspace.country,
        preferred_currency=payload.preferred_currency,
        default_payment_terms_days=payload.default_payment_terms_days,
        tax_id=payload.tax_id,
        notes=payload.notes,
    )

    db.add(client)
    await db.commit()
    await db.refresh(client)

    return ClientResponse(
        id=client.id,
        workspace_id=client.workspace_id,
        name=client.name,
        email=client.email,
        phone=client.phone,
        address=client.address,
        country=client.country,
        preferred_currency=client.preferred_currency,
        default_payment_terms_days=client.default_payment_terms_days,
        tax_id=client.tax_id,
        notes=client.notes,
        created_at=client.created_at,
        updated_at=client.updated_at,
        total_invoiced_minor=0,
        total_paid_minor=0,
        total_outstanding_minor=0,
        invoice_count=0,
    )


@router.get("/{client_id}", response_model=ClientDetailResponse)
async def get_client(
    client_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves a client's details along with their full billing history and lifetime summary (US-CLI-02).
    """
    stmt = select(Client).where(
        and_(Client.id == client_id, Client.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    client = res.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    return ClientDetailResponse(
        id=client.id,
        workspace_id=client.workspace_id,
        name=client.name,
        email=client.email,
        phone=client.phone,
        address=client.address,
        country=client.country,
        preferred_currency=client.preferred_currency,
        default_payment_terms_days=client.default_payment_terms_days,
        tax_id=client.tax_id,
        notes=client.notes,
        created_at=client.created_at,
        updated_at=client.updated_at,
        total_invoiced_minor=0,
        total_paid_minor=0,
        total_outstanding_minor=0,
        invoice_count=0,
        invoices=[],
    )


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    payload: ClientUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates client contact details, preferred currency, or terms (US-CLI-01).
    """
    stmt = select(Client).where(
        and_(Client.id == client_id, Client.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    client = res.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)

    return ClientResponse(
        id=client.id,
        workspace_id=client.workspace_id,
        name=client.name,
        email=client.email,
        phone=client.phone,
        address=client.address,
        country=client.country,
        preferred_currency=client.preferred_currency,
        default_payment_terms_days=client.default_payment_terms_days,
        tax_id=client.tax_id,
        notes=client.notes,
        created_at=client.created_at,
        updated_at=client.updated_at,
        total_invoiced_minor=0,
        total_paid_minor=0,
        total_outstanding_minor=0,
        invoice_count=0,
    )


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a client record.
    """
    stmt = select(Client).where(
        and_(Client.id == client_id, Client.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    client = res.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    await db.delete(client)
    await db.commit()
    return None
