from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import BadRequestException, NotFoundException
from app.core.money import calculate_invoice_totals
from app.core.security import generate_share_token
from app.domains.billing.service import check_delivery_quota, consume_delivery_send
from app.domains.clients.models import Client
from app.domains.invoices.models import Invoice, InvoiceLineItem, InvoiceRevision
from app.domains.invoices.schemas import InvoiceCreate, InvoiceReviseRequest, InvoiceUpdate
from app.domains.lifecycle.service import list_status_events, record_status_event
from app.domains.payments.models import PaymentClaim, PaymentProfile
from app.domains.quotes.models import Quote
from app.domains.receipts.service import confirm_payment
from app.domains.reminders.service import schedule_invoice_reminders
from app.domains.workspaces.models import Workspace
from app.integrations.email import EmailSender


@dataclass
class SendInvoiceOutcome:
    invoice: Invoice
    client: Client
    email_sent: bool
    recipient_email: Optional[str]
    share_url: str


async def _get_invoice_or_404(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> Invoice:
    stmt = select(Invoice).where(
        and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
    )
    invoice = (await db.execute(stmt)).scalar_one_or_none()
    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")
    return invoice


async def _get_claim_or_404(
    db: AsyncSession, invoice: Invoice, claim_id: str
) -> PaymentClaim:
    stmt = select(PaymentClaim).where(
        and_(PaymentClaim.id == claim_id, PaymentClaim.invoice_id == invoice.id)
    )
    claim = (await db.execute(stmt)).scalar_one_or_none()
    if not claim:
        raise NotFoundException(f"Payment claim '{claim_id}' not found")
    return claim


def _ensure_share_token(invoice: Invoice) -> None:
    if not invoice.share_token:
        raw_token, token_hash = generate_share_token()
        invoice.share_token = raw_token
        invoice.share_token_hash = token_hash


def _apply_totals(invoice: Invoice, totals: dict, *, discount, tax_rate, wht_rate, deposit_pct) -> None:
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


async def _replace_items(db: AsyncSession, invoice: Invoice, items) -> None:
    existing = (
        await db.execute(
            select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id)
        )
    ).scalars().all()
    for item in existing:
        await db.delete(item)

    for i, it in enumerate(items):
        db.add(
            InvoiceLineItem(
                invoice_id=invoice.id,
                position=i,
                description=it.description,
                quantity=it.quantity,
                unit_price_minor=it.unit_price_minor,
                total_minor=it.quantity * it.unit_price_minor,
            )
        )


