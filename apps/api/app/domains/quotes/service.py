from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional, cast

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import BadRequestException, NotFoundException
from app.core.money import calculate_invoice_totals, format_money
from app.core.security import generate_share_token
from app.domains.billing.service import (
    check_delivery_quota,
    consume_delivery_send,
)
from app.domains.clients.models import Client
from app.domains.invoices import service as invoices_service
from app.domains.lifecycle.service import record_status_event
from app.domains.quotes.models import Quote, QuoteComment, QuoteLineItem, QuoteRevision
from app.domains.quotes.schemas import (
    QuoteAcceptRequest,
    QuoteCommentCreate,
    QuoteCreate,
    QuoteDeclineRequest,
    QuoteReviewRequest,
    QuoteReviseRequest,
    QuoteUpdate,
)
from app.domains.workspaces.models import Workspace
from app.integrations.email import EmailSender


@dataclass
class SendQuoteOutcome:
    quote: Quote
    email_sent: bool
    recipient_email: Optional[str]
    share_url: str


def _ensure_share_token(quote_obj: Quote) -> None:
    if not quote_obj.share_token:
        raw_token, token_hash = generate_share_token()
        quote_obj.share_token = raw_token
        quote_obj.share_token_hash = token_hash


async def _get_quote_or_404(
    db: AsyncSession, workspace: Workspace, quote_id: str
) -> Quote:
    stmt = select(Quote).where(
        and_(Quote.id == quote_id, Quote.workspace_id == workspace.id)
    )
    quote_obj = (await db.execute(stmt)).scalar_one_or_none()
    if not quote_obj:
        raise NotFoundException(f"Quote '{quote_id}' not found")
    return quote_obj


def _apply_totals(
    quote_obj: Quote,
    totals: dict,
    *,
    discount,
    tax_rate,
    wht_rate,
    deposit_pct,
) -> None:
    quote_obj.subtotal_minor = totals["subtotal_minor"]
    quote_obj.discount_minor = discount
    quote_obj.tax_rate_percent = tax_rate
    quote_obj.tax_minor = totals["tax_minor"]
    quote_obj.total_minor = totals["total_minor"]
    quote_obj.wht_rate_percent = wht_rate
    quote_obj.wht_minor = totals["wht_minor"]
    quote_obj.net_payable_minor = totals["net_payable_minor"]
    quote_obj.deposit_amount_minor = totals["deposit_amount_minor"]


async def list_quotes(
    db: AsyncSession,
    workspace: Workspace,
    *,
    client_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    currency: Optional[str] = None,
) -> list[Quote]:
    stmt = select(Quote).where(Quote.workspace_id == workspace.id)

    if client_id:
        stmt = stmt.where(Quote.client_id == client_id)

    if currency:
        stmt = stmt.where(Quote.currency == currency.upper())

    if status_filter:
        stat = status_filter.lower()
        if stat == "expired":
            stmt = stmt.where(
                and_(
                    Quote.expires_at < date.today(),
                    Quote.status.notin_(["accepted", "converted"]),
                )
            )
        else:
            stmt = stmt.where(Quote.status == stat)

    stmt = stmt.order_by(desc(Quote.created_at))
    return list((await db.execute(stmt)).scalars().all())


async def get_quote(db: AsyncSession, workspace: Workspace, quote_id: str) -> Quote:
    return await _get_quote_or_404(db, workspace, quote_id)


async def create_quote(
    db: AsyncSession, workspace: Workspace, payload: QuoteCreate
) -> Quote:
    client = (
        await db.execute(
            select(Client).where(
                and_(
                    Client.id == payload.client_id,
                    Client.workspace_id == workspace.id,
                )
            )
        )
    ).scalar_one_or_none()
    if not client:
        raise NotFoundException(
            f"Client '{payload.client_id}' not found in this workspace"
        )

    seq = workspace.next_quote_number
    quote_number = f"{workspace.quote_prefix}{seq:04d}"
    workspace.next_quote_number = seq + 1

    issue_date = payload.issue_date or date.today()
    expires_at = payload.expires_at
    if not expires_at:
        validity = payload.validity_days if payload.validity_days is not None else 14
        expires_at = issue_date + timedelta(days=validity)

    totals = calculate_invoice_totals(
        items=[
            {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
            for it in payload.items
        ],
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
        version=1,
    )
    db.add(quote_obj)
    await db.flush()

    for i, it in enumerate(payload.items):
        db.add(
            QuoteLineItem(
                quote_id=quote_obj.id,
                position=i,
                description=it.description,
                quantity=it.quantity,
                unit_price_minor=it.unit_price_minor,
                total_minor=it.quantity * it.unit_price_minor,
            )
        )

    await db.commit()
    await db.refresh(quote_obj)
    return quote_obj


async def finalize_quote(
    db: AsyncSession, workspace: Workspace, quote_id: str
) -> Quote:
    quote_obj = await _get_quote_or_404(db, workspace, quote_id)

    if cast(str, quote_obj.status) != "draft":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is '{quote_obj.status}' and cannot be finalized."
        )

    if not quote_obj.items or len(quote_obj.items) == 0:
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' must have at least one line item."
        )
    if (quote_obj.total_minor or 0) <= 0:
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' total must be greater than zero."
        )

    old_status = quote_obj.status
    quote_obj.status = "issued"
    _ensure_share_token(quote_obj)

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
    return quote_obj


