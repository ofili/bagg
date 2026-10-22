import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from typing import List, Optional
from datetime import timedelta, date, datetime, timezone
from urllib.parse import quote

from app.core.config import settings
from app.core.database import get_db
from app.core.errors import NotFoundException, BadRequestException
from app.core.money import calculate_invoice_totals, format_money
from app.core.security import generate_share_token
from app.domains.workspaces.models import Workspace
from app.domains.workspaces.router import resolve_active_workspace
from app.domains.clients.models import Client
from app.domains.invoices.models import Invoice, InvoiceLineItem
from app.domains.invoices.router import map_invoice_to_response
from app.domains.invoices.schemas import InvoiceResponse
from app.domains.quotes.models import Quote, QuoteLineItem, QuoteRevision
from app.domains.lifecycle.service import record_status_event
from app.domains.quotes.schemas import (
    QuoteCreate,
    QuoteUpdate,
    QuoteResponse,
    QuoteLineItemSchema,
    PublicQuoteView,
    QuoteAcceptRequest,
    QuoteDeclineRequest,
    QuoteReviseRequest,
    QuoteSendResponse,
)

router = APIRouter(prefix="/quotes", tags=["Quotes"])


def generate_quote_whatsapp_url(
    phone: Optional[str],
    client_name: str,
    quote_number: str,
    total_formatted: str,
    business_name: str,
    share_url: str,
    expires_at: date,
) -> str:
    """Generates a pre-filled 1-click WhatsApp message URL for quote review."""
    clean_phone = (phone or "").replace("+", "").replace(" ", "").replace("-", "")
    message = (
        f"Hi {client_name}, here is your quote {quote_number} for {total_formatted} "
        f"from {business_name}: {share_url}. Offer valid until {expires_at}. Thanks!"
    )
    return f"https://wa.me/{clean_phone}?text={quote(message)}"


def map_quote_to_response(
    quote_obj: Quote,
    client_name: Optional[str] = None,
    client_email: Optional[str] = None,
    client_phone: Optional[str] = None,
    business_name: str = "Studio Bagg",
    base_url: str = settings.WEB_BASE_URL,
) -> QuoteResponse:
    items_out = [
        QuoteLineItemSchema(
            id=item.id,
            position=item.position,
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
        )
        for item in (quote_obj.items or [])
    ]

    c_name = client_name
    c_email = client_email
    c_phone = client_phone
    if "client" in quote_obj.__dict__ and quote_obj.client:
        if not c_name:
            c_name = quote_obj.client.name
        if not c_email:
            c_email = quote_obj.client.email
        if not c_phone:
            c_phone = quote_obj.client.phone

    share_url = f"{base_url}/q/{quote_obj.share_token}" if quote_obj.share_token else None
    formatted_tot = format_money(quote_obj.total_minor, quote_obj.currency)
    wa_url = (
        generate_quote_whatsapp_url(
            phone=c_phone,
            client_name=c_name or "Client",
            quote_number=quote_obj.quote_number,
            total_formatted=formatted_tot,
            business_name=business_name,
            share_url=share_url or "",
            expires_at=quote_obj.expires_at,
        )
        if share_url
        else None
    )

    is_expired = quote_obj.expires_at < date.today() and quote_obj.status not in ["accepted", "converted"]
    display_status = "expired" if is_expired and quote_obj.status in ["draft", "sent", "viewed"] else quote_obj.status

    return QuoteResponse(
        id=quote_obj.id,
        workspace_id=quote_obj.workspace_id,
        client_id=quote_obj.client_id,
        client_name=c_name,
        client_email=c_email,
        quote_number=quote_obj.quote_number,
        sequence_number=quote_obj.sequence_number,
        version=quote_obj.version,
        currency=quote_obj.currency,
        status=display_status,
        is_expired=is_expired,
        issue_date=quote_obj.issue_date,
        expires_at=quote_obj.expires_at,
        items=items_out,
        subtotal_minor=quote_obj.subtotal_minor,
        discount_minor=quote_obj.discount_minor,
        tax_rate_percent=quote_obj.tax_rate_percent,
        tax_minor=quote_obj.tax_minor,
        total_minor=quote_obj.total_minor,
        wht_rate_percent=quote_obj.wht_rate_percent,
        wht_minor=quote_obj.wht_minor,
        net_payable_minor=quote_obj.net_payable_minor,
        deposit_percentage=quote_obj.deposit_percentage,
        deposit_amount_minor=quote_obj.deposit_amount_minor,
        notes=quote_obj.notes,
        share_token=quote_obj.share_token,
        share_url=share_url,
        whatsapp_share_url=wa_url,
        sent_at=quote_obj.sent_at,
        viewed_at=quote_obj.viewed_at,
        accepted_at=quote_obj.accepted_at,
        accepted_by_name=quote_obj.accepted_by_name,
        declined_at=quote_obj.declined_at,
        decline_reason=quote_obj.decline_reason,
        invoice_id=quote_obj.invoice_id,
        invoice_number=quote_obj.invoice.invoice_number if quote_obj.invoice else None,
        invoice_status=quote_obj.invoice.status if quote_obj.invoice else None,
        effective_status=display_status,
        created_at=quote_obj.created_at,
        updated_at=quote_obj.updated_at,
    )