async def list_invoices(
    db: AsyncSession,
    workspace: Workspace,
    *,
    client_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    currency: Optional[str] = None,
) -> list[Invoice]:
    conditions = [Invoice.workspace_id == workspace.id]
    if client_id:
        conditions.append(Invoice.client_id == client_id)

    if status_filter:
        status = status_filter.lower().strip()
        if status == "overdue":
            today = date.today()
            payable = func.coalesce(
                func.nullif(Invoice.net_payable_minor, 0), Invoice.total_minor
            )
            conditions.append(Invoice.due_date < today)
            conditions.append(
                Invoice.status.in_(
                    ["sent", "viewed", "payment_claimed", "partially_paid"]
                )
            )
            conditions.append(payable > func.coalesce(Invoice.amount_paid_minor, 0))
        elif status == "void":
            conditions.append(Invoice.status == "cancelled")
        else:
            conditions.append(Invoice.status == status)

    if currency:
        conditions.append(Invoice.currency == currency.upper().strip())

    stmt = (
        select(Invoice)
        .where(and_(*conditions))
        .order_by(desc(Invoice.sequence_number), desc(Invoice.created_at))
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_invoice(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> Invoice:
    return await _get_invoice_or_404(db, workspace, invoice_id)


async def get_currency_metrics(
    db: AsyncSession, workspace: Workspace
) -> list[dict]:
    invoices = (
        await db.execute(select(Invoice).where(Invoice.workspace_id == workspace.id))
    ).scalars().all()

    today = date.today()
    first_of_month = date(today.year, today.month, 1)
    metrics_by_currency: dict[str, dict] = {}

    def empty_metrics(currency: str) -> dict:
        return {
            "currency": currency,
            "outstanding_minor": 0,
            "overdue_minor": 0,
            "paid_this_month_minor": 0,
            "invoices_count": 0,
            "draft_count": 0,
            "issued_count": 0,
            "sent_count": 0,
            "viewed_count": 0,
            "claimed_count": 0,
            "partially_paid_count": 0,
            "paid_count": 0,
            "overdue_count": 0,
            "cancelled_count": 0,
        }

    for inv in invoices:
        metrics_by_currency.setdefault(inv.currency, empty_metrics(inv.currency))
        metrics = metrics_by_currency[inv.currency]
        metrics["invoices_count"] += 1

        target_payable = (
            inv.net_payable_minor
            if (inv.net_payable_minor and inv.net_payable_minor > 0)
            else inv.total_minor
        )
        unpaid_balance = max(0, target_payable - (inv.amount_paid_minor or 0))

        status_count_key = {
            "draft": "draft_count",
            "issued": "issued_count",
            "sent": "sent_count",
            "viewed": "viewed_count",
            "payment_claimed": "claimed_count",
            "partially_paid": "partially_paid_count",
            "paid": "paid_count",
            "cancelled": "cancelled_count",
        }.get(inv.status)
        if status_count_key:
            metrics[status_count_key] += 1

        if inv.status in ["sent", "viewed", "payment_claimed", "partially_paid"]:
            metrics["outstanding_minor"] += unpaid_balance

        if inv.status in ["sent", "viewed"] and inv.due_date and inv.due_date < today:
            metrics["overdue_minor"] += unpaid_balance
            metrics["overdue_count"] += 1

        if (inv.amount_paid_minor or 0) > 0 and inv.status in [
            "partially_paid",
            "paid",
        ]:
            invoice_date = inv.updated_at.date() if inv.updated_at else inv.issue_date
            if invoice_date and invoice_date >= first_of_month:
                metrics["paid_this_month_minor"] += inv.amount_paid_minor

    profile_currencies = (
        await db.execute(
            select(PaymentProfile.currency)
            .where(PaymentProfile.workspace_id == workspace.id)
            .distinct()
        )
    ).scalars().all()
    for currency in profile_currencies:
        metrics_by_currency.setdefault(currency, empty_metrics(currency))

    if not metrics_by_currency:
        metrics_by_currency["NGN"] = empty_metrics("NGN")

    return list(metrics_by_currency.values())


async def create_invoice(
    db: AsyncSession, workspace: Workspace, payload: InvoiceCreate
) -> Invoice:
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

    seq = workspace.next_invoice_number
    invoice_number = f"{workspace.invoice_prefix}{seq:04d}"
    workspace.next_invoice_number = seq + 1

    issue_date = payload.issue_date or date.today()
    due_date = payload.due_date
    if not due_date:
        terms_days = client.default_payment_terms_days or 14
        due_date = issue_date + timedelta(days=terms_days)

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
        db.add(
            InvoiceLineItem(
                invoice_id=invoice.id,
                position=i,
                description=it.description,
                quantity=it.quantity,
                unit_price_minor=it.unit_price_minor,
                total_minor=it.quantity * it.unit_price_minor,
            )
        )

    await db.commit()
    await db.refresh(invoice)
    return invoice


async def update_draft_invoice(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
    payload: InvoiceUpdate,
) -> Invoice:
    invoice = await _get_invoice_or_404(db, workspace, invoice_id)
    if invoice.status != "draft":
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number}' is '{invoice.status}' and cannot be directly modified. "
            "Sent invoices are immutable. Create a revision."
        )

    recalc = (
        payload.items is not None
        or payload.discount_minor is not None
        or payload.tax_rate_percent is not None
        or payload.wht_rate_percent is not None
        or payload.deposit_percentage is not None
        or payload.deposit_amount_minor is not None
    )

    discount = (
        payload.discount_minor
        if payload.discount_minor is not None
        else invoice.discount_minor
    )
    tax_rate = (
        payload.tax_rate_percent
        if payload.tax_rate_percent is not None
        else invoice.tax_rate_percent
    )
    wht_rate = (
        payload.wht_rate_percent
        if payload.wht_rate_percent is not None
        else (invoice.wht_rate_percent or 0.0)
    )
    deposit_pct = (
        payload.deposit_percentage
        if payload.deposit_percentage is not None
        else invoice.deposit_percentage
    )
    deposit_amt = (
        payload.deposit_amount_minor
        if payload.deposit_amount_minor is not None
        else invoice.deposit_amount_minor
    )

    if payload.items is not None:
        await _replace_items(db, invoice, payload.items)

    if payload.items is not None or recalc:
        items = (
            payload.items
            if payload.items is not None
            else (invoice.items or [])
        )
        totals = calculate_invoice_totals(
            items=[
                {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
                for it in items
            ],
            discount_minor=discount,
            tax_percent=tax_rate,
            wht_percent=wht_rate,
            deposit_percent=deposit_pct or 0.0,
            deposit_amount_minor=deposit_amt,
        )
        _apply_totals(
            invoice,
            totals,
            discount=discount,
            tax_rate=tax_rate,
            wht_rate=wht_rate,
            deposit_pct=deposit_pct,
        )

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
    return invoice


async def finalize_invoice(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> tuple[Invoice, Client]:
    invoice = await _get_invoice_or_404(db, workspace, invoice_id)
    if invoice.status != "draft":
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' is '{invoice.status}' and cannot be finalized."
        )

    client = (
        await db.execute(
            select(Client).where(
                and_(
                    Client.id == invoice.client_id,
                    Client.workspace_id == workspace.id,
                )
            )
        )
    ).scalar_one_or_none()
    if not client:
        raise NotFoundException(
            f"Client '{invoice.client_id}' not found in this workspace"
        )

    items = (
        await db.execute(
            select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id)
        )
    ).scalars().all()
    if not items:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' must have at least one line item."
        )
    if sum(it.total_minor for it in items) <= 0:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' total must be greater than zero."
        )

    issue_date = invoice.issue_date or date.today()
    if not invoice.due_date:
        terms_days = client.default_payment_terms_days or 14
        invoice.due_date = issue_date + timedelta(days=terms_days)
    invoice.issue_date = issue_date

    seq = workspace.next_invoice_number
    workspace.next_invoice_number = seq + 1

    old_status = invoice.status
    invoice.status = "issued"
    invoice.invoice_number = f"{workspace.invoice_prefix}{seq:04d}"
    invoice.sequence_number = seq
    _ensure_share_token(invoice)

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

    if invoice.quote_id:
        quote_obj = (
            await db.execute(
                select(Quote).where(
                    and_(
                        Quote.id == invoice.quote_id,
                        Quote.workspace_id == workspace.id,
                    )
                )
            )
        ).scalar_one_or_none()
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
                metadata={
                    "invoice_id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                },
            )

    await db.commit()
    await db.refresh(invoice)
    return invoice, client


