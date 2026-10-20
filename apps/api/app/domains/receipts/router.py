import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from typing import List, Optional
from datetime import date, datetime, timezone
from urllib.parse import quote
from jinja2 import Template

from app.core.config import settings
from app.core.database import get_db
from app.core.errors import NotFoundException, BadRequestException
from app.core.money import format_money
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.clients.models import Client
from app.domains.invoices.models import Invoice
from app.domains.receipts.models import Receipt
from app.domains.receipts.service import create_receipt
from app.domains.receipts.schemas import (
    ReceiptCreate,
    ReceiptResponse,
    PublicReceiptView,
    StatementEntry,
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
    """Generates pre-filled 1-click WhatsApp message for receipt delivery."""
    clean_phone = (phone or "").replace("+", "").replace(" ", "").replace("-", "")
    message = (
        f"Hi {client_name}, here is your official payment receipt {receipt_number} for {amount_formatted} "
        f"from {business_name}: {share_url}. Thank you for your payment!"
    )
    return f"https://wa.me/{clean_phone}?text={quote(message)}"


def map_receipt_to_response(
    rcp: Receipt,
    client_name: Optional[str] = None,
    client_phone: Optional[str] = None,
    business_name: str = "Studio Bagg",
    base_url: str = settings.WEB_BASE_URL,
) -> ReceiptResponse:
    c_name = client_name
    c_phone = client_phone
    if "client" in rcp.__dict__ and rcp.client:
        if not c_name:
            c_name = rcp.client.name
        if not c_phone:
            c_phone = rcp.client.phone

    inv_num = rcp.invoice.invoice_number if ("invoice" in rcp.__dict__ and rcp.invoice) else "INV"

    share_url = f"{base_url}/r/{rcp.share_token}" if rcp.share_token else None
    formatted_amt = format_money(rcp.amount_paid_minor, rcp.currency)
    wa_url = (
        generate_receipt_whatsapp_url(
            phone=c_phone,
            client_name=c_name or "Client",
            receipt_number=rcp.receipt_number,
            amount_formatted=formatted_amt,
            business_name=business_name,
            share_url=share_url or "",
        )
        if share_url
        else None
    )

    return ReceiptResponse(
        id=rcp.id,
        workspace_id=rcp.workspace_id,
        client_id=rcp.client_id,
        client_name=c_name,
        invoice_id=rcp.invoice_id,
        invoice_number=inv_num,
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
        share_token=rcp.share_token,
        share_url=share_url,
        whatsapp_share_url=wa_url,
        created_at=rcp.created_at,
        updated_at=rcp.updated_at,
    )


@router.get("", response_model=List[ReceiptResponse])
async def list_receipts(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    invoice_id: Optional[str] = Query(None, description="Filter by invoice ID"),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Lists issued receipts for the active workspace."""
    stmt = (
        select(Receipt, Client.name.label("client_name"), Client.phone.label("client_phone"), Invoice.invoice_number)
        .join(Client, Receipt.client_id == Client.id, isouter=True)
        .join(Invoice, Receipt.invoice_id == Invoice.id)
        .where(Receipt.workspace_id == workspace.id)
    )

    if client_id:
        stmt = stmt.where(Receipt.client_id == client_id)
    if invoice_id:
        stmt = stmt.where(Receipt.invoice_id == invoice_id)
    if currency:
        stmt = stmt.where(Receipt.currency == currency.upper())

    stmt = stmt.order_by(desc(Receipt.created_at))
    res = await db.execute(stmt)
    rows = res.all()

    return [
        map_receipt_to_response(
            rcp,
            client_name=c_name,
            client_phone=c_phone,
            business_name=workspace.business_name,
        )
        for rcp, c_name, c_phone, _ in rows
    ]


@router.post("/invoice/{invoice_id}", response_model=ReceiptResponse, status_code=status.HTTP_201_CREATED)
async def record_payment_receipt(
    invoice_id: str,
    payload: ReceiptCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually records an offline payment for an invoice and issues an official stamped receipt (US-RCP-01).
    """
    stmt = (
        select(Invoice, Client)
        .join(Client, Invoice.client_id == Client.id)
        .where(and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    invoice, client = row

    receipt = await create_receipt(
        db=db,
        workspace=workspace,
        invoice=invoice,
        amount_paid_minor=payload.amount_paid_minor,
        payment_method=payload.payment_method,
        reference=payload.reference,
        payer_name=payload.payer_name or client.name,
        payment_date=payload.payment_date,
        notes=payload.notes,
    )
    await db.commit()
    await db.refresh(receipt)

    return map_receipt_to_response(
        receipt,
        client_name=client.name,
        client_phone=client.phone,
        business_name=workspace.business_name,
    )


@router.get("/{id}", response_model=ReceiptResponse)
async def get_receipt(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed receipt by ID."""
    stmt = (
        select(Receipt, Client.name.label("client_name"), Client.phone.label("client_phone"), Invoice.invoice_number)
        .join(Client, Receipt.client_id == Client.id, isouter=True)
        .join(Invoice, Receipt.invoice_id == Invoice.id)
        .where(and_(Receipt.id == id, Receipt.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Receipt '{id}' not found")

    rcp, c_name, c_phone, _ = row
    return map_receipt_to_response(
        rcp,
        client_name=c_name,
        client_phone=c_phone,
        business_name=workspace.business_name,
    )


@router.get("/{id}/pdf")
async def get_receipt_pdf(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Renders deterministic server-side HTML/PDF view for printing or archiving (US-RCP-02).
    """
    stmt = (
        select(Receipt, Client.name.label("client_name"), Invoice.invoice_number)
        .join(Client, Receipt.client_id == Client.id, isouter=True)
        .join(Invoice, Receipt.invoice_id == Invoice.id)
        .where(and_(Receipt.id == id, Receipt.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Receipt '{id}' not found")

    receipt, client_name, invoice_number = row

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Receipt {receipt.receipt_number}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #111; margin: 0; padding: 40px; }}
  .card {{ max-width: 650px; margin: 0 auto; border: 1px solid #e5e5e5; border-radius: 12px; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
  .header {{ display: flex; justify-content: space-between; border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 24px; }}
  .title {{ font-size: 24px; font-weight: 800; color: #111; }}
  .meta {{ color: #666; font-size: 13px; margin-top: 4px; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 14px; }}
  .label {{ font-size: 11px; text-transform: uppercase; color: #888; font-weight: 700; margin-bottom: 2px; }}
  .value {{ font-weight: 600; color: #222; }}
  .amount-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0; }}
  .amount-box .amt {{ font-size: 32px; font-weight: 900; color: #166534; font-family: monospace; }}
  .stamp {{ display: inline-block; border: 3px solid #16a34a; color: #16a34a; font-weight: 900; font-size: 14px; text-transform: uppercase; padding: 6px 14px; border-radius: 6px; letter-spacing: 1px; transform: rotate(-3deg); margin-top: 12px; }}
  .footer {{ border-top: 1px solid #eee; padding-top: 16px; font-size: 12px; color: #777; text-align: center; }}
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <div>
      <div class="title">{workspace.business_name}</div>
      <div class="meta">Official Payment Receipt</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 18px; font-weight: 800;">{receipt.receipt_number}</div>
      <div class="meta">Invoice: {invoice_number}</div>
      <div class="meta">Date: {receipt.payment_date.strftime("%B %d, %Y")}</div>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="label">Payer / Client</div>
      <div class="value">{client_name or receipt.payer_name or 'Client'}</div>
    </div>
    <div>
      <div class="label">Payment Method</div>
      <div class="value">{receipt.payment_method.replace('_', ' ').title()}</div>
    </div>
    <div>
      <div class="label">Reference / Session ID</div>
      <div class="value" style="font-family: monospace;">{receipt.reference or 'N/A'}</div>
    </div>
    <div>
      <div class="label">Invoice Remaining Balance</div>
      <div class="value font-mono">{format_money(receipt.balance_remaining_minor, receipt.currency)}</div>
    </div>
  </div>

  <div class="amount-box">
    <div class="label" style="color: #166534;">Amount Received & Verified</div>
    <div class="amt">{format_money(receipt.amount_paid_minor, receipt.currency)}</div>
    <div>
      <span class="stamp">✓ PAID & VERIFIED • {receipt.verification_code}</span>
    </div>
  </div>

  <div class="footer">
    This document constitutes valid legal proof of payment issued via Bagg.
  </div>
</div>
</body>
</html>"""

    return HTMLResponse(
        content=html_content,
        headers={"Content-Disposition": f"inline; filename=Receipt-{receipt.receipt_number}.html"},
    )


# --- Public Client Receipt Portal (US-RCP-02) ---

@router.get("/share/{token}", response_model=PublicReceiptView)
async def get_public_receipt(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public zero-account payer endpoint (US-RCP-02).
    Displays official stamped receipt for corporate expense submission.
    """
    stmt = (
        select(Receipt, Client.name.label("client_name"), Workspace, Invoice.invoice_number)
        .join(Client, Receipt.client_id == Client.id, isouter=True)
        .join(Workspace, Receipt.workspace_id == Workspace.id)
        .join(Invoice, Receipt.invoice_id == Invoice.id)
        .where(Receipt.share_token == token)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Receipt not found or invalid link")

    rcp, client_name, workspace, invoice_number = row

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
        notes=rcp.notes,
        business_name=workspace.business_name,
        business_logo_url=workspace.logo_url,
        business_brand_color=workspace.brand_color,
        client_name=client_name,
        show_badge=(workspace.tier == "free"),
    )


# --- Client Statement of Account (US-RCP-03) ---

@router.get("/statement/{client_id}", response_model=ClientStatementResponse)
async def get_client_statement(
    client_id: str,
    currency: Optional[str] = Query(None, description="Statement currency (e.g. NGN, USD)"),
    date_from: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Formal Statement of Account for a client (US-RCP-03).
    Chronologically reconciles all invoices (debits) and receipts (credits) with running balance.
    """
    client_stmt = select(Client).where(
        and_(Client.id == client_id, Client.workspace_id == workspace.id)
    )
    client_res = await db.execute(client_stmt)
    client = client_res.scalar_one_or_none()
    if not client:
        raise NotFoundException(f"Client '{client_id}' not found")

    selected_currency = (currency or client.preferred_currency or workspace.default_currency).upper()

    # Invoices billed to this client
    inv_stmt = select(Invoice).where(
        and_(
            Invoice.workspace_id == workspace.id,
            Invoice.client_id == client.id,
            Invoice.currency == selected_currency,
            Invoice.status != "draft",  # only finalized/sent/paid invoices
        )
    )
    if date_from:
        inv_stmt = inv_stmt.where(Invoice.issue_date >= date_from)
    if date_to:
        inv_stmt = inv_stmt.where(Invoice.issue_date <= date_to)

    inv_res = await db.execute(inv_stmt)
    invoices = inv_res.scalars().all()

    # Receipts credited to this client
    rcp_stmt = select(Receipt).where(
        and_(
            Receipt.workspace_id == workspace.id,
            Receipt.client_id == client.id,
            Receipt.currency == selected_currency,
        )
    )
    if date_from:
        rcp_stmt = rcp_stmt.where(Receipt.payment_date >= date_from)
    if date_to:
        rcp_stmt = rcp_stmt.where(Receipt.payment_date <= date_to)

    rcp_res = await db.execute(rcp_stmt)
    receipts = rcp_res.scalars().all()

    # Build chronological timeline
    timeline = []
    for inv in invoices:
        billed = inv.net_payable_minor if (inv.net_payable_minor and inv.net_payable_minor > 0) else inv.total_minor
        timeline.append({
            "date": inv.issue_date,
            "created_at": inv.created_at,
            "type": "invoice",
            "reference_number": inv.invoice_number,
            "description": f"Invoice {inv.invoice_number} (Due {inv.due_date})",
            "debit_minor": billed,
            "credit_minor": 0,
        })

    for rcp in receipts:
        timeline.append({
            "date": rcp.payment_date,
            "created_at": rcp.created_at,
            "type": "receipt",
            "reference_number": rcp.receipt_number,
            "description": f"Payment Receipt ({rcp.payment_method.replace('_', ' ').title()})",
            "debit_minor": 0,
            "credit_minor": rcp.amount_paid_minor,
        })

    # Sort chronological by date then created_at
    timeline.sort(key=lambda x: (x["date"], x["created_at"]))

    running_balance = 0
    total_invoiced = 0
    total_paid = 0
    entries = []

    for item in timeline:
        running_balance += item["debit_minor"] - item["credit_minor"]
        total_invoiced += item["debit_minor"]
        total_paid += item["credit_minor"]
        entries.append(
            StatementEntry(
                date=item["date"],
                type=item["type"],
                reference_number=item["reference_number"],
                description=item["description"],
                debit_minor=item["debit_minor"],
                credit_minor=item["credit_minor"],
                running_balance_minor=running_balance,
            )
        )

    return ClientStatementResponse(
        client_id=client.id,
        client_name=client.name,
        currency=selected_currency,
        date_from=date_from,
        date_to=date_to,
        opening_balance_minor=0,
        entries=entries,
        total_invoiced_minor=total_invoiced,
        total_paid_minor=total_paid,
        closing_balance_minor=running_balance,
        business_name=workspace.business_name,
        generated_at=datetime.now(timezone.utc),
    )