@router.get("", response_model=List[QuoteResponse])
async def list_quotes(
    client_id: Optional[str] = Query(None, description="Filter by client ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (draft, sent, viewed, accepted, declined, expired, converted)"),
    currency: Optional[str] = Query(None, description="Filter by currency"),
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """List quotes with optional client, currency, and status filters."""
    stmt = (
        select(Quote, Client.name.label("client_name"), Client.email.label("client_email"), Client.phone.label("client_phone"))
        .join(Client, Quote.client_id == Client.id, isouter=True)
        .where(Quote.workspace_id == workspace.id)
    )

    if client_id:
        stmt = stmt.where(Quote.client_id == client_id)

    if currency:
        stmt = stmt.where(Quote.currency == currency.upper())

    if status_filter:
        stat = status_filter.lower()
        if stat == "expired":
            stmt = stmt.where(and_(Quote.expires_at < date.today(), Quote.status.notin_(["accepted", "converted"])))
        else:
            stmt = stmt.where(Quote.status == stat)

    stmt = stmt.order_by(desc(Quote.created_at))
    res = await db.execute(stmt)
    rows = res.all()

    return [
        map_quote_to_response(
            q,
            client_name=c_name,
            client_email=c_email,
            client_phone=c_phone,
            business_name=workspace.business_name,
        )
        for q, c_name, c_email, c_phone in rows
    ]


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def create_quote(
    payload: QuoteCreate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a new draft quote with sequential unique numbering (US-QOT-01)
    and precise minor-unit calculations.
    """
    client_stmt = select(Client).where(
        and_(Client.id == payload.client_id, Client.workspace_id == workspace.id)
    )
    client_res = await db.execute(client_stmt)
    client = client_res.scalar_one_or_none()
    if not client:
        raise NotFoundException(f"Client '{payload.client_id}' not found in this workspace")

    seq = workspace.next_quote_number
    quote_number = f"{workspace.quote_prefix}{seq:04d}"
    workspace.next_quote_number = seq + 1

    issue_date = payload.issue_date or date.today()
    expires_at = payload.expires_at
    if not expires_at:
        validity = payload.validity_days if payload.validity_days is not None else 14
        expires_at = issue_date + timedelta(days=validity)

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

    quote_obj = Quote(
        workspace_id=workspace.id,
        client_id=client.id,
        quote_number=quote_number,
        sequence_number=seq,
        currency=payload.currency.upper(),
        status="draft",
        issue_date=issue_date,
        expires_at=expires_at,
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
        notes=payload.notes,
        share_token=raw_token,
        share_token_hash=token_hash,
    )
    db.add(quote_obj)
    await db.flush()

    for i, it in enumerate(payload.items):
        item_total = it.quantity * it.unit_price_minor
        line_item = QuoteLineItem(
            quote_id=quote_obj.id,
            position=i,
            description=it.description,
            quantity=it.quantity,
            unit_price_minor=it.unit_price_minor,
            total_minor=item_total,
        )
        db.add(line_item)

    await db.commit()
    await db.refresh(quote_obj)

    return map_quote_to_response(
        quote_obj,
        client_name=client.name,
        client_email=client.email,
        client_phone=client.phone,
        business_name=workspace.business_name,
    )


@router.get("/{id}", response_model=QuoteResponse)
async def get_quote(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed quote by ID."""
    stmt = (
        select(Quote, Client.name.label("client_name"), Client.email.label("client_email"), Client.phone.label("client_phone"))
        .join(Client, Quote.client_id == Client.id, isouter=True)
        .where(and_(Quote.id == id, Quote.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Quote '{id}' not found")

    q, c_name, c_email, c_phone = row
    return map_quote_to_response(
        q,
        client_name=c_name,
        client_email=c_email,
        client_phone=c_phone,
        business_name=workspace.business_name,
    )


@router.post("/{id}/finalize", response_model=QuoteResponse)
async def finalize_quote(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Finalize a draft quote (US-QOT-04).
    Locks the quote into 'issued' state: content is immutable, share link exists,
    but nothing has been delivered yet. Call /send to deliver.
    """
    stmt = (
        select(Quote, Client.name.label("client_name"), Client.email.label("client_email"), Client.phone.label("client_phone"))
        .join(Client, Quote.client_id == Client.id, isouter=True)
        .where(and_(Quote.id == id, Quote.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Quote '{id}' not found")

    quote_obj, c_name, c_email, c_phone = row

    if quote_obj.status != "draft":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is '{quote_obj.status}' and cannot be finalized."
        )

    # Validate before locking
    client_stmt = select(Client).where(
        and_(Client.id == quote_obj.client_id, Client.workspace_id == workspace.id)
    )
    client_res = await db.execute(client_stmt)
    client = client_res.scalar_one_or_none()
    if not client:
        raise NotFoundException(f"Client '{quote_obj.client_id}' not found in this workspace")
    if not quote_obj.items or len(quote_obj.items) == 0:
        raise BadRequestException(f"Quote '{quote_obj.quote_number}' must have at least one line item.")
    if (quote_obj.total_minor or 0) <= 0:
        raise BadRequestException(f"Quote '{quote_obj.quote_number}' total must be greater than zero.")

    old_status = quote_obj.status
    quote_obj.status = "issued"
    if not quote_obj.share_token:
        raw_token, token_hash = generate_share_token()
        quote_obj.share_token = raw_token
        quote_obj.share_token_hash = token_hash

    record_status_event(
        db=db,
        workspace_id=workspace.id,
        document_type="quote",
        document_id=quote_obj.id,
        from_status=old_status,
        to_status=quote_obj.status,
        actor_type="issuer",
        actor_id=workspace.owner_id,
        source="issuer_finalize",
    )

    await db.commit()
    await db.refresh(quote_obj)

    return map_quote_to_response(
        quote_obj,
        client_name=c_name,
        client_email=c_email,
        client_phone=c_phone,
        business_name=workspace.business_name,
    )


@router.post("/{id}/revise", response_model=QuoteResponse)
async def revise_quote(
    id: str,
    payload: QuoteReviseRequest,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Revise an issued, sent, or viewed quote (US-QOT-05).
    Snapshots the current version to quote_revisions, bumps version, then applies updates.
    Accepted, declined, converted and expired quotes are fully locked.
    """
    stmt = (
        select(Quote, Client.name.label("client_name"), Client.email.label("client_email"), Client.phone.label("client_phone"))
        .join(Client, Quote.client_id == Client.id, isouter=True)
        .where(and_(Quote.id == id, Quote.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Quote '{id}' not found")

    quote_obj, c_name, c_email, c_phone = row

    if quote_obj.status in {"accepted", "declined", "converted"}:
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is '{quote_obj.status}' and cannot be revised."
        )
    if quote_obj.status == "draft":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is a draft; update it directly with PATCH /quotes/{id}."
        )

    # Snapshot current version
    raw_items = [
        {
            "position": it.position,
            "description": it.description,
            "quantity": it.quantity,
            "unit_price_minor": it.unit_price_minor,
            "total_minor": it.total_minor,
        }
        for it in (quote_obj.items or [])
    ]
    revision = QuoteRevision(
        quote_id=quote_obj.id,
        version=quote_obj.version,
        subtotal_minor=quote_obj.subtotal_minor,
        discount_minor=quote_obj.discount_minor,
        tax_rate_percent=quote_obj.tax_rate_percent,
        tax_minor=quote_obj.tax_minor,
        total_minor=quote_obj.total_minor,
        wht_rate_percent=quote_obj.wht_rate_percent,
        wht_minor=quote_obj.wht_minor,
        net_payable_minor=quote_obj.net_payable_minor,
        deposit_amount_minor=quote_obj.deposit_amount_minor,
        items_snapshot=raw_items,
        revised_reason=payload.reason,
    )
    db.add(revision)

    old_status = quote_obj.status
    quote_obj.version = (quote_obj.version or 1) + 1
    quote_obj.last_revised_at = datetime.now(timezone.utc)

    if payload.client_id is not None:
        client_stmt = select(Client).where(
            and_(Client.id == payload.client_id, Client.workspace_id == workspace.id)
        )
        c_res = await db.execute(client_stmt)
        cl = c_res.scalar_one_or_none()
        if not cl:
            raise NotFoundException(f"Client '{payload.client_id}' not found")
        quote_obj.client_id = cl.id
        c_name = cl.name
        c_email = cl.email
        c_phone = cl.phone

    if payload.currency is not None:
        quote_obj.currency = payload.currency.upper()
    if payload.issue_date is not None:
        quote_obj.issue_date = payload.issue_date
    if payload.expires_at is not None:
        quote_obj.expires_at = payload.expires_at
    if payload.notes is not None:
        quote_obj.notes = payload.notes
    if payload.deposit_percentage is not None:
        quote_obj.deposit_percentage = payload.deposit_percentage
    if payload.deposit_amount_minor is not None:
        quote_obj.deposit_amount_minor = payload.deposit_amount_minor

    discount = payload.discount_minor if payload.discount_minor is not None else quote_obj.discount_minor
    tax_rate = payload.tax_rate_percent if payload.tax_rate_percent is not None else quote_obj.tax_rate_percent
    wht_rate = payload.wht_rate_percent if payload.wht_rate_percent is not None else quote_obj.wht_rate_percent
    deposit_pct = payload.deposit_percentage if payload.deposit_percentage is not None else quote_obj.deposit_percentage
    deposit_amt = payload.deposit_amount_minor if payload.deposit_amount_minor is not None else quote_obj.deposit_amount_minor

    if payload.items is not None:
        quote_obj.items.clear()
        for i, it in enumerate(payload.items):
            item_tot = it.quantity * it.unit_price_minor
            line_it = QuoteLineItem(
                quote_id=quote_obj.id,
                position=i,
                description=it.description,
                quantity=it.quantity,
                unit_price_minor=it.unit_price_minor,
                total_minor=item_tot,
            )
            quote_obj.items.append(line_it)

    totals = calculate_invoice_totals(
        items=[
            {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
            for it in quote_obj.items
        ],
        discount_minor=discount,
        tax_percent=tax_rate,
        wht_percent=wht_rate,
        deposit_percent=deposit_pct or 0.0,
        deposit_amount_minor=deposit_amt,
    )

    quote_obj.subtotal_minor = totals["subtotal_minor"]
    quote_obj.discount_minor = discount
    quote_obj.tax_rate_percent = tax_rate
    quote_obj.tax_minor = totals["tax_minor"]
    quote_obj.total_minor = totals["total_minor"]
    quote_obj.wht_rate_percent = wht_rate
    quote_obj.wht_minor = totals["wht_minor"]
    quote_obj.net_payable_minor = totals["net_payable_minor"]
    quote_obj.deposit_amount_minor = totals["deposit_amount_minor"]

    record_status_event(
        db=db,
        workspace_id=workspace.id,
        document_type="quote",
        document_id=quote_obj.id,
        from_status=old_status,
        to_status=quote_obj.status,
        actor_type="issuer",
        actor_id=workspace.owner_id,
        source="issuer_revise",
        metadata={"from_version": revision.version, "to_version": quote_obj.version, "reason": payload.reason},
    )

    await db.commit()
    await db.refresh(quote_obj)

    return map_quote_to_response(
        quote_obj,
        client_name=c_name,
        client_email=c_email,
        client_phone=c_phone,
        business_name=workspace.business_name,
    )


@router.patch("/{id}", response_model=QuoteResponse)
async def update_quote(
    id: str,
    payload: QuoteUpdate,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """Update a draft or sent quote."""
    stmt = (
        select(Quote, Client.name.label("client_name"), Client.email.label("client_email"), Client.phone.label("client_phone"))
        .join(Client, Quote.client_id == Client.id, isouter=True)
        .where(and_(Quote.id == id, Quote.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Quote '{id}' not found")

    quote_obj, c_name, c_email, c_phone = row

    if quote_obj.status in ["accepted", "converted"]:
        raise BadRequestException(f"Cannot update quote in '{quote_obj.status}' status")

    if payload.client_id is not None:
        client_stmt = select(Client).where(
            and_(Client.id == payload.client_id, Client.workspace_id == workspace.id)
        )
        c_res = await db.execute(client_stmt)
        cl = c_res.scalar_one_or_none()
        if not cl:
            raise NotFoundException(f"Client '{payload.client_id}' not found")
        quote_obj.client_id = cl.id
        c_name = cl.name
        c_email = cl.email
        c_phone = cl.phone

    if payload.currency is not None:
        quote_obj.currency = payload.currency.upper()
    if payload.issue_date is not None:
        quote_obj.issue_date = payload.issue_date
    if payload.expires_at is not None:
        quote_obj.expires_at = payload.expires_at
    if payload.notes is not None:
        quote_obj.notes = payload.notes
    if payload.deposit_percentage is not None:
        quote_obj.deposit_percentage = payload.deposit_percentage
    if payload.deposit_amount_minor is not None:
        quote_obj.deposit_amount_minor = payload.deposit_amount_minor

    # If items or financials were updated, recalculate totals
    discount = payload.discount_minor if payload.discount_minor is not None else quote_obj.discount_minor
    tax_rate = payload.tax_rate_percent if payload.tax_rate_percent is not None else quote_obj.tax_rate_percent
    wht_rate = payload.wht_rate_percent if payload.wht_rate_percent is not None else quote_obj.wht_rate_percent
    deposit_pct = payload.deposit_percentage if payload.deposit_percentage is not None else quote_obj.deposit_percentage
    deposit_amt = payload.deposit_amount_minor if payload.deposit_amount_minor is not None else quote_obj.deposit_amount_minor

    if payload.items is not None:
        # Replace items
        quote_obj.items.clear()
        raw_items = []
        for i, it in enumerate(payload.items):
            item_tot = it.quantity * it.unit_price_minor
            line_it = QuoteLineItem(
                quote_id=quote_obj.id,
                position=i,
                description=it.description,
                quantity=it.quantity,
                unit_price_minor=it.unit_price_minor,
                total_minor=item_tot,
            )
            quote_obj.items.append(line_it)
            raw_items.append({"quantity": it.quantity, "unit_price_minor": it.unit_price_minor})
    else:
        raw_items = [
            {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
            for it in quote_obj.items
        ]

    totals = calculate_invoice_totals(
        items=raw_items,
        discount_minor=discount,
        tax_percent=tax_rate,
        wht_percent=wht_rate,
        deposit_percent=deposit_pct or 0.0,
        deposit_amount_minor=deposit_amt,
    )

    quote_obj.subtotal_minor = totals["subtotal_minor"]
    quote_obj.discount_minor = discount
    quote_obj.tax_rate_percent = tax_rate
    quote_obj.tax_minor = totals["tax_minor"]
    quote_obj.total_minor = totals["total_minor"]
    quote_obj.wht_rate_percent = wht_rate
    quote_obj.wht_minor = totals["wht_minor"]
    quote_obj.net_payable_minor = totals["net_payable_minor"]
    quote_obj.deposit_amount_minor = totals["deposit_amount_minor"]

    await db.commit()
    await db.refresh(quote_obj)

    return map_quote_to_response(
        quote_obj,
        client_name=c_name,
        client_email=c_email,
        client_phone=c_phone,
        business_name=workspace.business_name,
    )


@router.post("/{id}/send", response_model=QuoteSendResponse)
async def send_quote(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    Finalizes and sends the quote, locking it into 'sent' state and
    generating public share links and WhatsApp share URLs.
    """
    stmt = (
        select(Quote, Client.name.label("client_name"), Client.phone.label("client_phone"))
        .join(Client, Quote.client_id == Client.id, isouter=True)
        .where(and_(Quote.id == id, Quote.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Quote '{id}' not found")

    quote_obj, c_name, c_phone = row

    if quote_obj.status == "draft":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is a draft and cannot be sent. Finalize it first with POST /quotes/{id}/finalize."
        )

    if not quote_obj.share_token:
        raw_token, token_hash = generate_share_token()
        quote_obj.share_token = raw_token
        quote_obj.share_token_hash = token_hash

    old_status = quote_obj.status
    quote_obj.status = "sent"

    now = datetime.now(timezone.utc)
    quote_obj.sent_at = now
    record_status_event(
        db=db,
        workspace_id=workspace.id,
        document_type="quote",
        document_id=quote_obj.id,
        from_status=old_status,
        to_status=quote_obj.status,
        actor_type="issuer",
        actor_id=workspace.owner_id,
        source="issuer_send",
    )

    await db.commit()
    await db.refresh(quote_obj)

    share_url = f"{settings.WEB_BASE_URL}/q/{quote_obj.share_token}"
    formatted_tot = format_money(quote_obj.total_minor, quote_obj.currency)
    wa_url = generate_quote_whatsapp_url(
        phone=c_phone,
        client_name=c_name or "Client",
        quote_number=quote_obj.quote_number,
        total_formatted=formatted_tot,
        business_name=workspace.business_name,
        share_url=share_url,
        expires_at=quote_obj.expires_at,
    )

    return QuoteSendResponse(
        id=quote_obj.id,
        quote_number=quote_obj.quote_number,
        version=quote_obj.version,
        status=quote_obj.status,
        share_token=quote_obj.share_token,
        share_url=share_url,
        whatsapp_share_url=wa_url,
        sent_at=now,
    )


@router.post("/{id}/convert", response_model=InvoiceResponse)
async def convert_quote_to_invoice(
    id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
    db: AsyncSession = Depends(get_db),
):
    """
    1-Click Convert Accepted Quote to Invoice (US-QOT-03).
    - Requires the quote to be 'accepted'.
    - Clones line items, totals, currency, deposit and notes into a new draft Invoice.
    - Links invoices.quote_id = this quote (source of truth); quote stays 'accepted'
      and becomes 'converted' when its invoice is finalized.
    - Idempotent: if an invoice already exists for this quote, returns it.
    - Returns HTTP 400 if the quote is not accepted.
    """
    stmt = (
        select(Quote, Client)
        .join(Client, Quote.client_id == Client.id)
        .where(and_(Quote.id == id, Quote.workspace_id == workspace.id))
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise NotFoundException(f"Quote '{id}' not found")

    quote_obj, client = row

    if quote_obj.status != "accepted":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' must be 'accepted' before conversion (current: {quote_obj.status})."
        )

    # Idempotent: return existing invoice linked to this quote
    existing_invoice_stmt = select(Invoice).where(
        and_(Invoice.quote_id == quote_obj.id, Invoice.workspace_id == workspace.id)
    )
    existing_invoice = (await db.execute(existing_invoice_stmt)).scalar_one_or_none()
    if existing_invoice is not None:
        return map_invoice_to_response(
            existing_invoice,
            client_name=client.name,
            client_phone=client.phone,
            business_name=workspace.business_name,
            base_url=settings.WEB_BASE_URL,
        )

    raw_token, token_hash = generate_share_token()

    invoice = Invoice(
        workspace_id=workspace.id,
        client_id=client.id,
        invoice_number=None,  # assigned at finalize (no numbering gaps)
        sequence_number=None,  # assigned at finalize
        currency=quote_obj.currency,
        status="draft",
        issue_date=None,  # assigned at finalize
        due_date=None,  # assigned at finalize
        subtotal_minor=quote_obj.subtotal_minor,
        discount_minor=quote_obj.discount_minor,
        tax_rate_percent=quote_obj.tax_rate_percent,
        tax_minor=quote_obj.tax_minor,
        total_minor=quote_obj.total_minor,
        wht_rate_percent=quote_obj.wht_rate_percent,
        wht_minor=quote_obj.wht_minor,
        net_payable_minor=quote_obj.net_payable_minor,
        deposit_percentage=quote_obj.deposit_percentage,
        deposit_amount_minor=quote_obj.deposit_amount_minor,
        deposit_due_date=None,
        direct_checkout_enabled=True,
        amount_paid_minor=0,
        notes=quote_obj.notes,
        share_token=raw_token,
        share_token_hash=token_hash,
        version=1,
        quote_id=quote_obj.id,
    )
    db.add(invoice)
    await db.flush()

    for item in quote_obj.items:
        line_item = InvoiceLineItem(
            invoice_id=invoice.id,
            position=item.position,
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
        )
        db.add(line_item)

    # Link quote to invoice (read convenience mirror); source of truth is invoices.quote_id
    quote_obj.invoice_id = invoice.id

    record_status_event(
        db=db,
        workspace_id=workspace.id,
        document_type="quote",
        document_id=quote_obj.id,
        from_status=quote_obj.status,
        to_status=quote_obj.status,
        actor_type="issuer",
        actor_id=workspace.owner_id,
        source="issuer_convert",
        metadata={"invoice_id": invoice.id, "quote_id": quote_obj.id},
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


# --- Public Client Quote Portal Endpoints (US-QOT-02) ---

@router.get("/share/{token}", response_model=PublicQuoteView)
async def get_public_quote(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public zero-account payer endpoint (US-QOT-02).
    - Automatically marks 'sent' quotes as 'viewed' with timestamp.
    - Exposes quote details, expiration status, and accept/decline actions.
    """
    stmt = (
        select(Quote, Client.name.label("client_name"), Workspace)
        .join(Client, Quote.client_id == Client.id, isouter=True)
        .join(Workspace, Quote.workspace_id == Workspace.id)
        .where(Quote.share_token == token)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Quote not found or invalid link")

    quote_obj, client_name, workspace = row

    now = datetime.now(timezone.utc)
    if quote_obj.status == "sent":
        quote_obj.status = "viewed"
        quote_obj.viewed_at = now
        record_status_event(
            db=db,
            workspace_id=quote_obj.workspace_id,
            document_type="quote",
            document_id=quote_obj.id,
            from_status="sent",
            to_status="viewed",
            actor_type="client",
            source="client_view",
        )
        await db.commit()
        await db.refresh(quote_obj)

    is_expired = quote_obj.expires_at < date.today() and quote_obj.status not in ["accepted", "converted"]
    display_status = "expired" if is_expired and quote_obj.status in ["draft", "sent", "viewed"] else quote_obj.status

    items_out = [
        QuoteLineItemSchema(
            id=item.id,
            position=item.position,
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
        )
        for item in (quote_obj.items or [])
    ]

    return PublicQuoteView(
        id=quote_obj.id,
        quote_number=quote_obj.quote_number,
        currency=quote_obj.currency,
        status=display_status,
        is_expired=is_expired,
        issue_date=quote_obj.issue_date,
        expires_at=quote_obj.expires_at,
        items=items_out,
        subtotal_minor=quote_obj.subtotal_minor,
        discount_minor=quote_obj.discount_minor,
        tax_rate_percent=quote_obj.tax_rate_percent,
        tax_minor=quote_obj.tax_minor,
        total_minor=quote_obj.total_minor,
        wht_rate_percent=quote_obj.wht_rate_percent,
        wht_minor=quote_obj.wht_minor,
        net_payable_minor=quote_obj.net_payable_minor,
        deposit_percentage=quote_obj.deposit_percentage,
        deposit_amount_minor=quote_obj.deposit_amount_minor,
        notes=quote_obj.notes,
        business_name=workspace.business_name,
        business_logo_url=workspace.logo_url,
        business_brand_color=workspace.brand_color,
        client_name=client_name,
        viewed_at=quote_obj.viewed_at,
        accepted_at=quote_obj.accepted_at,
        accepted_by_name=quote_obj.accepted_by_name,
        declined_at=quote_obj.declined_at,
        decline_reason=quote_obj.decline_reason,
        invoice_id=quote_obj.invoice_id,
        invoice_number=quote_obj.invoice.invoice_number if quote_obj.invoice else None,
        invoice_status=quote_obj.invoice.status if quote_obj.invoice else None,
        effective_status=quote_obj.status,
        show_badge=(workspace.tier == "free"),
    )


@router.post("/share/{token}/accept", response_model=PublicQuoteView)
async def accept_public_quote(
    token: str,
    payload: QuoteAcceptRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Client accepts the quote online (US-QOT-02).
    - Captures accepted_by_name and accepted_at.
    - Updates status to 'accepted'.
    - Rejects expired or converted quotes.
    """
    stmt = (
        select(Quote, Client.name.label("client_name"), Workspace)
        .join(Client, Quote.client_id == Client.id, isouter=True)
        .join(Workspace, Quote.workspace_id == Workspace.id)
        .where(Quote.share_token == token)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Quote not found or invalid link")

    quote_obj, client_name, workspace = row

    if quote_obj.status == "converted":
        raise BadRequestException("This quote has already been accepted and converted into an invoice.")

    if quote_obj.status == "declined":
        raise BadRequestException("This quote was previously declined. Please request a new quote.")

    if quote_obj.expires_at < date.today():
        raise BadRequestException("This quote has expired. Please contact the freelancer for an updated quote.")

    # Pin acceptance to the exact quote version the client is looking at
    if payload.version is not None and payload.version != quote_obj.version:
        raise BadRequestException(
            f"This quote has been revised to v{quote_obj.version}; you are accepting v{payload.version}. "
            "Please refresh and accept the latest version."
        )

    if quote_obj.status != "accepted":
        old_status = quote_obj.status
        quote_obj.status = "accepted"
        quote_obj.accepted_at = datetime.now(timezone.utc)
        quote_obj.accepted_by_name = payload.accepted_by_name.strip()
        record_status_event(
            db=db,
            workspace_id=quote_obj.workspace_id,
            document_type="quote",
            document_id=quote_obj.id,
            from_status=old_status,
            to_status="accepted",
            actor_type="client",
            source="client_accept",
            metadata={"accepted_by_name": quote_obj.accepted_by_name},
        )
        await db.commit()
        await db.refresh(quote_obj)

    # Idempotent: prepare a single draft Invoice from the accepted quote.
    # Double-accepts and retries never create a second invoice.
    existing_invoice_stmt = select(Invoice).where(
        and_(Invoice.quote_id == quote_obj.id, Invoice.workspace_id == quote_obj.workspace_id)
    )
    existing_invoice = (await db.execute(existing_invoice_stmt)).scalar_one_or_none()
    if existing_invoice is None:
        raw_token, token_hash = generate_share_token()
        invoice = Invoice(
            workspace_id=quote_obj.workspace_id,
            client_id=quote_obj.client_id,
            invoice_number=None,  # assigned at finalize
            sequence_number=None,  # assigned at finalize
            currency=quote_obj.currency,
            status="draft",
            issue_date=None,  # assigned at finalize
            due_date=None,  # assigned at finalize
            subtotal_minor=quote_obj.subtotal_minor,
            discount_minor=quote_obj.discount_minor,
            tax_rate_percent=quote_obj.tax_rate_percent,
            tax_minor=quote_obj.tax_minor,
            total_minor=quote_obj.total_minor,
            wht_rate_percent=quote_obj.wht_rate_percent,
            wht_minor=quote_obj.wht_minor,
            net_payable_minor=quote_obj.net_payable_minor,
            deposit_percentage=quote_obj.deposit_percentage,
            deposit_amount_minor=quote_obj.deposit_amount_minor,
            deposit_due_date=None,
            direct_checkout_enabled=True,
            amount_paid_minor=0,
            notes=quote_obj.notes,
            share_token=raw_token,
            share_token_hash=token_hash,
            version=1,
            quote_id=quote_obj.id,
        )
        db.add(invoice)
        await db.flush()

        for item in quote_obj.items:
            line_item = InvoiceLineItem(
                invoice_id=invoice.id,
                position=item.position,
                description=item.description,
                quantity=item.quantity,
                unit_price_minor=item.unit_price_minor,
                total_minor=item.total_minor,
            )
            db.add(line_item)

        # Read-convenience mirror; source of truth is invoices.quote_id
        quote_obj.invoice_id = invoice.id

        await db.commit()
        await db.refresh(invoice)

    items_out = [
        QuoteLineItemSchema(
            id=item.id,
            position=item.position,
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
        )
        for item in (quote_obj.items or [])
    ]

    return PublicQuoteView(
        id=quote_obj.id,
        quote_number=quote_obj.quote_number,
        currency=quote_obj.currency,
        status=quote_obj.status,
        is_expired=False,
        issue_date=quote_obj.issue_date,
        expires_at=quote_obj.expires_at,
        items=items_out,
        subtotal_minor=quote_obj.subtotal_minor,
        discount_minor=quote_obj.discount_minor,
        tax_rate_percent=quote_obj.tax_rate_percent,
        tax_minor=quote_obj.tax_minor,
        total_minor=quote_obj.total_minor,
        wht_rate_percent=quote_obj.wht_rate_percent,
        wht_minor=quote_obj.wht_minor,
        net_payable_minor=quote_obj.net_payable_minor,
        deposit_percentage=quote_obj.deposit_percentage,
        deposit_amount_minor=quote_obj.deposit_amount_minor,
        notes=quote_obj.notes,
        business_name=workspace.business_name,
        business_logo_url=workspace.logo_url,
        business_brand_color=workspace.brand_color,
        client_name=client_name,
        viewed_at=quote_obj.viewed_at,
        accepted_at=quote_obj.accepted_at,
        accepted_by_name=quote_obj.accepted_by_name,
        declined_at=quote_obj.declined_at,
        decline_reason=quote_obj.decline_reason,
        invoice_id=quote_obj.invoice_id,
        invoice_number=quote_obj.invoice.invoice_number if quote_obj.invoice else None,
        invoice_status=quote_obj.invoice.status if quote_obj.invoice else None,
        effective_status=quote_obj.status,
        show_badge=(workspace.tier == "free"),
    )


@router.post("/share/{token}/decline", response_model=PublicQuoteView)
async def decline_public_quote(
    token: str,
    payload: QuoteDeclineRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Client declines the quote with optional feedback note (US-QOT-02).
    - Captures decline_reason and declined_at.
    - Updates status to 'declined'.
    """
    stmt = (
        select(Quote, Client.name.label("client_name"), Workspace)
        .join(Client, Quote.client_id == Client.id, isouter=True)
        .join(Workspace, Quote.workspace_id == Workspace.id)
        .where(Quote.share_token == token)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Quote not found or invalid link")

    quote_obj, client_name, workspace = row

    if quote_obj.status == "converted":
        raise BadRequestException("Cannot decline a quote that has already been converted into an invoice.")

    old_status = quote_obj.status
    quote_obj.status = "declined"
    quote_obj.declined_at = datetime.now(timezone.utc)
    if payload.reason:
        quote_obj.decline_reason = payload.reason.strip()
    record_status_event(
        db=db,
        workspace_id=quote_obj.workspace_id,
        document_type="quote",
        document_id=quote_obj.id,
        from_status=old_status,
        to_status="declined",
        actor_type="client",
        source="client_decline",
        metadata={"reason": quote_obj.decline_reason},
    )

    await db.commit()
    await db.refresh(quote_obj)

    items_out = [
        QuoteLineItemSchema(
            id=item.id,
            position=item.position,
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.total_minor,
        )
        for item in (quote_obj.items or [])
    ]

    return PublicQuoteView(
        id=quote_obj.id,
        quote_number=quote_obj.quote_number,
        currency=quote_obj.currency,
        status=quote_obj.status,
        is_expired=(quote_obj.expires_at < date.today()),
        issue_date=quote_obj.issue_date,
        expires_at=quote_obj.expires_at,
        items=items_out,
        subtotal_minor=quote_obj.subtotal_minor,
        discount_minor=quote_obj.discount_minor,
        tax_rate_percent=quote_obj.tax_rate_percent,
        tax_minor=quote_obj.tax_minor,
        total_minor=quote_obj.total_minor,
        wht_rate_percent=quote_obj.wht_rate_percent,
        wht_minor=quote_obj.wht_minor,
        net_payable_minor=quote_obj.net_payable_minor,
        deposit_percentage=quote_obj.deposit_percentage,
        deposit_amount_minor=quote_obj.deposit_amount_minor,
        notes=quote_obj.notes,
        business_name=workspace.business_name,
        business_logo_url=workspace.logo_url,
        business_brand_color=workspace.brand_color,
        client_name=client_name,
        viewed_at=quote_obj.viewed_at,
        accepted_at=quote_obj.accepted_at,
        accepted_by_name=quote_obj.accepted_by_name,
        declined_at=quote_obj.declined_at,
        decline_reason=quote_obj.decline_reason,
        invoice_id=quote_obj.invoice_id,
        invoice_number=quote_obj.invoice.invoice_number if quote_obj.invoice else None,
        invoice_status=quote_obj.invoice.status if quote_obj.invoice else None,
        effective_status=quote_obj.status,
        show_badge=(workspace.tier == "free"),
    )