async def revise_quote(
    db: AsyncSession,
    workspace: Workspace,
    quote_id: str,
    payload: QuoteReviseRequest,
) -> Quote:
    quote_obj = await _get_quote_or_404(db, workspace, quote_id)

    if quote_obj.status in {"accepted", "declined", "converted"}:
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is '{quote_obj.status}' and cannot be revised."
        )
    if quote_obj.status == "draft":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is a draft; update it directly with PATCH /quotes/{quote_id}."
        )
    if quote_obj.status not in {"issued", "sent", "viewed", "review_requested"}:
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is '{quote_obj.status}' and cannot be revised."
        )

    old_version = quote_obj.version or 1
    old_status = quote_obj.status

    # Preserve the previous version's commercial terms before mutation.
    revision = QuoteRevision(
        quote_id=quote_obj.id,
        version=old_version,
        client_id=quote_obj.client_id,
        client_name=quote_obj.client.name if quote_obj.client else None,
        currency=quote_obj.currency,
        issue_date=quote_obj.issue_date,
        expires_at=quote_obj.expires_at,
        notes=quote_obj.notes,
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
        items_snapshot=[
            {
                "id": item.id,
                "position": item.position,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price_minor": item.unit_price_minor,
                "total_minor": item.total_minor,
            }
            for item in (quote_obj.items or [])
        ],
        revised_reason=(payload.reason or "").strip() or None,
    )
    db.add(revision)

    if payload.client_id is not None:
        client = (
            await db.execute(
                select(Client).where(
                    and_(
                        Client.id == payload.client_id,
                        Client.workspace_id == workspace.id,
                    )
                )
            )
        ).scalar_one_or_none()
        if not client:
            raise NotFoundException(f"Client '{payload.client_id}' not found")
        quote_obj.client_id = client.id

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

    discount = (
        payload.discount_minor
        if payload.discount_minor is not None
        else quote_obj.discount_minor
    )
    tax_rate = (
        payload.tax_rate_percent
        if payload.tax_rate_percent is not None
        else quote_obj.tax_rate_percent
    )
    wht_rate = (
        payload.wht_rate_percent
        if payload.wht_rate_percent is not None
        else quote_obj.wht_rate_percent
    )
    deposit_pct = (
        payload.deposit_percentage
        if payload.deposit_percentage is not None
        else quote_obj.deposit_percentage
    )
    deposit_amt = (
        payload.deposit_amount_minor
        if payload.deposit_amount_minor is not None
        else quote_obj.deposit_amount_minor
    )

    if payload.items is not None:
        if not payload.items:
            raise BadRequestException("A quote must contain at least one line item.")
        quote_obj.items.clear()
        for position, item in enumerate(payload.items):
            quote_obj.items.append(
                QuoteLineItem(
                    quote_id=quote_obj.id,
                    position=position,
                    description=item.description,
                    quantity=item.quantity,
                    unit_price_minor=item.unit_price_minor,
                    total_minor=item.quantity * item.unit_price_minor,
                )
            )

    totals = calculate_invoice_totals(
        items=[
            {
                "quantity": item.quantity,
                "unit_price_minor": item.unit_price_minor,
            }
            for item in quote_obj.items
        ],
        discount_minor=discount,
        tax_percent=tax_rate,
        wht_percent=wht_rate,
        deposit_percent=deposit_pct or 0.0,
        deposit_amount_minor=deposit_amt,
    )
    _apply_totals(
        quote_obj,
        totals,
        discount=discount,
        tax_rate=tax_rate,
        wht_rate=wht_rate,
        deposit_pct=deposit_pct,
    )

    # A revision is a new draft version and must be finalized and shared again.
    quote_obj.version = old_version + 1
    quote_obj.last_revised_at = datetime.now(timezone.utc)
    quote_obj.status = "draft"

    # Invalidate the old public link and clear delivery/response state.
    quote_obj.share_token = None
    quote_obj.share_token_hash = None
    quote_obj.sent_at = None
    quote_obj.viewed_at = None
    quote_obj.email_delivery_status = None
    quote_obj.accepted_at = None
    quote_obj.accepted_by_name = None
    quote_obj.declined_at = None
    quote_obj.decline_reason = None
    quote_obj.review_requested_at = None
    quote_obj.review_reason = None

    record_status_event(
        db=db,
        workspace_id=workspace.id,
        document_type="quote",
        document_id=quote_obj.id,
        from_status=old_status,
        to_status="draft",
        actor_type="issuer",
        actor_id=workspace.owner_id,
        source="issuer_revise",
        metadata={
            "from_version": old_version,
            "to_version": quote_obj.version,
            "reason": revision.revised_reason,
        },
    )

    await db.commit()
    await db.refresh(quote_obj)
    return quote_obj


