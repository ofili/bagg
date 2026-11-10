from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import BadRequestException, NotFoundException
from app.core.money import calculate_invoice_totals
from app.core.security import generate_share_token
from app.domains.billing.service import (
    check_delivery_quota,
    consume_delivery_send,
)
from app.domains.clients.models import Client
from app.domains.documents.delivery import DocumentDeliveryStatus
from app.domains.invoices.models import Invoice, InvoiceLineItem, InvoiceRevision
from app.domains.invoices.repository import InvoiceRepository
from app.domains.invoices.recall_service import InvoiceRecallService
from app.domains.invoices.schemas import InvoiceCreate, InvoiceReviseRequest, InvoiceUpdate
from app.domains.lifecycle.service import list_status_events, record_status_event
from app.domains.payments.models import PaymentClaim
from app.domains.quotes.models import Quote
from app.domains.receipts.service import confirm_payment
from app.domains.reminders.service import schedule_invoice_reminders
from app.domains.workspaces.models import Workspace
from app.integrations.email import build_invoice_email_payload
from app.integrations.email_outbox import (
    enqueue_email,
    get_active_document_email,
    should_meter_document_send,
)

@dataclass
class SendInvoiceOutcome:
    invoice: Invoice
    client: Client
    email_sent: bool
    email_queued: bool
    recipient_email: Optional[str]
    share_url: str


