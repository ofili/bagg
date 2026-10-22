import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc, func
from typing import List, Optional
from datetime import timedelta, date, datetime, timezone
from urllib.parse import quote
from jinja2 import Template

from app.core.config import settings
from app.core.database import get_db
from app.core.errors import NotFoundException, BadRequestException
from app.core.money import calculate_invoice_totals, format_money
from app.core.security import generate_share_token
from app.integrations.email import EmailSender
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.auth.router import get_current_user_and_workspace
from app.domains.clients.models import Client
from app.domains.quotes.models import Quote
from app.domains.payments.models import PaymentProfile, PaymentClaim
from app.domains.payments.schemas import (
    PaymentClaimResponse,
    PaymentClaimConfirmRequest,
    PaymentClaimRejectRequest,
)
from app.domains.reminders.service import (
    schedule_invoice_reminders,
    cancel_invoice_reminders,
)
from app.domains.billing.service import (
    check_delivery_quota,
    consume_delivery_send,
)
from app.domains.invoices.models import Invoice, InvoiceLineItem, InvoiceRevision
from app.domains.lifecycle.service import (
    effective_invoice_status,
    invoice_days_overdue,
    invoice_is_overdue,
    invoice_payment_state,
    list_status_events,
    record_status_event,
    user_facing_invoice_status,
)
from app.domains.invoices.schemas import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceReviseRequest,
    InvoiceRevisionResponse,
    InvoiceSendResponse,
    LineItemSchema,
    CurrencyMetricsResponse,
    WHTCreditNoteUpdate,
    DocumentStatusEventResponse,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def generate_whatsapp_share_url(
    phone: Optional[str],
    client_name: str,
    invoice_number: str,
    total_formatted: str,
    business_name: str,
    share_url: str,
    due_date: date,
) -> str:
    """Generates a pre-filled 1-click WhatsApp message URL (US-DEL-02)."""
    clean_phone = (phone or "").replace("+", "").replace(" ", "").replace("-", "")
    message = (
        f"Hi {client_name}, here is your invoice {invoice_number} for {total_formatted} "
        f"from {business_name}: {share_url}. Due on {due_date}. Thanks!"
    )
    return f"https://wa.me/{clean_phone}?text={quote(message)}"


def map_invoice_to_response(
    inv: Invoice,
    client_name: Optional[str] = None,
    client_phone: Optional[str] = None,
    business_name: str = "Studio Bagg",
    base_url: str = "http://localhost:3000",
) -> InvoiceResponse:
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
    c_phone = client_phone
    if "client" in inv.__dict__ and inv.client:
        if not c_name:
            c_name = inv.client.name
        if not c_phone:
            c_phone = inv.client.phone

    share_url = f"{base_url}/i/{inv.share_token}" if inv.share_token else ""
    formatted_tot = format_money(inv.total_minor, inv.currency)
    wa_url = (
        generate_whatsapp_share_url(
            phone=c_phone,
            client_name=c_name or "Client",
            invoice_number=inv.invoice_number,
            total_formatted=formatted_tot,
            business_name=business_name,
            share_url=share_url,
            due_date=inv.due_date,
        )
        if inv.share_token
        else None
    )

    latest_claim = None
    if "claims" in inv.__dict__ and inv.claims:
        latest_claim = PaymentClaimResponse.model_validate(inv.claims[0])

    latest_receipt = None
    if "receipts" in inv.__dict__ and inv.receipts:
        from app.domains.invoices.schemas import InvoiceReceiptSummary

        latest_receipt = InvoiceReceiptSummary.model_validate(inv.receipts[0])

    net_payable = inv.net_payable_minor if (inv.net_payable_minor and inv.net_payable_minor > 0) else inv.total_minor
    balance_due = max(0, net_payable - (inv.amount_paid_minor or 0))

    return InvoiceResponse(
        id=inv.id,
        workspace_id=inv.workspace_id,
        client_id=inv.client_id,
        client_name=c_name,
        invoice_number=inv.invoice_number,
        sequence_number=inv.sequence_number,
        quote_id=inv.quote_id,
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
        wht_rate_percent=inv.wht_rate_percent or 0.0,
        wht_minor=inv.wht_minor or 0,
        net_payable_minor=net_payable,
        wht_credit_note_number=inv.wht_credit_note_number,
        deposit_percentage=inv.deposit_percentage,
        deposit_amount_minor=inv.deposit_amount_minor,
        deposit_due_date=inv.deposit_due_date,
    amount_paid_minor=inv.amount_paid_minor or 0,
    remaining_minor=max(0, net_payable - (inv.amount_paid_minor or 0)),
    balance_due_minor=balance_due,
    direct_checkout_enabled=inv.direct_checkout_enabled if inv.direct_checkout_enabled is not None else True,
    direct_payment_reference=inv.direct_payment_reference,
    payment_processing_at=inv.payment_processing_at,
    payment_state=invoice_payment_state(inv),
    effective_status=effective_invoice_status(inv),
    user_facing_status=user_facing_invoice_status(inv),
    is_overdue=invoice_is_overdue(inv),
    days_overdue=invoice_days_overdue(inv),
        paid_at=inv.paid_at,
        payment_profile_id=inv.payment_profile_id,
        notes=inv.notes,
        share_token=inv.share_token,
        sent_at=inv.sent_at,
        email_delivery_status=inv.email_delivery_status,
        pdf_url=inv.pdf_url,
        version=inv.version,
        last_revised_at=inv.last_revised_at,
        whatsapp_share_url=wa_url,
        latest_claim=latest_claim,
        latest_receipt=latest_receipt,
        created_at=inv.created_at,
        updated_at=inv.updated_at,
    )