async def update_quote(
    db: AsyncSession,
    workspace: Workspace,
    quote_id: str,
    payload: QuoteUpdate,
) -> Quote:
    quote_obj = await _get_quote_or_404(db, workspace, quote_id)

    if quote_obj.status != "draft":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is '{quote_obj.status}' "
            "and cannot be edited in place. Create a revision instead."
        )

    if payload.client_id is not None:
        client = (
            await db.execute(
                select(Client).where(
                    and_(
                        Client.id == payload.client_id,
                        Client.workspace_id == workspace.id,
                    )
                )
            )
        ).scalar_one_or_none()
        if not client:
            raise NotFoundException(f"Client '{payload.client_id}' not found")
        quote_obj.client_id = client.id

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

    discount = (
        payload.discount_minor
        if payload.discount_minor is not None
        else quote_obj.discount_minor
    )
    tax_rate = (
        payload.tax_rate_percent
        if payload.tax_rate_percent is not None
        else quote_obj.tax_rate_percent
    )
    wht_rate = (
        payload.wht_rate_percent
        if payload.wht_rate_percent is not None
        else quote_obj.wht_rate_percent
    )
    deposit_pct = (
        payload.deposit_percentage
        if payload.deposit_percentage is not None
        else quote_obj.deposit_percentage
    )
    deposit_amt = (
        payload.deposit_amount_minor
        if payload.deposit_amount_minor is not None
        else quote_obj.deposit_amount_minor
    )

    if payload.items is not None:
        quote_obj.items.clear()
        for i, it in enumerate(payload.items):
            quote_obj.items.append(
                QuoteLineItem(
                    quote_id=quote_obj.id,
                    position=i,
                    description=it.description,
                    quantity=it.quantity,
                    unit_price_minor=it.unit_price_minor,
                    total_minor=it.quantity * it.unit_price_minor,
                )
            )

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
    _apply_totals(
        quote_obj,
        totals,
        discount=discount,
        tax_rate=tax_rate,
        wht_rate=wht_rate,
        deposit_pct=deposit_pct,
    )

    await db.commit()
    await db.refresh(quote_obj)
    return quote_obj


async def send_quote(
    db: AsyncSession,
    workspace: Workspace,
    quote_id: str,
    *,
    send_email: bool = False,
) -> SendQuoteOutcome:
    quote_obj = await _get_quote_or_404(db, workspace, quote_id)

    if quote_obj.status == "draft":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is a draft and cannot be sent. "
            f"Finalize it first with POST /quotes/{quote_id}/finalize."
        )
    if quote_obj.status not in {"issued", "sent", "viewed"}:
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is '{quote_obj.status}' and cannot be sent."
        )

    client = quote_obj.client
    recipient_email = client.email if client else None
    _ensure_share_token(quote_obj)
    share_url = f"{settings.WEB_BASE_URL}/q/{quote_obj.share_token}"

    email_sent = False
    if send_email:
        if recipient_email:
            await check_delivery_quota(workspace, db)
            email_sent = await EmailSender().send_quote_email(
                to_email=recipient_email,
                quote_number=quote_obj.quote_number,
                share_url=share_url,
                business_name=workspace.business_name,
                client_name=client.name if client else None,
                formatted_total=format_money(quote_obj.total_minor, quote_obj.currency),
                expires_at=quote_obj.expires_at.strftime("%d %b %Y"),
            )
            if email_sent:
                quote_obj.email_delivery_status = "delivered"
                await consume_delivery_send(workspace, db)
            else:
                quote_obj.email_delivery_status = "failed"
        else:
            quote_obj.email_delivery_status = "no_email"

    old_status = quote_obj.status
    if quote_obj.status in {"issued", "sent"}:
        quote_obj.status = "sent"
    quote_obj.sent_at = datetime.now(timezone.utc)

    if old_status != quote_obj.status:
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
    return SendQuoteOutcome(
        quote=quote_obj,
        email_sent=email_sent,
        recipient_email=recipient_email,
        share_url=share_url,
    )