async def send_invoice(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
    *,
    send_email: bool = True,
) -> SendInvoiceOutcome:
    row = (
        await db.execute(
            select(Invoice, Client)
            .join(Client, Invoice.client_id == Client.id)
            .where(
                and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
            )
        )
    ).first()
    if not row:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    invoice, client = row
    if invoice.status == "draft":
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' is a draft and cannot be sent. "
            "Finalize it first with POST /invoices/{id}/finalize."
        )
    if invoice.status not in {"issued", "sent", "viewed"}:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' is '{invoice.status}' and cannot be sent."
        )

    _ensure_share_token(invoice)
    share_url = f"{settings.WEB_BASE_URL}/i/{invoice.share_token}"

    recipient_email = client.email
    email_sent = False
    if send_email:
        if recipient_email:
            await check_delivery_quota(workspace, db)
            email_sent = await EmailSender().send_invoice_email(
                to_email=recipient_email,
                invoice_number=invoice.invoice_number,
                share_url=share_url,
            )
            if email_sent:
                invoice.email_delivery_status = "delivered"
                await consume_delivery_send(workspace, db)
            else:
                invoice.email_delivery_status = "failed"
        else:
            invoice.email_delivery_status = "no_email"

    old_status = invoice.status
    if invoice.status in {"issued", "sent"}:
        invoice.status = "sent"
    invoice.sent_at = datetime.now(timezone.utc)

    if old_status != invoice.status:
        record_status_event(
            db=db,
            workspace_id=workspace.id,
            document_type="invoice",
            document_id=invoice.id,
            from_status=old_status,
            to_status=invoice.status,
            actor_type="issuer",
            actor_id=workspace.owner_id,
            source="issuer_send",
        )

    await db.commit()
    await db.refresh(invoice)
    await schedule_invoice_reminders(invoice, db)

    return SendInvoiceOutcome(
        invoice=invoice,
        client=client,
        email_sent=email_sent,
        recipient_email=recipient_email,
        share_url=share_url,
    )