async def _get_invoice_or_404(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> Invoice:
    invoice = await InvoiceRepository(db).get(workspace.id, invoice_id)
    if invoice is None:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")
    return invoice


async def _get_claim_or_404(
    db: AsyncSession, invoice: Invoice, claim_id: str
) -> PaymentClaim:
    claim = await InvoiceRepository(db).get_claim(invoice.id, claim_id)
    if claim is None:
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
    repository = InvoiceRepository(db)
    await repository.delete_items(invoice.id)
    repository.add_all([
        InvoiceLineItem(
            invoice_id=invoice.id,
            position=position,
            description=item.description,
            quantity=item.quantity,
            unit_price_minor=item.unit_price_minor,
            total_minor=item.quantity * item.unit_price_minor,
        )
        for position, item in enumerate(items)
    ])


async def list_invoices(
    db: AsyncSession,
    workspace: Workspace,
    *,
    client_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    currency: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "sequence_number",
    sort_order: str = "desc",
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[Invoice], int]:
    return await InvoiceRepository(db).list_page(
        workspace.id, client_id=client_id, status_filter=status_filter,
        currency=currency, search=search, sort_by=sort_by,
        sort_order=sort_order, page=page, per_page=per_page,
    )


async def get_invoice(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> Invoice:
    return await _get_invoice_or_404(db, workspace, invoice_id)


async def get_currency_metrics(
    db: AsyncSession, workspace: Workspace
) -> list[dict]:
    repository = InvoiceRepository(db)
    invoices = await repository.list_for_metrics(workspace.id)

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

        if inv.status in ["issued", "sent", "viewed", "payment_claimed", "partially_paid"]:
            metrics["outstanding_minor"] += unpaid_balance

        if inv.status in ["issued", "sent", "viewed", "payment_claimed", "partially_paid"] and inv.due_date and inv.due_date < today:
            metrics["overdue_minor"] += unpaid_balance
            metrics["overdue_count"] += 1

    paid_totals = await repository.get_paid_totals_by_currency_since(
        workspace.id, first_of_month
    )
    for currency, amount_minor in paid_totals.items():
        metrics_by_currency.setdefault(currency, empty_metrics(currency))
        metrics_by_currency[currency]["paid_this_month_minor"] = amount_minor

    profile_currencies = await repository.list_profile_currencies(workspace.id)
    for currency in profile_currencies:
        metrics_by_currency.setdefault(currency, empty_metrics(currency))

    if not metrics_by_currency:
        metrics_by_currency["NGN"] = empty_metrics("NGN")

    return list(metrics_by_currency.values())


async def create_invoice(
    db: AsyncSession,
    workspace: Workspace,
    payload: InvoiceCreate,
) -> Invoice:
    repository = InvoiceRepository(db)
    client = await repository.get_client(workspace.id, payload.client_id)

    if not client:
        raise NotFoundException(
            f"Client '{payload.client_id}' not found in this workspace"
        )

    if payload.payment_profile_id:
        profile = await repository.get_payment_profile(
            workspace.id, payload.payment_profile_id
        )
        if profile is None:
            raise NotFoundException("Payment profile not found in this workspace")
        if profile.currency.upper() != payload.currency.upper():
            raise BadRequestException(
                "Payment profile currency must match the invoice currency."
            )

    issue_date = payload.issue_date or date.today()
    due_date = payload.due_date

    if not due_date:
        terms_days = client.default_payment_terms_days or 14
        due_date = issue_date + timedelta(days=terms_days)
    if due_date < issue_date:
        raise BadRequestException("Invoice due date cannot be earlier than its issue date.")

    totals = calculate_invoice_totals(
        items=[
            {
                "quantity": item.quantity,
                "unit_price_minor": item.unit_price_minor,
            }
            for item in payload.items
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

        # Invoice numbers are allocated only when the invoice is issued.
        invoice_number=None,
        sequence_number=None,

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

    repository.add(invoice)
    await repository.flush()

    repository.add_all([
            InvoiceLineItem(
                invoice_id=invoice.id,
                position=position,
                description=item.description,
                quantity=item.quantity,
                unit_price_minor=item.unit_price_minor,
                total_minor=item.quantity * item.unit_price_minor,
            )
            for position, item in enumerate(payload.items)
        ])

    await db.commit()
    await repository.refresh(invoice)

    return invoice


async def update_draft_invoice(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
    payload: InvoiceUpdate,
) -> Invoice:
    invoice = await InvoiceRepository(db).get_for_update(workspace.id, invoice_id)
    if invoice is None:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")
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
    repository = InvoiceRepository(db)
    if payload.client_id:
        client = await repository.get_client(workspace.id, payload.client_id)
        if client is None:
            raise NotFoundException(
                f"Client '{payload.client_id}' not found in this workspace"
            )
        invoice.client_id = client.id
    effective_issue_date = payload.issue_date or invoice.issue_date
    effective_due_date = payload.due_date or invoice.due_date
    if effective_issue_date and effective_due_date and effective_due_date < effective_issue_date:
        raise BadRequestException("Invoice due date cannot be earlier than its issue date.")
    if payload.issue_date:
        invoice.issue_date = payload.issue_date
    if payload.due_date:
        invoice.due_date = payload.due_date
    if payload.notes is not None:
        invoice.notes = payload.notes
    if "payment_profile_id" in payload.model_fields_set:
        if payload.payment_profile_id is None:
            invoice.payment_profile_id = None
        else:
            profile = await repository.get_payment_profile(
                workspace.id, payload.payment_profile_id
            )
            if profile is None:
                raise NotFoundException("Payment profile not found in this workspace")
            if profile.currency.upper() != invoice.currency.upper():
                raise BadRequestException(
                    "Payment profile currency must match the invoice currency."
                )
            invoice.payment_profile_id = profile.id

    await db.commit()
    await InvoiceRepository(db).refresh(invoice)
    return invoice


async def finalize_invoice(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
) -> tuple[Invoice, Client]:
    invoice = await InvoiceRepository(db).get_for_update(workspace.id, invoice_id)
    if invoice is None:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    if invoice.status != "draft":
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' "
            f"is '{invoice.status}' and cannot be finalized."
        )

    repository = InvoiceRepository(db)
    client = await repository.get_client(workspace.id, invoice.client_id)

    if not client:
        raise NotFoundException(
            f"Client '{invoice.client_id}' not found in this workspace"
        )

    items = await repository.list_items(invoice.id)

    if not items:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' "
            "must have at least one line item."
        )

    if sum(item.total_minor for item in items) <= 0:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' "
            "total must be greater than zero."
        )

    # Serialize invoice-number allocation across all issue operations
    # within this workspace.
    locked_workspace = await repository.get_workspace_for_update(workspace.id)

    if not locked_workspace:
        raise NotFoundException("Workspace not found")

    # Recheck after acquiring the workspace lock. This protects against
    # duplicate finalization attempts and stale invoice state.
    await InvoiceRepository(db).refresh(invoice)

    if invoice.status != "draft":
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' "
            f"is '{invoice.status}' and cannot be finalized."
        )

    issue_date = invoice.issue_date or date.today()

    if not invoice.due_date:
        terms_days = client.default_payment_terms_days or 14
        invoice.due_date = issue_date + timedelta(days=terms_days)

    invoice.issue_date = issue_date

    if invoice.invoice_number and invoice.sequence_number is not None:
        # Recall/reissue retains the original permanent document number.
        invoice_number = invoice.invoice_number
        sequence_number = invoice.sequence_number
    else:
        sequence_number = locked_workspace.next_invoice_number
        invoice_number = (
            f"{locked_workspace.invoice_prefix}{sequence_number:04d}"
        )
        locked_workspace.next_invoice_number = sequence_number + 1

    old_status = invoice.status

    invoice.status = "issued"
    invoice.invoice_number = invoice_number
    invoice.sequence_number = sequence_number

    # A finalize is a new issuance boundary. Recall returns the invoice to
    # draft, so re-finalising advances the generation and gives the reminder
    # cadence a fresh idempotency namespace.
    invoice.issuance_generation = (invoice.issuance_generation or 0) + 1

    _ensure_share_token(invoice)

    record_status_event(
        db=db,
        workspace_id=locked_workspace.id,
        document_type="invoice",
        document_id=invoice.id,
        from_status=old_status,
        to_status="issued",
        actor_type="issuer",
        actor_id=locked_workspace.owner_id,
        source="issuer_finalize",
    )

    if invoice.quote_id:
        quote_obj = await repository.get_quote(
            locked_workspace.id, invoice.quote_id
        )

        if quote_obj and quote_obj.status == "accepted":
            quote_obj.status = "converted"

            record_status_event(
                db=db,
                workspace_id=locked_workspace.id,
                document_type="quote",
                document_id=quote_obj.id,
                from_status="accepted",
                to_status="converted",
                actor_type="issuer",
                actor_id=locked_workspace.owner_id,
                source="issuer_convert",
                metadata={
                    "invoice_id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                },
            )

    await InvoiceRecallService.create_issued_snapshot(db, invoice)
    await db.commit()
    await InvoiceRepository(db).refresh(invoice)

    return invoice, client


async def send_invoice(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
    *,
    send_email: bool = True,
) -> SendInvoiceOutcome:
    row = await InvoiceRepository(db).get_with_client_for_update(
        workspace.id,
        invoice_id,
    )

    if row is None:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    invoice, client = row

    if invoice.status == "draft":
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' is a draft "
            "and cannot be sent. Finalize it first with "
            "POST /invoices/{id}/finalize."
        )

    if invoice.status not in {"issued", "sent", "viewed"}:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' is "
            f"'{invoice.status}' and cannot be sent."
        )

    _ensure_share_token(invoice)

    share_url = f"{settings.WEB_BASE_URL.rstrip('/')}/i/{invoice.share_token}"

    recipient_email = client.email
    email_sent = False
    email_queued = False
    dispatched = False
    is_first_dispatch = invoice.sent_at is None

    if send_email:
        if recipient_email:
            existing_message = await get_active_document_email(
                db,
                message_type="invoice_email",
                aggregate_id=invoice.id,
            )

            if existing_message is not None:
                # A previous request already committed the message.
                # Do not deduct another credit or enqueue another email.
                email_queued = True
            else:
                deduct_credit = False

                if await should_meter_document_send(
                    db,
                    message_type="invoice_email",
                    aggregate_id=invoice.id,
                    is_first_dispatch=is_first_dispatch,
                ):
                    deduct_credit = await check_delivery_quota(
                        workspace,
                        db,
                    )

                message = enqueue_email(
                    db,
                    message_type="invoice_email",
                    aggregate_id=invoice.id,
                    payload=build_invoice_email_payload(
                        to_email=recipient_email,
                        invoice_number=invoice.invoice_number,
                        share_url=share_url,
                    ),
                )

                if deduct_credit:
                    await consume_delivery_send(
                        workspace,
                        db,
                        deduct_credit=True,
                        commit=False,
                        reference=message.id,
                    )

                email_queued = True

            dispatched = True
            invoice.email_delivery_status = DocumentDeliveryStatus.QUEUED

        else:
            invoice.email_delivery_status = DocumentDeliveryStatus.NO_EMAIL

    else:
        # Explicit link/WhatsApp hand-off is a dispatch in its own right.
        if is_first_dispatch:
            deduct_credit = await check_delivery_quota(
                workspace,
                db,
            )

            if deduct_credit:
                await consume_delivery_send(
                    workspace,
                    db,
                    deduct_credit=True,
                    commit=False,
                    reference=(
                        f"link_share:{invoice.id}:"
                        f"{invoice.issuance_generation or 0}"
                    ),
                )

        dispatched = True
        invoice.email_delivery_status = DocumentDeliveryStatus.LINK_SHARED

    old_status = invoice.status

    if dispatched:
        if invoice.status in {"issued", "sent"}:
            invoice.status = "sent"

        if invoice.sent_at is None:
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

    if dispatched:
        await schedule_invoice_reminders(
            invoice,
            db,
            commit=False,
        )

    # Invoice state, credit ledger, reminder cadence and email outbox
    # become visible together or not at all.
    await db.commit()
    await InvoiceRepository(db).refresh(invoice)

    return SendInvoiceOutcome(
        invoice=invoice,
        client=client,
        email_sent=email_sent,
        email_queued=email_queued,
        recipient_email=recipient_email,
        share_url=share_url,
    )