async def convert_quote_to_invoice(
    db: AsyncSession, workspace: Workspace, quote_id: str
):
    row = (
        await db.execute(
            select(Quote, Client)
            .join(Client, Quote.client_id == Client.id)
            .where(and_(Quote.id == quote_id, Quote.workspace_id == workspace.id))
        )
    ).first()
    if not row:
        raise NotFoundException(f"Quote '{quote_id}' not found")

    quote_obj, client = row

    if quote_obj.status != "accepted":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' must be 'accepted' before conversion "
            f"(current: {quote_obj.status})."
        )

    existing_invoice = await invoices_service.get_invoice_by_quote_id(
        db, workspace, quote_obj.id
    )
    if existing_invoice is not None:
        return existing_invoice, client

    invoice = await invoices_service.create_draft_invoice_from_quote(
        db, workspace, quote_obj
    )

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
    return invoice, client


async def view_public_quote(
    db: AsyncSession, token: str
) -> tuple[Quote, Optional[str], Workspace]:
    row = (
        await db.execute(
            select(Quote, Client.name.label("client_name"), Workspace)
            .join(Client, Quote.client_id == Client.id, isouter=True)
            .join(Workspace, Quote.workspace_id == Workspace.id)
            .where(Quote.share_token == token)
        )
    ).first()
    if not row:
        raise NotFoundException("Quote not found or invalid link")

    quote_obj, client_name, workspace = row

    if quote_obj.status == "draft":
        raise NotFoundException("Quote not found or invalid link")

    if quote_obj.status == "sent":
        quote_obj.status = "viewed"
        quote_obj.viewed_at = datetime.now(timezone.utc)
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

    return quote_obj, client_name, workspace


async def accept_public_quote(
    db: AsyncSession,
    token: str,
    payload: QuoteAcceptRequest,
) -> tuple[Quote, Optional[str], Workspace]:
    row = (
        await db.execute(
            select(Quote, Client.name.label("client_name"), Workspace)
            .join(Client, Quote.client_id == Client.id, isouter=True)
            .join(Workspace, Quote.workspace_id == Workspace.id)
            .where(Quote.share_token == token)
        )
    ).first()
    if not row:
        raise NotFoundException("Quote not found or invalid link")

    quote_obj, client_name, workspace = row

    if quote_obj.status == "draft":
        raise NotFoundException("Quote not found or invalid link")
    if quote_obj.status == "review_requested":
        raise BadRequestException(
            "The issuer is revising this quote. Please wait for the updated version."
        )
    if quote_obj.status == "converted":
        raise BadRequestException(
            "This quote has already been accepted and converted into an invoice."
        )
    if quote_obj.status == "declined":
        raise BadRequestException(
            "This quote was previously declined. Please request a new quote."
        )
    if quote_obj.expires_at < date.today():
        raise BadRequestException(
            "This quote has expired. Please contact the freelancer for an updated quote."
        )

    if payload.version != quote_obj.version:
        raise BadRequestException(
            f"This quote has been revised to v{quote_obj.version}; you are accepting "
            f"v{payload.version}. Please refresh and accept the latest version."
        )

    changed = False
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
        changed = True

    invoice = await invoices_service.get_invoice_by_quote_id(
        db, workspace, quote_obj.id
    )
    if invoice is None:
        invoice = await invoices_service.create_draft_invoice_from_quote(
            db, workspace, quote_obj
        )
        quote_obj.invoice_id = invoice.id
        changed = True

    if changed:
        await db.commit()
        await db.refresh(quote_obj)
        if invoice is not None:
            await db.refresh(invoice)

    return quote_obj, client_name, workspace