async def regenerate_share_link(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> Invoice:
    invoice = await _get_invoice_or_404(db, workspace, invoice_id)
    raw_token, token_hash = generate_share_token()
    invoice.share_token = raw_token
    invoice.share_token_hash = token_hash
    await db.commit()
    await db.refresh(invoice)
    return invoice


async def revise_invoice(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
    payload: InvoiceReviseRequest,
) -> Invoice:
    invoice = await _get_invoice_or_404(db, workspace, invoice_id)

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
        items_snapshot=[
            {
                "position": it.position,
                "description": it.description,
                "quantity": it.quantity,
                "unit_price_minor": it.unit_price_minor,
                "total_minor": it.total_minor,
            }
            for it in (invoice.items or [])
        ],
        revised_reason=payload.reason,
    )
    db.add(revision)

    invoice.version += 1
    invoice.last_revised_at = datetime.now(timezone.utc)

    await _replace_items(db, invoice, payload.items)

    discount = (
        payload.discount_minor
        if payload.discount_minor is not None
        else invoice.discount_minor
    )
    tax_rate = (
        payload.tax_rate_percent
        if payload.tax_rate_percent is not None
        else invoice.tax_rate_percent
    )
    wht_rate = (
        payload.wht_rate_percent
        if payload.wht_rate_percent is not None
        else (invoice.wht_rate_percent or 0.0)
    )
    deposit_pct = (
        payload.deposit_percentage
        if payload.deposit_percentage is not None
        else invoice.deposit_percentage
    )
    deposit_amt = (
        payload.deposit_amount_minor
        if payload.deposit_amount_minor is not None
        else invoice.deposit_amount_minor
    )

    totals = calculate_invoice_totals(
        items=[
            {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
            for it in payload.items
        ],
        discount_minor=discount,
        tax_percent=tax_rate,
        wht_percent=wht_rate,
        deposit_percent=deposit_pct or 0.0,
        deposit_amount_minor=deposit_amt,
    )
    _apply_totals(
        invoice,
        totals,
        discount=discount,
        tax_rate=tax_rate,
        wht_rate=wht_rate,
        deposit_pct=deposit_pct,
    )
    if payload.notes is not None:
        invoice.notes = payload.notes

    await db.commit()
    await db.refresh(invoice)
    return invoice


async def list_invoice_revisions(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> list[InvoiceRevision]:
    stmt = (
        select(InvoiceRevision)
        .join(Invoice, InvoiceRevision.invoice_id == Invoice.id)
        .where(
            and_(Invoice.id == invoice_id, Invoice.workspace_id == workspace.id)
        )
        .order_by(desc(InvoiceRevision.version))
    )
    return list((await db.execute(stmt)).scalars().all())


async def delete_draft_invoice(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> None:
    invoice = await _get_invoice_or_404(db, workspace, invoice_id)
    if invoice.status != "draft":
        raise BadRequestException("Cannot delete an invoice that has been sent or finalized.")
    await db.delete(invoice)
    await db.commit()


async def list_invoice_status_events(
    db: AsyncSession, workspace: Workspace, invoice_id: str
):
    await _get_invoice_or_404(db, workspace, invoice_id)
    return await list_status_events(db, workspace.id, "invoice", invoice_id)


async def list_invoice_claims(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> list[PaymentClaim]:
    invoice = await _get_invoice_or_404(db, workspace, invoice_id)
    stmt = (
        select(PaymentClaim)
        .where(PaymentClaim.invoice_id == invoice.id)
        .order_by(PaymentClaim.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def confirm_payment_claim(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
    claim_id: str,
    payload,
    *,
    confirmed_by_user_id: str,
) -> PaymentClaim:
    # Lock the invoice first so all payment and claim-confirmation paths
    # serialize on the same financial record.
    invoice = (
        await db.execute(
            select(Invoice)
            .where(
                and_(
                    Invoice.id == invoice_id,
                    Invoice.workspace_id == workspace.id,
                )
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()

    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    # Reload claim status after acquiring the invoice lock. A concurrent
    # request may already have confirmed or rejected this claim.
    claim = (
        await db.execute(
            select(PaymentClaim)
            .where(
                and_(
                    PaymentClaim.id == claim_id,
                    PaymentClaim.invoice_id == invoice.id,
                )
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()

    if not claim:
        raise NotFoundException(f"Payment claim '{claim_id}' not found")

    if claim.status != "pending":
        raise BadRequestException(
            f"Payment claim '{claim_id}' is already '{claim.status}'"
        )

    confirmed_amount = (
        payload.amount_paid_minor
        if payload and payload.amount_paid_minor is not None
        else claim.amount_minor
    )

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
        confirmed_by_user_id=confirmed_by_user_id,
        provider="bank",
    )

    claim.status = "confirmed"
    claim.confirmed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(claim)
    return claim

async def reject_payment_claim(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
    claim_id: str,
    payload,
) -> PaymentClaim:
    invoice = await _get_invoice_or_404(db, workspace, invoice_id)
    claim = await _get_claim_or_404(db, invoice, claim_id)
    if claim.status != "pending":
        raise BadRequestException(
            f"Payment claim '{claim_id}' is already '{claim.status}'"
        )

    claim.status = "rejected"
    claim.rejection_reason = payload.rejection_reason

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


async def update_wht_credit_note(
    db: AsyncSession, workspace: Workspace, invoice_id: str, payload
) -> Invoice:
    invoice = await _get_invoice_or_404(db, workspace, invoice_id)
    invoice.wht_credit_note_number = payload.wht_credit_note_number.strip()
    await db.commit()
    await db.refresh(invoice)
    return invoice


async def get_invoice_by_quote_id(
    db: AsyncSession, workspace: Workspace, quote_id: str
) -> Optional[Invoice]:
    stmt = select(Invoice).where(
        and_(Invoice.quote_id == quote_id, Invoice.workspace_id == workspace.id)
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def create_draft_invoice_from_quote(
    db: AsyncSession,
    workspace: Workspace,
    quote_obj: Quote,
    *,
    commit: bool = False,
) -> Invoice:
    raw_token, token_hash = generate_share_token()
    invoice = Invoice(
        workspace_id=workspace.id,
        client_id=quote_obj.client_id,
        invoice_number=None,
        sequence_number=None,
        currency=quote_obj.currency,
        status="draft",
        issue_date=None,
        due_date=None,
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
        db.add(
            InvoiceLineItem(
                invoice_id=invoice.id,
                position=item.position,
                description=item.description,
                quantity=item.quantity,
                unit_price_minor=item.unit_price_minor,
                total_minor=item.total_minor,
            )
        )

    if commit:
        await db.commit()
        await db.refresh(invoice)
    return invoice
