from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from typing import List, Optional
from datetime import timedelta, date

from app.core.database import get_db
from app.core.errors import NotFoundException, BadRequestException
from app.core.money import calculate_invoice_totals
from app.core.security import generate_share_token
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.clients.models import Client
from app.domains.invoices.models import Invoice, InvoiceLineItem
from app.domains.invoices.schemas import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    LineItemSchema,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def map_invoice_to_response(inv: Invoice, client_name: Optional[str] = None) -> InvoiceResponse:
    items_out = [
        LineItemSchema(
            id=item.id,
            position=item.position,
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
        )
        for item in (inv.items or [])
    ]

    c_name = client_name
    if not c_name and "client" in inv.__dict__ and inv.client:
        c_name = inv.client.name

    return InvoiceResponse(
        id=inv.id,
        workspace_id=inv.workspace_id,
        client_id=inv.client_id,
        client_name=c_name,
        invoice_number=inv.invoice_number,
        sequence_number=inv.sequence_number,
        currency=inv.currency,
        status=inv.status,
        issue_date=inv.issue_date,
        due_date=inv.due_date,
        items=items_out,
        subtotal_minor=inv.subtotal_minor,
        discount_minor=inv.discount_minor,
        tax_rate_percent=inv.tax_rate_percent,
        tax_minor=inv.tax_minor,
        total_minor=inv.total_minor,
        amount_paid_minor=inv.amount_paid_minor,
        payment_profile_id=inv.payment_profile_id,
        notes=inv.notes,
        share_token=inv.share_token,
        version=inv.version,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
    )


@router.get("", response_model=List[InvoiceResponse])
async def list_invoices(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (draft, sent, paid, etc.)"),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all invoices for the workspace with client details and financial totals.
    """
    conditions = [Invoice.workspace_id == workspace.id]
    if client_id:
        conditions.append(Invoice.client_id == client_id)
    if status_filter:
        conditions.append(Invoice.status == status_filter)
    if currency:
        conditions.append(Invoice.currency == currency.upper().strip())

    stmt = (
        select(Invoice, Client.name.label("client_name"))
        .join(Client, Invoice.client_id == Client.id, isouter=True)
        .where(and_(*conditions))
        .order_by(desc(Invoice.sequence_number), desc(Invoice.created_at))
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [map_invoice_to_response(inv, client_name) for inv, client_name in rows]


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    payload: InvoiceCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new draft invoice with sequential unique numbering (US-INV-01)
    and precise minor-unit calculations (US-INV-02).
    """
    # 1. Verify client belongs to this workspace
    client_stmt = select(Client).where(
        and_(Client.id == payload.client_id, Client.workspace_id == workspace.id)
    )
    client_res = await db.execute(client_stmt)
    client = client_res.scalar_one_or_none()
    if not client:
        raise NotFoundException(f"Client '{payload.client_id}' not found in this workspace")

    # 2. Sequential numbering (US-INV-01)
    seq = workspace.next_invoice_number
    invoice_number = f"{workspace.invoice_prefix}{seq:04d}"
    workspace.next_invoice_number = seq + 1

    # 3. Determine due date if not provided
    issue_date = payload.issue_date or date.today()
    due_date = payload.due_date
    if not due_date:
        terms_days = client.default_payment_terms_days or 14
        due_date = issue_date + timedelta(days=terms_days)

    # 4. Financial calculations in minor integer units (US-INV-02)
    raw_items = [
        {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
        for it in payload.items
    ]
    totals = calculate_invoice_totals(
        items=raw_items,
        discount_minor=payload.discount_minor,
        tax_percent=payload.tax_rate_percent,
    )

    # 5. Generate secure share link token
    raw_token, token_hash = generate_share_token()

    # 6. Create invoice record
    invoice = Invoice(
        workspace_id=workspace.id,
        client_id=client.id,
        invoice_number=invoice_number,
        sequence_number=seq,
        currency=payload.currency,
        status="draft",
        issue_date=issue_date,
        due_date=due_date,
        subtotal_minor=totals["subtotal_minor"],
        discount_minor=payload.discount_minor,
        tax_rate_percent=payload.tax_rate_percent,
        tax_minor=totals["tax_minor"],
        total_minor=totals["total_minor"],
        amount_paid_minor=0,
        payment_profile_id=payload.payment_profile_id,
        notes=payload.notes,
        share_token=raw_token,
        share_token_hash=token_hash,
        version=1,
    )
    db.add(invoice)
    await db.flush()

    # 7. Create line items with position and total_minor
    for i, it in enumerate(payload.items):
        item_total = it.quantity * it.unit_price_minor
        line_item = InvoiceLineItem(
            invoice_id=invoice.id,
            position=i,
            description=it.description,
            quantity=it.quantity,
            unit_price_minor=it.unit_price_minor,
            total_minor=item_total,
        )
        db.add(line_item)

    await db.commit()
    await db.refresh(invoice)

    return map_invoice_to_response(invoice, client.name)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves full invoice details including line items, client, and current status.
    """
    stmt = (
        select(Invoice, Client.name.label("client_name"))
        .join(Client, Invoice.client_id == Client.id, isouter=True)
        .where(and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    invoice, client_name = row
    return map_invoice_to_response(invoice, client_name)


@router.patch("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    payload: InvoiceUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Auto-save / update draft invoice (US-INV-03).
    Immutability guarantee: Only 'draft' invoices can be directly modified.
    """
    stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    if invoice.status != "draft":
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number}' is '{invoice.status}' and cannot be directly modified. Sent invoices are immutable."
        )

    # If items provided, replace existing line items and recalculate totals
    if payload.items is not None:
        # Delete existing items
        del_stmt = select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id)
        existing_items = (await db.execute(del_stmt)).scalars().all()
        for item in existing_items:
            await db.delete(item)

        discount = payload.discount_minor if payload.discount_minor is not None else invoice.discount_minor
        tax_rate = payload.tax_rate_percent if payload.tax_rate_percent is not None else invoice.tax_rate_percent

        raw_items = [
            {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
            for it in payload.items
        ]
        totals = calculate_invoice_totals(
            items=raw_items,
            discount_minor=discount,
            tax_percent=tax_rate,
        )

        invoice.subtotal_minor = totals["subtotal_minor"]
        invoice.discount_minor = discount
        invoice.tax_rate_percent = tax_rate
        invoice.tax_minor = totals["tax_minor"]
        invoice.total_minor = totals["total_minor"]

        for i, it in enumerate(payload.items):
            item_total = it.quantity * it.unit_price_minor
            line_item = InvoiceLineItem(
                invoice_id=invoice.id,
                position=i,
                description=it.description,
                quantity=it.quantity,
                unit_price_minor=it.unit_price_minor,
                total_minor=item_total,
            )
            db.add(line_item)

    if payload.client_id:
        invoice.client_id = payload.client_id
    if payload.issue_date:
        invoice.issue_date = payload.issue_date
    if payload.due_date:
        invoice.due_date = payload.due_date
    if payload.notes is not None:
        invoice.notes = payload.notes
    if payload.payment_profile_id is not None:
        invoice.payment_profile_id = payload.payment_profile_id

    await db.commit()
    await db.refresh(invoice)

    return map_invoice_to_response(invoice)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Deletes a draft invoice. Sent invoices cannot be deleted (must be cancelled).
    """
    stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    if invoice.status != "draft":
        raise BadRequestException(f"Cannot delete an invoice that has been sent or finalized.")

    await db.delete(invoice)
    await db.commit()
    return None