@router.get("", response_model=List[InvoiceResponse])
async def list_invoices(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (draft, sent, viewed, payment_claimed, partially_paid, paid, overdue, void/cancelled)"),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Lists all invoices for the workspace with client details and financial totals (US-INV-01, US-DSH-02).
    Supports complete 8-state machine filtering: draft, sent, viewed, payment_claimed, partially_paid, paid, overdue, void.
    """
    conditions = [Invoice.workspace_id == workspace.id]
    if client_id:
        conditions.append(Invoice.client_id == client_id)

    if status_filter:
        s = status_filter.lower().strip()
        if s == "overdue":
            today = date.today()
            payable = func.coalesce(func.nullif(Invoice.net_payable_minor, 0), Invoice.total_minor)
            conditions.append(Invoice.due_date < today)
            conditions.append(
                Invoice.status.in_(
                    ["sent", "viewed", "payment_claimed", "partially_paid"]
                )
            )
            conditions.append(payable > func.coalesce(Invoice.amount_paid_minor, 0))
        elif s == "void":
            conditions.append(Invoice.status == "cancelled")
        else:
            conditions.append(Invoice.status == s)

    if currency:
        conditions.append(Invoice.currency == currency.upper().strip())

    stmt = (
        select(Invoice, Client.name.label("client_name"), Client.phone.label("client_phone"))
        .join(Client, Invoice.client_id == Client.id, isouter=True)
        .where(and_(*conditions))
        .order_by(desc(Invoice.sequence_number), desc(Invoice.created_at))
    )

    result = await db.execute(stmt)
    rows = result.all()

    return [
        map_invoice_to_response(
            inv,
            client_name=c_name,
            client_phone=c_phone,
            business_name=workspace.business_name,
        )
        for inv, c_name, c_phone in rows
    ]


@router.get("/metrics", response_model=List[CurrencyMetricsResponse])
async def get_invoice_metrics(
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Currency-Segregated Metrics (US-DSH-01).
    Calculates outstanding, overdue, and paid-this-month figures grouped strictly by currency.
    Totals across different currencies are NEVER summed together.
    """
    stmt = select(Invoice).where(Invoice.workspace_id == workspace.id)
    res = await db.execute(stmt)
    invoices = res.scalars().all()

    today = date.today()
    first_of_month = date(today.year, today.month, 1)

    metrics_by_currency = {}

    for inv in invoices:
        curr = inv.currency
        if curr not in metrics_by_currency:
            metrics_by_currency[curr] = {
                "currency": curr,
                "outstanding_minor": 0,
                "overdue_minor": 0,
                "paid_this_month_minor": 0,
                "invoices_count": 0,
                "draft_count": 0,
                "sent_count": 0,
                "viewed_count": 0,
                "claimed_count": 0,
                "partially_paid_count": 0,
                "paid_count": 0,
                "overdue_count": 0,
                "cancelled_count": 0,
            }

        m = metrics_by_currency[curr]
        m["invoices_count"] += 1

        target_payable = inv.net_payable_minor if (inv.net_payable_minor and inv.net_payable_minor > 0) else inv.total_minor
        unpaid_balance = max(0, target_payable - (inv.amount_paid_minor or 0))

        if inv.status == "draft":
            m["draft_count"] += 1
        elif inv.status == "sent":
            m["sent_count"] += 1
        elif inv.status == "viewed":
            m["viewed_count"] += 1
        elif inv.status == "payment_claimed":
            m["claimed_count"] += 1
        elif inv.status == "partially_paid":
            m["partially_paid_count"] += 1
        elif inv.status == "paid":
            m["paid_count"] += 1
        elif inv.status == "cancelled":
            m["cancelled_count"] += 1

        # Outstanding: Invoices delivered / in progress but not fully paid
        if inv.status in ["sent", "viewed", "payment_claimed", "partially_paid"]:
            m["outstanding_minor"] += unpaid_balance

        # Overdue: Sent or viewed invoices past due date
        if inv.status in ["sent", "viewed"] and inv.due_date < today:
            m["overdue_minor"] += unpaid_balance
            m["overdue_count"] += 1

        # Paid this Month: amount_paid_minor on paid / partially_paid invoices updated this month
        if (inv.amount_paid_minor or 0) > 0 and inv.status in ["partially_paid", "paid"]:
            inv_date = inv.updated_at.date() if inv.updated_at else inv.issue_date
            if inv_date >= first_of_month:
                m["paid_this_month_minor"] += inv.amount_paid_minor

    # Include currencies configured in Payment Profiles even if no invoices yet
    profile_stmt = select(PaymentProfile.currency).where(PaymentProfile.workspace_id == workspace.id).distinct()
    prof_currencies = (await db.execute(profile_stmt)).scalars().all()
    for pc in prof_currencies:
        if pc not in metrics_by_currency:
            metrics_by_currency[pc] = {
                "currency": pc,
                "outstanding_minor": 0,
                "overdue_minor": 0,
                "paid_this_month_minor": 0,
                "invoices_count": 0,
                "draft_count": 0,
                "sent_count": 0,
                "viewed_count": 0,
                "claimed_count": 0,
                "partially_paid_count": 0,
                "paid_count": 0,
                "overdue_count": 0,
                "cancelled_count": 0,
            }

    # If still empty, return NGN as default
    if not metrics_by_currency:
        metrics_by_currency["NGN"] = {
            "currency": "NGN",
            "outstanding_minor": 0,
            "overdue_minor": 0,
            "paid_this_month_minor": 0,
            "invoices_count": 0,
            "draft_count": 0,
            "sent_count": 0,
            "viewed_count": 0,
            "claimed_count": 0,
            "partially_paid_count": 0,
            "paid_count": 0,
            "overdue_count": 0,
            "cancelled_count": 0,
        }

    return [CurrencyMetricsResponse(**data) for data in metrics_by_currency.values()]


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
    client_stmt = select(Client).where(
        and_(Client.id == payload.client_id, Client.workspace_id == workspace.id)
    )
    client_res = await db.execute(client_stmt)
    client = client_res.scalar_one_or_none()
    if not client:
        raise NotFoundException(f"Client '{payload.client_id}' not found in this workspace")

    seq = workspace.next_invoice_number
    invoice_number = f"{workspace.invoice_prefix}{seq:04d}"
    workspace.next_invoice_number = seq + 1

    issue_date = payload.issue_date or date.today()
    due_date = payload.due_date
    if not due_date:
        terms_days = client.default_payment_terms_days or 14
        due_date = issue_date + timedelta(days=terms_days)

    raw_items = [
        {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
        for it in payload.items
    ]
    totals = calculate_invoice_totals(
        items=raw_items,
        discount_minor=payload.discount_minor,
        tax_percent=payload.tax_rate_percent,
        wht_percent=payload.wht_rate_percent,
        deposit_percent=payload.deposit_percentage or 0.0,
        deposit_amount_minor=payload.deposit_amount_minor,
    )

    raw_token, token_hash = generate_share_token()

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
        wht_rate_percent=payload.wht_rate_percent,
        wht_minor=totals["wht_minor"],
        net_payable_minor=totals["net_payable_minor"],
        deposit_percentage=payload.deposit_percentage,
        deposit_amount_minor=totals["deposit_amount_minor"],
        deposit_due_date=payload.deposit_due_date,
        direct_checkout_enabled=payload.direct_checkout_enabled,
        amount_paid_minor=0,
        payment_profile_id=payload.payment_profile_id,
        notes=payload.notes,
        share_token=raw_token,
        share_token_hash=token_hash,
        version=1,
    )
    db.add(invoice)
    await db.flush()

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

    return map_invoice_to_response(
        invoice,
        client_name=client.name,
        client_phone=client.phone,
        business_name=workspace.business_name,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full invoice details including line items, client, and current status."""
    stmt = (
        select(Invoice, Client.name.label("client_name"), Client.phone.label("client_phone"))
        .join(Client, Invoice.client_id == Client.id, isouter=True)
        .where(and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    invoice, client_name, client_phone = row
    return map_invoice_to_response(
        invoice,
        client_name=client_name,
        client_phone=client_phone,
        business_name=workspace.business_name,
    )


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
            f"Invoice '{invoice.invoice_number}' is '{invoice.status}' and cannot be directly modified. Sent invoices are immutable. Create a revision."
        )

    recalc = (
        payload.items is not None
        or payload.discount_minor is not None
        or payload.tax_rate_percent is not None
        or payload.wht_rate_percent is not None
        or payload.deposit_percentage is not None
        or payload.deposit_amount_minor is not None
    )

    discount = payload.discount_minor if payload.discount_minor is not None else invoice.discount_minor
    tax_rate = payload.tax_rate_percent if payload.tax_rate_percent is not None else invoice.tax_rate_percent
    wht_rate = payload.wht_rate_percent if payload.wht_rate_percent is not None else (invoice.wht_rate_percent or 0.0)
    deposit_pct = payload.deposit_percentage if payload.deposit_percentage is not None else invoice.deposit_percentage
    deposit_amt = payload.deposit_amount_minor if payload.deposit_amount_minor is not None else invoice.deposit_amount_minor

    if payload.items is not None:
        del_stmt = select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id)
        existing_items = (await db.execute(del_stmt)).scalars().all()
        for item in existing_items:
            await db.delete(item)

        raw_items = [
            {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
            for it in payload.items
        ]
        totals = calculate_invoice_totals(
            items=raw_items,
            discount_minor=discount,
            tax_percent=tax_rate,
            wht_percent=wht_rate,
            deposit_percent=deposit_pct or 0.0,
            deposit_amount_minor=deposit_amt,
        )

        invoice.subtotal_minor = totals["subtotal_minor"]
        invoice.discount_minor = discount
        invoice.tax_rate_percent = tax_rate
        invoice.tax_minor = totals["tax_minor"]
        invoice.total_minor = totals["total_minor"]
        invoice.wht_rate_percent = wht_rate
        invoice.wht_minor = totals["wht_minor"]
        invoice.net_payable_minor = totals["net_payable_minor"]
        invoice.deposit_percentage = deposit_pct
        invoice.deposit_amount_minor = totals["deposit_amount_minor"]

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
    elif recalc:
        raw_items = [
            {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
            for it in (invoice.items or [])
        ]
        totals = calculate_invoice_totals(
            items=raw_items,
            discount_minor=discount,
            tax_percent=tax_rate,
            wht_percent=wht_rate,
            deposit_percent=deposit_pct or 0.0,
            deposit_amount_minor=deposit_amt,
        )
        invoice.discount_minor = discount
        invoice.tax_rate_percent = tax_rate
        invoice.tax_minor = totals["tax_minor"]
        invoice.total_minor = totals["total_minor"]
        invoice.wht_rate_percent = wht_rate
        invoice.wht_minor = totals["wht_minor"]
        invoice.net_payable_minor = totals["net_payable_minor"]
        invoice.deposit_percentage = deposit_pct
        invoice.deposit_amount_minor = totals["deposit_amount_minor"]

    if payload.deposit_due_date is not None:
        invoice.deposit_due_date = payload.deposit_due_date
    if payload.direct_checkout_enabled is not None:
        invoice.direct_checkout_enabled = payload.direct_checkout_enabled
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

    return map_invoice_to_response(invoice, business_name=workspace.business_name)


@router.post("/{invoice_id}/finalize", response_model=InvoiceResponse)
async def finalize_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Finalize a draft invoice (US-INV-04).
    Locks the invoice into 'issued' state: share link exists but nothing is
    delivered yet and no reminders are scheduled. Call /send to deliver.
    Issue date, due date and invoice number are assigned here (no numbering gaps).
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
            f"Invoice '{invoice.invoice_number or invoice_id}' is '{invoice.status}' and cannot be finalized."
        )

    # Validation before locking
    client_stmt = select(Client).where(
        and_(Client.id == invoice.client_id, Client.workspace_id == workspace.id)
    )
    client_res = await db.execute(client_stmt)
    client = client_res.scalar_one_or_none()
    if not client:
        raise NotFoundException(f"Client '{invoice.client_id}' not found in this workspace")

    item_stmt = select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id)
    items = (await db.execute(item_stmt)).scalars().all()
    if not items:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' must have at least one line item."
        )
    total_minor = sum(it.total_minor for it in items)
    if total_minor <= 0:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' total must be greater than zero."
        )

    # Assign dates + number at finalize (no numbering gaps).
    # Dates are only filled in when absent so standalone drafts keep their
    # caller-provided due_date (e.g. for overdue testing).
    issue_date = invoice.issue_date or date.today()
    if not invoice.due_date:
        terms_days = client.default_payment_terms_days or 14
        invoice.due_date = issue_date + timedelta(days=terms_days)
    invoice.issue_date = issue_date

    seq = workspace.next_invoice_number
    invoice_number = f"{workspace.invoice_prefix}{seq:04d}"
    workspace.next_invoice_number = seq + 1

    old_status = invoice.status
    invoice.status = "issued"
    invoice.issue_date = issue_date
    invoice.invoice_number = invoice_number
    invoice.sequence_number = seq
    if not invoice.share_token:
        raw_token, token_hash = generate_share_token()
        invoice.share_token = raw_token
        invoice.share_token_hash = token_hash

    record_status_event(
        db=db,
        workspace_id=workspace.id,
        document_type="invoice",
        document_id=invoice.id,
        from_status=old_status,
        to_status=invoice.status,
        actor_type="issuer",
        actor_id=workspace.owner_id,
        source="issuer_finalize",
    )

    # Mark the parent quote converted once its invoice is finalized
    if invoice.quote_id:
        quote_stmt = select(Quote).where(
            and_(Quote.id == invoice.quote_id, Quote.workspace_id == workspace.id)
        )
        quote_res = await db.execute(quote_stmt)
        quote_obj = quote_res.scalar_one_or_none()
        if quote_obj and quote_obj.status == "accepted":
            quote_obj.status = "converted"
            record_status_event(
                db=db,
                workspace_id=workspace.id,
                document_type="quote",
                document_id=quote_obj.id,
                from_status="accepted",
                to_status="converted",
                actor_type="issuer",
                actor_id=workspace.owner_id,
                source="issuer_convert",
                metadata={"invoice_id": invoice.id, "invoice_number": invoice.invoice_number},
            )

    await db.commit()
    await db.refresh(invoice)

    return map_invoice_to_response(
        invoice,
        client_name=client.name,
        client_phone=client.phone,
        business_name=workspace.business_name,
        base_url=settings.WEB_BASE_URL,
    )


@router.post("/{invoice_id}/send", response_model=InvoiceSendResponse)
async def send_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Sends the invoice (US-DEL-01, US-DEL-02, US-DEL-03).
    - Locks the invoice status to 'sent' (triggering immutability).
    - Generates 1-click WhatsApp share link.
    - Sends automated email if client email is present.
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

    if invoice.status == "draft":
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' is a draft and cannot be sent. "
            "Finalize it first with POST /invoices/{id}/finalize."
        )

    # Ensure share token exists
    if not invoice.share_token:
        raw_token, token_hash = generate_share_token()
        invoice.share_token = raw_token
        invoice.share_token_hash = token_hash

    # Transition to sent
    old_status = invoice.status
    invoice.status = "sent"
    invoice.sent_at = datetime.now(timezone.utc)
    record_status_event(
        db=db,
        workspace_id=workspace.id,
        document_type="invoice",
        document_id=invoice.id,
        from_status=old_status,
        to_status="sent",
        actor_type="issuer",
        actor_id=workspace.owner_id,
        source="issuer_send",
    )

    # Disptach email if client email present
    email_sent = False
    recipient_email = client.email
    share_url = f"http://localhost:3000/i/{invoice.share_token}"

    if recipient_email:
        # Enforce Free Tier Metering & Delivery Quota (US-SUB-01)
        await check_delivery_quota(workspace, db)

        email_sender = EmailSender()
        await email_sender.send_invoice_email(
            to_email=recipient_email,
            invoice_number=invoice.invoice_number,
            share_url=share_url,
        )
        invoice.email_delivery_status = "delivered"
        email_sent = True
        # Consume delivery quota or deduct from credit ledger (US-SUB-06)
        await consume_delivery_send(workspace, db)
    else:
        invoice.email_delivery_status = "no_email"

    await db.commit()
    await db.refresh(invoice)

    # Schedule polite automated payment reminders cadence (US-REM-01)
    await schedule_invoice_reminders(invoice, db)

    resp_invoice = map_invoice_to_response(
        invoice,
        client_name=client.name,
        client_phone=client.phone,
        business_name=workspace.business_name,
    )

    wa_url = generate_whatsapp_share_url(
        phone=client.phone,
        client_name=client.name,
        invoice_number=invoice.invoice_number,
        total_formatted=format_money(invoice.total_minor, invoice.currency),
        business_name=workspace.business_name,
        share_url=share_url,
        due_date=invoice.due_date,
    )

    return InvoiceSendResponse(
        invoice=resp_invoice,
        whatsapp_url=wa_url,
        email_sent=email_sent,
        recipient_email=recipient_email,
        share_url=share_url,
        message=f"Invoice {invoice.invoice_number} sent successfully.",
    )


@router.post("/{invoice_id}/share-link/regenerate", response_model=InvoiceResponse)
async def regenerate_share_link(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Revokes and regenerates cryptographic share token (US-DEL-01).
    Old links will immediately cease to function.
    """
    stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    raw_token, token_hash = generate_share_token()
    invoice.share_token = raw_token
    invoice.share_token_hash = token_hash

    await db.commit()
    await db.refresh(invoice)

    return map_invoice_to_response(invoice, business_name=workspace.business_name)


@router.post("/{invoice_id}/revise", response_model=InvoiceResponse)
async def revise_invoice(
    invoice_id: str,
    payload: InvoiceReviseRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Immutability versioning (US-DEL-05):
    Archives current version snapshot to InvoiceRevision, increments version, and applies updates.
    """
    stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    # 1. Snapshot previous version
    existing_items_snapshot = [
        {
            "position": it.position,
            "description": it.description,
            "quantity": it.quantity,
            "unit_price_minor": it.unit_price_minor,
            "total_minor": it.total_minor,
        }
        for it in (invoice.items or [])
    ]

    revision = InvoiceRevision(
        invoice_id=invoice.id,
        version=invoice.version,
        subtotal_minor=invoice.subtotal_minor,
        discount_minor=invoice.discount_minor,
        tax_rate_percent=invoice.tax_rate_percent,
        tax_minor=invoice.tax_minor,
        total_minor=invoice.total_minor,
        wht_rate_percent=invoice.wht_rate_percent or 0.0,
        wht_minor=invoice.wht_minor or 0,
        net_payable_minor=invoice.net_payable_minor or invoice.total_minor,
        deposit_amount_minor=invoice.deposit_amount_minor,
        items_snapshot=existing_items_snapshot,
        revised_reason=payload.reason,
    )
    db.add(revision)

    # 2. Increment version and update timestamp
    invoice.version += 1
    invoice.last_revised_at = datetime.now(timezone.utc)

    # 3. Replace line items and calculate new totals
    del_stmt = select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id)
    old_items = (await db.execute(del_stmt)).scalars().all()
    for item in old_items:
        await db.delete(item)

    discount = payload.discount_minor if payload.discount_minor is not None else invoice.discount_minor
    tax_rate = payload.tax_rate_percent if payload.tax_rate_percent is not None else invoice.tax_rate_percent
    wht_rate = payload.wht_rate_percent if payload.wht_rate_percent is not None else (invoice.wht_rate_percent or 0.0)
    deposit_pct = payload.deposit_percentage if payload.deposit_percentage is not None else invoice.deposit_percentage
    deposit_amt = payload.deposit_amount_minor if payload.deposit_amount_minor is not None else invoice.deposit_amount_minor

    raw_items = [
        {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
        for it in payload.items
    ]
    totals = calculate_invoice_totals(
        items=raw_items,
        discount_minor=discount,
        tax_percent=tax_rate,
        wht_percent=wht_rate,
        deposit_percent=deposit_pct or 0.0,
        deposit_amount_minor=deposit_amt,
    )

    invoice.subtotal_minor = totals["subtotal_minor"]
    invoice.discount_minor = discount
    invoice.tax_rate_percent = tax_rate
    invoice.tax_minor = totals["tax_minor"]
    invoice.total_minor = totals["total_minor"]
    invoice.wht_rate_percent = wht_rate
    invoice.wht_minor = totals["wht_minor"]
    invoice.net_payable_minor = totals["net_payable_minor"]
    invoice.deposit_percentage = deposit_pct
    invoice.deposit_amount_minor = totals["deposit_amount_minor"]
    if payload.notes is not None:
        invoice.notes = payload.notes

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

    return map_invoice_to_response(invoice, business_name=workspace.business_name)


@router.get("/{invoice_id}/revisions", response_model=List[InvoiceRevisionResponse])
async def list_invoice_revisions(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Returns audit history of all revisions created for this invoice (US-DEL-05)."""
    stmt = (
        select(InvoiceRevision)
        .join(Invoice, InvoiceRevision.invoice_id == Invoice.id)
        .where(and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id))
        .order_by(desc(InvoiceRevision.version))
    )
    res = await db.execute(stmt)
    revisions = res.scalars().all()
    return revisions


@router.get("/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Renders deterministic server-side HTML/PDF view for printing or archiving (US-DEL-04).
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

    template_path = os.path.join(os.path.dirname(__file__), "..", "..", "templates", "invoice.html")
    with open(template_path, "r", encoding="utf-8") as f:
        template = Template(f.read())

    rendered_html = template.render(
        invoice_number=invoice.invoice_number,
        issue_date=invoice.issue_date.strftime("%B %d, %Y"),
        due_date=invoice.due_date.strftime("%B %d, %Y"),
        items=[
            {
                "description": it.description,
                "quantity": it.quantity,
                "formatted_unit_price": format_money(it.unit_price_minor, invoice.currency),
                "formatted_total": format_money(it.total_minor, invoice.currency),
            }
            for it in invoice.items
        ],
        formatted_subtotal=format_money(invoice.subtotal_minor, invoice.currency),
        formatted_tax=format_money(invoice.tax_minor, invoice.currency),
        formatted_total=format_money(invoice.total_minor, invoice.currency),
    )

    return HTMLResponse(
        content=rendered_html,
        headers={"Content-Disposition": f"inline; filename=Invoice-{invoice.invoice_number}.html"},
    )


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Deletes a draft invoice. Sent invoices cannot be deleted (must be cancelled)."""
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


@router.get("/{invoice_id}/status-events", response_model=List[DocumentStatusEventResponse])
async def list_invoice_status_events(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Chronological audit trail for invoice status transitions."""
    stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    invoice = (await db.execute(stmt)).scalar_one_or_none()
    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    return await list_status_events(db, workspace.id, "invoice", invoice_id)

@router.get("/{invoice_id}/claims", response_model=List[PaymentClaimResponse])
async def list_invoice_claims(
    invoice_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Lists all payment claims submitted for this invoice (US-CLM-01/02)."""
    stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    claim_stmt = (
        select(PaymentClaim)
        .where(PaymentClaim.invoice_id == invoice.id)
        .order_by(PaymentClaim.created_at.desc())
    )
    claim_res = await db.execute(claim_stmt)
    claims = claim_res.scalars().all()
    return claims


@router.post("/{invoice_id}/claims/{claim_id}/confirm", response_model=PaymentClaimResponse)
async def confirm_payment_claim(
    invoice_id: str,
    claim_id: str,
    payload: Optional[PaymentClaimConfirmRequest] = None,
    workspace: Workspace = Depends(resolve_active_workspace),
    auth_data=Depends(get_current_user_and_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Freelancer confirms payment claim (US-CLM-02).
    Updates amount_paid_minor, transitions invoice to 'paid' (or 'partially_paid'),
    marks claim as confirmed, records confirmed_at timestamp,
    and auto-issues an immutable stamped receipt (US-RCP-01).
    """
    stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    claim_stmt = select(PaymentClaim).where(
        and_(PaymentClaim.id == claim_id, PaymentClaim.invoice_id == invoice.id)
    )
    claim_res = await db.execute(claim_stmt)
    claim = claim_res.scalar_one_or_none()
    if not claim:
        raise NotFoundException(f"Payment claim '{claim_id}' not found")
    if claim.status != "pending":
        raise BadRequestException(
            f"Payment claim '{claim_id}' is already '{claim.status}'"
        )

    confirmed_amount = (
        payload.amount_paid_minor
        if (payload and payload.amount_paid_minor is not None)
        else claim.amount_minor
    )

    # Auto-issue stamped receipt (US-RCP-01) through the confirmation gate.
    from app.domains.receipts.service import confirm_payment

    await confirm_payment(
        db=db,
        workspace=workspace,
        invoice=invoice,
        amount_paid_minor=confirmed_amount,
        payment_method="bank_transfer",
        reference=claim.reference,
        payment_date=claim.payment_date,
        payment_claim_id=claim.id,
        confirmation_source="issuer_claim_review",
        confirmed_by_user_id=auth_data[0].id if auth_data else workspace.owner_id,
        provider="bank",
    )

    claim.status = "confirmed"
    claim.confirmed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(claim)
    return claim


@router.post("/{invoice_id}/claims/{claim_id}/reject", response_model=PaymentClaimResponse)
async def reject_payment_claim(
    invoice_id: str,
    claim_id: str,
    payload: PaymentClaimRejectRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Freelancer rejects payment claim with explanation (US-CLM-02).
    Claim marked as rejected; invoice reverts to previous status (viewed, sent, or partially_paid).
    """
    stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    claim_stmt = select(PaymentClaim).where(
        and_(PaymentClaim.id == claim_id, PaymentClaim.invoice_id == invoice.id)
    )
    claim_res = await db.execute(claim_stmt)
    claim = claim_res.scalar_one_or_none()
    if not claim:
        raise NotFoundException(f"Payment claim '{claim_id}' not found")

    claim.status = "rejected"
    claim.rejection_reason = payload.rejection_reason

    # Revert invoice status
    old_status = invoice.status
    if (invoice.amount_paid_minor or 0) > 0:
        invoice.status = "partially_paid"
    elif invoice.viewed_at:
        invoice.status = "viewed"
    else:
        invoice.status = "sent"
    record_status_event(
        db=db,
        workspace_id=workspace.id,
        document_type="invoice",
        document_id=invoice.id,
        from_status=old_status,
        to_status=invoice.status,
        actor_type="issuer",
        actor_id=workspace.owner_id,
        source="issuer_claim_rejected",
        metadata={"claim_id": claim.id, "reason": payload.rejection_reason},
    )

    await db.commit()
    await db.refresh(claim)
    return claim


@router.patch("/{invoice_id}/wht", response_model=InvoiceResponse)
async def update_wht_credit_note(
    invoice_id: str,
    payload: WHTCreditNoteUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Records or updates the official Withholding Tax (WHT) credit note number
    issued by corporate clients for tax filing (US-INT-03).
    """
    stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    invoice.wht_credit_note_number = payload.wht_credit_note_number.strip()
    await db.commit()
    await db.refresh(invoice)

    return map_invoice_to_response(invoice, business_name=workspace.business_name)