async def decline_public_quote(
    db: AsyncSession,
    token: str,
    payload: QuoteDeclineRequest,
) -> tuple[Quote, Optional[str], Workspace]:
    row = (
        await db.execute(
            select(Quote, Client.name.label("client_name"), Workspace)
            .join(Client, Quote.client_id == Client.id, isouter=True)
            .join(Workspace, Quote.workspace_id == Workspace.id)
            .where(Quote.share_token == token)
        )
    ).first()
    if not row:
        raise NotFoundException("Quote not found or invalid link")

    quote_obj, client_name, workspace = row

    if quote_obj.status == "draft":
        raise NotFoundException("Quote not found or invalid link")

    if quote_obj.status == "review_requested":
        raise BadRequestException(
            "The issuer is revising this quote. Please wait for the updated version."
        )

    if quote_obj.status in {"accepted", "converted"}:
        raise BadRequestException(
            "This quote has already been accepted and cannot be declined."
        )

    if quote_obj.status == "declined":
        raise BadRequestException("This quote has already been declined.")

    if quote_obj.expires_at < date.today():
        raise BadRequestException(
            "This quote has expired and can no longer be declined."
        )

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
    return quote_obj, client_name, workspace

async def request_quote_review(
    db: AsyncSession,
    token: str,
    payload: QuoteReviewRequest,
) -> tuple[Quote, Optional[str], Workspace]:
    row = (
        await db.execute(
            select(Quote, Client.name.label("client_name"), Workspace)
            .join(Client, Quote.client_id == Client.id, isouter=True)
            .join(Workspace, Quote.workspace_id == Workspace.id)
            .where(Quote.share_token == token)
        )
    ).first()
    if not row:
        raise NotFoundException("Quote not found or invalid link")

    quote_obj, client_name, workspace = row

    if quote_obj.status == "draft":
        raise NotFoundException("Quote not found or invalid link")

    if quote_obj.status in {"accepted", "declined", "converted"}:
        raise BadRequestException(
            f"Cannot request changes on a {quote_obj.status} quote."
        )

    if quote_obj.expires_at < date.today():
        raise BadRequestException(
            "This quote has expired. Please contact the issuer for an updated quote."
        )

    if quote_obj.status == "review_requested":
        return quote_obj, client_name, workspace

    old_status = quote_obj.status
    quote_obj.status = "review_requested"
    quote_obj.review_requested_at = datetime.now(timezone.utc)
    quote_obj.review_reason = (payload.reason or "").strip() or None

    record_status_event(
        db=db,
        workspace_id=quote_obj.workspace_id,
        document_type="quote",
        document_id=quote_obj.id,
        from_status=old_status,
        to_status="review_requested",
        actor_type="client",
        source="client_request_review",
        metadata={"reason": quote_obj.review_reason},
    )

    await db.commit()
    await db.refresh(quote_obj)
    return quote_obj, client_name, workspace


async def list_quote_revisions(
    db: AsyncSession,
    workspace: Workspace,
    quote_id: str,
) -> list[QuoteRevision]:
    await _get_quote_or_404(db, workspace, quote_id)

    rows = (
        (
            await db.execute(
                select(QuoteRevision)
                .where(QuoteRevision.quote_id == quote_id)
                .order_by(QuoteRevision.version.desc())
            )
        )
        .scalars()
        .all()
    )

    return list(rows)


async def post_public_quote_comment(
    db: AsyncSession,
    token: str,
    payload: QuoteCommentCreate,
) -> tuple[QuoteComment, Quote, Workspace, Optional[str]]:
    row = (
        await db.execute(
            select(Quote, Workspace)
            .join(Workspace, Quote.workspace_id == Workspace.id)
            .where(Quote.share_token == token)
        )
    ).first()
    if not row:
        raise NotFoundException("Quote not found or invalid link")

    quote_obj, workspace = row

    if quote_obj.status == "draft":
        raise NotFoundException("Quote not found or invalid link")

    if quote_obj.status in {"accepted", "declined", "converted"}:
        raise BadRequestException(
            "This quote is closed and no longer accepts comments."
        )

    item_description: Optional[str] = None
    if payload.line_item_id:
        item = next(
            (item for item in (quote_obj.items or []) if item.id == payload.line_item_id),
            None,
        )
        if item is None:
            raise BadRequestException("That line item does not belong to this quote.")
        item_description = item.description

    comment = QuoteComment(
        quote_id=quote_obj.id,
        line_item_id=payload.line_item_id,
        author_name=payload.author_name.strip(),
        message=payload.message.strip(),
        is_from_client=True,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment, quote_obj, workspace, item_description


async def list_quote_comments(
    db: AsyncSession,
    workspace: Workspace,
    quote_id: str,
) -> list[QuoteComment]:
    await _get_quote_or_404(db, workspace, quote_id)
    rows = (
        await db.execute(
            select(QuoteComment)
            .where(QuoteComment.quote_id == quote_id)
            .order_by(QuoteComment.created_at.asc())
        )
    ).scalars().all()
    return list(rows)
