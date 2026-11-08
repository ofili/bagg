from __future__ import annotations
from datetime import date
from typing import Optional
from urllib.parse import quote
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.core.pagination import PaginatedResponse
from app.core.errors import BadRequestException
from app.core.money import format_money
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.auth.router import get_current_user_and_workspace
from app.domains.receipts.models import Receipt
from app.domains.receipts.repository import ReceiptRepository
from app.domains.receipts.service import record_manual_payment
from app.domains.receipts.queries import (
    list_receipts,
    get_receipt,
    get_public_receipt,
    get_statement,
)
from app.domains.documents.service import render_receipt_html
from app.domains.receipts.schemas import (
    ReceiptCreate,
    ReceiptResponse,
    PublicReceiptView,
    ClientStatementResponse,
)

router = APIRouter(prefix="/receipts", tags=["Receipts"])


def generate_receipt_whatsapp_url(
    phone: Optional[str],
    client_name: str,
    receipt_number: str,
    amount_formatted: str,
    business_name: str,
    share_url: str,
) -> str:
    clean = (phone or "").replace("+", "").replace(" ", "").replace("-", "")
    message = f"Hi {client_name}, here is your official payment receipt {receipt_number} for {amount_formatted} from {business_name}: {share_url}. Thank you for your payment!"
    return f"https://wa.me/{clean}?text={quote(message)}" if clean else ""


def map_receipt_to_response(
    rcp: Receipt,
    client_name: Optional[str] = None,
    client_phone: Optional[str] = None,
    business_name: str = "Studio Bagg",
    base_url: str = settings.WEB_BASE_URL,
    invoice_number: str = "INV",
) -> ReceiptResponse:
    if "client" in rcp.__dict__ and rcp.client:
        client_name = client_name or rcp.client.name
        client_phone = client_phone or rcp.client.phone
    if invoice_number == "INV" and "invoice" in rcp.__dict__ and rcp.invoice:
        invoice_number = rcp.invoice.invoice_number
    share_url = f"{base_url}/r/{rcp.share_token}" if rcp.share_token else None
    wa = (
        generate_receipt_whatsapp_url(
            client_phone,
            client_name or "Client",
            rcp.receipt_number,
            format_money(rcp.amount_paid_minor, rcp.currency),
            business_name,
            share_url,
        )
        if share_url and client_phone
        else None
    )
    return ReceiptResponse(
        id=rcp.id,
        bagg_reference=rcp.bagg_reference,
        workspace_id=rcp.workspace_id,
        client_id=rcp.client_id,
        client_name=client_name,
        invoice_id=rcp.invoice_id,
        invoice_number=invoice_number,
        payment_claim_id=rcp.payment_claim_id,
        receipt_number=rcp.receipt_number,
        sequence_number=rcp.sequence_number,
        currency=rcp.currency,
        amount_paid_minor=rcp.amount_paid_minor,
        balance_remaining_minor=rcp.balance_remaining_minor,
        payment_date=rcp.payment_date,
        payment_method=rcp.payment_method,
        reference=rcp.reference,
        payer_name=rcp.payer_name,
        notes=rcp.notes,
        is_verified=rcp.is_verified,
        verified_at=rcp.verified_at,
        verification_code=rcp.verification_code,
        confirmation_source=rcp.confirmation_source,
        confirmed_by_user_id=rcp.confirmed_by_user_id,
        provider=rcp.provider,
        provider_reference=rcp.provider_reference,
        share_token=rcp.share_token,
        share_url=share_url,
        whatsapp_share_url=wa,
        created_at=rcp.created_at,
        updated_at=rcp.updated_at,
    )