async def regenerate_share_link(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> Invoice:
    invoice = await InvoiceRepository(db).get_for_update(workspace.id, invoice_id)
    if invoice is None:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")
    raw_token, token_hash = generate_share_token()
    invoice.share_token = raw_token
    invoice.share_token_hash = token_hash
    await db.commit()
    await InvoiceRepository(db).refresh(invoice)
    return invoice


async def revise_invoice(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
    payload: InvoiceReviseRequest,
) -> Invoice:
    invoice = await InvoiceRepository(db).get_for_update(workspace.id, invoice_id)
    if invoice is None:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")
    if invoice.status == "draft":
        raise BadRequestException(
            "Draft invoices should be edited directly. Use PATCH /invoices/{id}."
        )
    if invoice.status not in {"issued", "sent", "viewed"}:
        raise BadRequestException(
            f"Invoice '{invoice.invoice_number or invoice_id}' cannot be revised "
            f"while it is '{invoice.status}'. Resolve payment or lifecycle state first."
        )

    # A revision is a recall-and-reissue workflow, not an in-place mutation of
    # an already issued financial document. Recall enforces the confirmed-
    # payment, pending-claim and provider-processing invariants and invalidates
    # open checkout attempts. It remains in this transaction so the revision
    # and recall either commit together or roll back together.
    invoice = await InvoiceRecallService.recall(
        db, workspace.id, invoice.id,
        actor_user_id=workspace.owner_id or "system",
        reason=payload.reason,
        commit=False,
    )

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
    InvoiceRepository(db).add(revision)

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
    await InvoiceRepository(db).refresh(invoice)
    return invoice


async def list_invoice_revisions(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> list[InvoiceRevision]:
    await _get_invoice_or_404(db, workspace, invoice_id)
    return await InvoiceRepository(db).list_revisions(workspace.id, invoice_id)


async def delete_draft_invoice(
    db: AsyncSession, workspace: Workspace, invoice_id: str
) -> None:
    invoice = await InvoiceRepository(db).get_for_update(workspace.id, invoice_id)
    if invoice is None:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")
    if invoice.status != "draft":
        raise BadRequestException("Cannot delete an invoice that has been sent or finalized.")
    await InvoiceRepository(db).delete(invoice)
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
    return await InvoiceRepository(db).list_claims(invoice.id)


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
    repository = InvoiceRepository(db)
    invoice = await repository.get_for_update(workspace.id, invoice_id)

    if not invoice:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")

    # Reload claim status after acquiring the invoice lock. A concurrent
    # request may already have confirmed or rejected this claim.
    claim = await repository.get_claim_for_update(invoice.id, claim_id)

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
    await InvoiceRepository(db).refresh(claim)
    return claim

async def reject_payment_claim(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
    claim_id: str,
    payload,
) -> PaymentClaim:
    repository = InvoiceRepository(db)
    invoice = await repository.get_for_update(workspace.id, invoice_id)
    if invoice is None:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")
    claim = await repository.get_claim_for_update(invoice.id, claim_id)
    if claim is None:
        raise NotFoundException(f"Payment claim '{claim_id}' not found")
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
    await InvoiceRepository(db).refresh(claim)
    return claim


async def update_wht_credit_note(
    db: AsyncSession, workspace: Workspace, invoice_id: str, payload
) -> Invoice:
    invoice = await InvoiceRepository(db).get_for_update(workspace.id, invoice_id)
    if invoice is None:
        raise NotFoundException(f"Invoice '{invoice_id}' not found")
    invoice.wht_credit_note_number = payload.wht_credit_note_number.strip()
    await db.commit()
    await InvoiceRepository(db).refresh(invoice)
    return invoice


async def get_invoice_by_quote_id(
    db: AsyncSession, workspace: Workspace, quote_id: str
) -> Optional[Invoice]:
    return await InvoiceRepository(db).get_by_quote(workspace.id, quote_id)


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
    repository = InvoiceRepository(db)
    repository.add(invoice)
    await repository.flush()

    repository.add_all([
            InvoiceLineItem(
                invoice_id=invoice.id,
                position=item.position,
                description=item.description,
                quantity=item.quantity,
                unit_price_minor=item.unit_price_minor,
                total_minor=item.total_minor,
            )
            for item in quote_obj.items
        ])

    if commit:
        await db.commit()
        await repository.refresh(invoice)
    return invoice


async def list_invoice_comments(
    db: AsyncSession, workspace: Workspace, invoice_id: str
):
    invoice = await _get_invoice_or_404(db, workspace, invoice_id)
    return await InvoiceRepository(db).list_comments(invoice.id)


async def create_invoice_comment(
    db: AsyncSession, workspace: Workspace, invoice_id: str, payload
):
    from app.domains.sharing.models import InvoiceComment

    repository = InvoiceRepository(db)
    invoice = await _get_invoice_or_404(db, workspace, invoice_id)
    if payload.line_item_id:
        item = await repository.get_line_item(invoice.id, payload.line_item_id)
        if item is None:
            raise BadRequestException("That line item does not belong to this invoice.")
    author_name = (
        payload.author_name.strip()
        if payload.author_name and payload.author_name.strip()
        else (workspace.business_name or "Business")
    )
    message = payload.message.strip()
    if not message:
        raise BadRequestException("A comment message is required.")
    comment = InvoiceComment(
        invoice_id=invoice.id,
        line_item_id=payload.line_item_id,
        author_name=author_name,
        message=message,
        is_from_client=False,
    )
    repository.add(comment)
    await db.commit()
    await repository.refresh(comment)
    return comment


async def recall_invoice(
    db: AsyncSession,
    workspace: Workspace,
    invoice_id: str,
    *,
    actor_user_id: str,
    reason: Optional[str] = None,
) -> Invoice:
    return await InvoiceRecallService.recall(
        db, workspace.id, invoice_id,
        actor_user_id=actor_user_id, reason=reason,
    )