@router.get("", response_model=PaginatedResponse[ReceiptResponse])
async def list_receipts_endpoint(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    client_id: Optional[str] = None,
    invoice_id: Optional[str] = None,
    currency: Optional[str] = None,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    rows, total = await list_receipts(
        db,
        workspace.id,
        page=page,
        per_page=per_page,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        client_id=client_id,
        invoice_id=invoice_id,
        currency=currency,
    )
    items = [
        map_receipt_to_response(
            row[0], row[1], row[2], workspace.business_name, invoice_number=row[3]
        )
        for row in rows
    ]
    return PaginatedResponse(items=items, total=total, page=page, per_page=per_page)


@router.post(
    "/invoice/{invoice_id}",
    response_model=ReceiptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def record_payment_receipt(
    invoice_id: str,
    payload: ReceiptCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    auth_data=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    if not payload.confirm_received:
        raise BadRequestException(
            "Explicit confirmation is required before a payment can be recorded"
        )
    row = await ReceiptRepository(db).get_invoice_for_workspace(
        workspace.id, invoice_id
    )
    if row is None:
        from app.core.errors import NotFoundException

        raise NotFoundException(f"Invoice '{invoice_id}' not found")
    invoice, client = row
    receipt = await record_manual_payment(
        db=db,
        workspace=workspace,
        invoice=invoice,
        amount_paid_minor=payload.amount_paid_minor,
        payment_method=payload.payment_method,
        reference=payload.reference,
        payer_name=payload.payer_name or client.name,
        payment_date=payload.payment_date,
        notes=payload.notes,
        confirmed_by_user_id=auth_data[0].id if auth_data else workspace.owner_id,
    )
    return map_receipt_to_response(
        receipt,
        client.name,
        client.phone,
        workspace.business_name,
        invoice_number=invoice.invoice_number,
    )


@router.get("/share/{token}", response_model=PublicReceiptView)
async def get_public_receipt_endpoint(token: str, db: AsyncSession = Depends(get_db)):
    rcp, client_name, workspace, invoice_number = await get_public_receipt(db, token)
    return PublicReceiptView(
        id=rcp.id,
        receipt_number=rcp.receipt_number,
        invoice_number=invoice_number,
        currency=rcp.currency,
        amount_paid_minor=rcp.amount_paid_minor,
        balance_remaining_minor=rcp.balance_remaining_minor,
        payment_date=rcp.payment_date,
        payment_method=rcp.payment_method,
        reference=rcp.reference,
        payer_name=rcp.payer_name or client_name,
        is_verified=rcp.is_verified,
        verified_at=rcp.verified_at,
        verification_code=rcp.verification_code,
        confirmation_source=rcp.confirmation_source,
        provider=rcp.provider,
        notes=rcp.notes,
        business_name=workspace.business_name,
        business_logo_url=workspace.logo_url,
        business_brand_color=workspace.brand_color,
        client_name=client_name,
        show_badge=workspace.tier == "free",
    )


@router.get("/statement/{client_id}", response_model=ClientStatementResponse)
async def get_client_statement(
    client_id: str,
    currency: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    if date_from and date_to and date_from > date_to:
        raise BadRequestException("date_from must be on or before date_to")
    return await get_statement(db, workspace, client_id, currency, date_from, date_to)


@router.get("/{receipt_id}", response_model=ReceiptResponse)
async def get_receipt_endpoint(
    receipt_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    row = await get_receipt(db, workspace.id, receipt_id)
    rcp, client_name, client_phone, invoice_number = row
    return map_receipt_to_response(
        rcp,
        client_name,
        client_phone,
        workspace.business_name,
        invoice_number=invoice_number,
    )


@router.get("/{receipt_id}/pdf")
async def get_receipt_pdf(
    receipt_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    row = await get_receipt(db, workspace.id, receipt_id)
    receipt, client_name, _client_phone, invoice_number = row
    html = render_receipt_html(
        receipt,
        business_name=workspace.business_name,
        client_name=client_name,
        invoice_number=invoice_number,
    )
    return HTMLResponse(
        content=html,
        headers={
            "Content-Disposition": f'inline; filename="Receipt-{receipt.receipt_number}.html"'
        },
    )
