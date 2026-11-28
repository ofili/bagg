import logging

logger = logging.getLogger(__name__)

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional, cast

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dates import business_today
from app.core.deposits import resolve_deposit_configuration
from app.core.errors import BadRequestException, NotFoundException
from app.core.money import calculate_invoice_totals, format_money
from app.core.security import generate_share_token, hash_token
from app.domains.activation.service import (record_quote_created, record_document_dispatched)
from app.domains.sharing.secrets import (
    resolve_share_token,
    store_share_token,
)
from app.domains.billing.service import (
    check_delivery_quota,
    consume_delivery_send,
)
from app.domains.documents.builders.quotes import build_quote_document
from app.domains.quotes.acceptance import (
    CONSENT_TEXT,
    CONSENT_TEXT_VERSION,
    AcceptanceContext,
    build_terms_snapshot,
    hash_terms_snapshot,
    verify_terms_hash,
)
from app.domains.documents.generation import enqueue_document_generation
from app.domains.documents.delivery import DocumentDeliveryStatus
from app.domains.engagements import service as engagements_service
from app.domains.invoices import service as invoices_service
from app.domains.lifecycle.service import (
    record_document_first_view,
    record_quote_invoice_linked,
    transition_document,
)
from app.domains.quotes.models import Quote, QuoteComment, QuoteLineItem, QuoteRevision
from app.domains.quotes.repository import QuoteRepository
from app.domains.quotes.schemas import (
    AcceptanceRecordResponse,
    QuoteAcceptRequest,
    QuoteCommentCreate,
    QuoteCreate,
    QuoteDeclineRequest,
    QuoteReviewRequest,
    QuoteReviseRequest,
    QuoteUpdate,
)
from app.domains.workspaces.models import Workspace
from app.integrations.email import build_quote_email_payload
from app.integrations.email_outbox import (
    enqueue_email,
    get_active_document_email,
    get_active_document_share_url,
    should_meter_document_send,
    supersede_active_document_emails,
)

@dataclass
class SendQuoteOutcome:
    quote: Quote
    email_sent: bool
    email_queued: bool
    recipient_email: Optional[str]
    share_url: str


async def _notify_workspace_owner(
    db: AsyncSession,
    workspace: Workspace,
    *,
    notification_type: str,
    title: str,
    body: str,
    quote_obj: Quote,
    comment_id: str | None = None,
) -> None:
    if not workspace.owner_id:
        return
    from app.domains.notifications.service import NotificationService

    await NotificationService.create_notification(
        db,
        workspace_id=workspace.id,
        recipient_user_id=workspace.owner_id,
        type=notification_type,
        title=title,
        body=body,
        document_type="quote",
        document_id=quote_obj.id,
        document_number=quote_obj.quote_number,
        link_url=(
            f"/quotes/{quote_obj.id}#comments"
            if comment_id
            else f"/quotes/{quote_obj.id}"
        ),
        comment_id=comment_id,
        commit=False,
    )


async def _ensure_share_token(
    db: AsyncSession,
    quote_obj: Quote,
) -> str:
    if quote_obj.share_token:
        if not quote_obj.share_token_hash:
            raise BadRequestException(
                "Quote share token is missing its authoritative hash."
            )

        await store_share_token(
            db,
            document_type="quote",
            document_id=quote_obj.id,
            token=quote_obj.share_token,
            expected_hash=quote_obj.share_token_hash,
        )
        return quote_obj.share_token

    if quote_obj.share_token_hash:
        token = await resolve_share_token(
            db,
            document_type="quote",
            document_id=quote_obj.id,
            expected_hash=quote_obj.share_token_hash,
        )

        if token is None:
            raise BadRequestException(
                "This quote has an existing share-token hash but no "
                "recoverable encrypted secret. Explicitly regenerate its "
                "share link before sending or finalizing it."
            )

        quote_obj.share_token = token
        return token

    raw_token, token_hash = generate_share_token()
    quote_obj.share_token = raw_token
    quote_obj.share_token_hash = token_hash

    await store_share_token(
        db,
        document_type="quote",
        document_id=quote_obj.id,
        token=raw_token,
        expected_hash=token_hash,
    )

    return raw_token


async def _get_quote_or_404(
    db: AsyncSession, workspace: Workspace, quote_id: str
) -> Quote:
    quote_obj = await QuoteRepository(db).get(workspace.id, quote_id)
    if quote_obj is None:
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
    deposit_config: dict | None = None,
) -> None:
    quote_obj.subtotal_minor = totals["subtotal_minor"]
    quote_obj.discount_minor = discount
    quote_obj.tax_rate_percent = tax_rate
    quote_obj.tax_minor = totals["tax_minor"]
    quote_obj.total_minor = totals["total_minor"]
    quote_obj.wht_rate_percent = wht_rate
    quote_obj.wht_minor = totals["wht_minor"]
    quote_obj.net_payable_minor = totals["net_payable_minor"]

    if deposit_config is not None:
        quote_obj.deposit_mode = deposit_config["deposit_mode"]
        quote_obj.deposit_percentage = deposit_config["deposit_percentage"]
        quote_obj.deposit_amount_minor = deposit_config["deposit_amount_minor"]
    else:
        quote_obj.deposit_amount_minor = totals["deposit_amount_minor"]


async def list_quotes(
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
) -> tuple[list[Quote], int]:
    return await QuoteRepository(db).list_page(
        workspace.id,
        client_id=client_id,
        status_filter=status_filter,
        currency=currency,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        per_page=per_page,
    )


async def get_quote(db: AsyncSession, workspace: Workspace, quote_id: str) -> Quote:
    return await _get_quote_or_404(db, workspace, quote_id)


async def get_acceptance_record(
    db: AsyncSession, workspace: Workspace, quote_id: str
) -> AcceptanceRecordResponse:
    quote_obj = await _get_quote_or_404(db, workspace, quote_id)
    if quote_obj.accepted_at is None:
        raise NotFoundException("This quote has not been accepted.")

    snapshot = quote_obj.accepted_terms_snapshot
    return AcceptanceRecordResponse(
        quote_id=quote_obj.id,
        quote_number=quote_obj.quote_number,
        version=(snapshot or {}).get("version", quote_obj.version),
        accepted_at=quote_obj.accepted_at,
        accepted_by_name=quote_obj.accepted_by_name,
        evidence_captured=bool(snapshot and quote_obj.accepted_terms_hash),
        ip_address=quote_obj.accepted_ip,
        user_agent=quote_obj.accepted_user_agent,
        consent_text=quote_obj.accepted_consent_text,
        consent_version=quote_obj.accepted_consent_version,
        terms_hash=quote_obj.accepted_terms_hash,
        terms_snapshot=snapshot,
        hash_verified=verify_terms_hash(snapshot, quote_obj.accepted_terms_hash),
        generated_at=datetime.now(timezone.utc),
    )


async def create_quote(
    db: AsyncSession, workspace: Workspace, payload: QuoteCreate
) -> Quote:
    repository = QuoteRepository(db)
    client = await repository.get_client(workspace.id, payload.client_id)
    if not client:
        raise NotFoundException(
            f"Client '{payload.client_id}' not found in this workspace"
        )

    locked_workspace = await repository.get_workspace_for_update(workspace.id)
    if locked_workspace is None:
        raise NotFoundException("Workspace not found")
    seq = locked_workspace.next_quote_number
    quote_number = f"{locked_workspace.quote_prefix}{seq:04d}"
    locked_workspace.next_quote_number = seq + 1

    issue_date = payload.issue_date or business_today(workspace.timezone)
    expires_at = payload.expires_at
    if not expires_at:
        validity = payload.validity_days if payload.validity_days is not None else 14
        expires_at = issue_date + timedelta(days=validity)
    if expires_at < issue_date:
        raise BadRequestException(
            "Quote expiry date cannot be earlier than its issue date."
        )

    totals = calculate_invoice_totals(
        items=[
            {"quantity": it.quantity, "unit_price_minor": it.unit_price_minor}
            for it in payload.items
        ],
        discount_minor=payload.discount_minor,
        tax_percent=payload.tax_rate_percent,
        wht_percent=payload.wht_rate_percent,
        deposit_percent=0.0,
        deposit_amount_minor=None,
    )

    try:
        deposit_config = resolve_deposit_configuration(
            net_payable_minor=totals["net_payable_minor"],
            supplied_fields=payload.model_fields_set,
            deposit_mode=payload.deposit_mode,
            deposit_percentage=payload.deposit_percentage,
            deposit_amount_minor=payload.deposit_amount_minor,
            is_create=True,
        )
    except ValueError as exc:
        raise BadRequestException(str(exc)) from exc

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
        deposit_mode=deposit_config["deposit_mode"],
        deposit_percentage=deposit_config["deposit_percentage"],
        deposit_amount_minor=deposit_config["deposit_amount_minor"],
        has_expense_policy=bool(payload.has_expense_policy),
        expense_policy=payload.expense_policy.model_dump() if payload.expense_policy else None,
        notes=payload.notes,
        share_token=raw_token,
        share_token_hash=token_hash,
        version=1,
    )
    repository.add(quote_obj)
    await repository.flush()

    await store_share_token(
        db,
        document_type="quote",
        document_id=quote_obj.id,
        token=raw_token,
        expected_hash=token_hash,
    )

    repository.add_all(
        [
            QuoteLineItem(
                quote_id=quote_obj.id,
                position=i,
                description=it.description,
                quantity=it.quantity,
                unit_price_minor=it.unit_price_minor,
                total_minor=it.quantity * it.unit_price_minor,
            )
            for i, it in enumerate(payload.items)
        ]
    )

    await record_quote_created(
        db,
        workspace,
        quote_obj,
    )

    await db.commit()
    await repository.refresh(quote_obj)
    return quote_obj


async def finalize_quote(
    db: AsyncSession, workspace: Workspace, quote_id: str
) -> Quote:
    repository = QuoteRepository(db)
    quote_obj = await repository.get_for_update(workspace.id, quote_id)
    if quote_obj is None:
        raise NotFoundException(f"Quote '{quote_id}' not found")
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
    if quote_obj.expires_at < business_today(workspace.timezone):
        raise BadRequestException(
            "This draft quote has expired. Update its expiry date before issuing it."
        )

    if not quote_obj.quote_number:
        locked_workspace = await repository.get_workspace_for_update(workspace.id)
        if locked_workspace is None:
            raise NotFoundException("Workspace not found")
        seq = locked_workspace.next_quote_number
        locked_workspace.next_quote_number = seq + 1
        quote_obj.quote_number = f"{locked_workspace.quote_prefix}{seq:04d}"
        quote_obj.sequence_number = seq

    await _ensure_share_token(db, quote_obj)

    transition_document(
        db,
        document=quote_obj,
        document_type="quote",
        to_status="issued",
        actor_type="issuer",
        actor_id=workspace.owner_id,
        source="issuer_finalize",
    )

    client = quote_obj.client

    document = build_quote_document(
        quote_obj,
        business_name=workspace.business_name,
        business_address=workspace.address,
        business_tax_id=workspace.tax_id,
        business_logo_url=workspace.logo_url,
        client_name=client.name if client else None,
        client_email=client.email if client else None,
        client_address=client.address if client else None,
        client_tax_id=client.tax_id if client else None,
    )

    await enqueue_document_generation(
        db,
        document,
        issuance_generation=1,
    )

    await db.commit()
    await QuoteRepository(db).refresh(quote_obj)
    return quote_obj


async def revise_quote(
    db: AsyncSession,
    workspace: Workspace,
    quote_id: str,
    payload: QuoteReviseRequest,
) -> Quote:
    quote_obj = await QuoteRepository(db).get_for_update(workspace.id, quote_id)
    if quote_obj is None:
        raise NotFoundException(f"Quote '{quote_id}' not found")

    effective_issue_date = payload.issue_date or quote_obj.issue_date
    effective_expiry = payload.expires_at or quote_obj.expires_at
    if effective_expiry < effective_issue_date:
        raise BadRequestException(
            "Quote expiry date cannot be earlier than its issue date."
        )

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
        deposit_mode=quote_obj.deposit_mode or "legacy",
        deposit_amount_minor=quote_obj.deposit_amount_minor,
        has_expense_policy=quote_obj.has_expense_policy,
        expense_policy=quote_obj.expense_policy,
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
    QuoteRepository(db).add(revision)

    if payload.client_id is not None:
        client = await QuoteRepository(db).get_client(workspace.id, payload.client_id)
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
    if payload.has_expense_policy is not None:
        quote_obj.has_expense_policy = payload.has_expense_policy
    if payload.expense_policy is not None:
        quote_obj.expense_policy = payload.expense_policy.model_dump()

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
        deposit_percent=0.0,
        deposit_amount_minor=None,
    )

    try:
        deposit_config = resolve_deposit_configuration(
            net_payable_minor=totals["net_payable_minor"],
            supplied_fields=payload.model_fields_set,
            deposit_mode=payload.deposit_mode,
            deposit_percentage=payload.deposit_percentage,
            deposit_amount_minor=payload.deposit_amount_minor,
            existing_mode=quote_obj.deposit_mode,
            existing_percentage=quote_obj.deposit_percentage,
            existing_amount_minor=quote_obj.deposit_amount_minor,
        )
    except ValueError as exc:
        raise BadRequestException(str(exc)) from exc

    _apply_totals(
        quote_obj,
        totals,
        discount=discount,
        tax_rate=tax_rate,
        wht_rate=wht_rate,
        deposit_pct=deposit_config["deposit_percentage"],
        deposit_config=deposit_config,
    )

    # A revision is a new draft version and must be finalized and shared again.
    quote_obj.version = old_version + 1
    quote_obj.last_revised_at = datetime.now(timezone.utc)

    transition_document(
        db,
        document=quote_obj,
        document_type="quote",
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

    # A queued email from the previous version must not deliver the revoked
    # link. SKIP LOCKED inside the helper avoids waiting on the email worker.
    await supersede_active_document_emails(
        db,
        message_type="quote_email",
        aggregate_id=quote_obj.id,
    )

    await db.commit()
    await QuoteRepository(db).refresh(quote_obj)
    return quote_obj


async def update_quote(
    db: AsyncSession,
    workspace: Workspace,
    quote_id: str,
    payload: QuoteUpdate,
) -> Quote:
    quote_obj = await QuoteRepository(db).get_for_update(workspace.id, quote_id)
    if quote_obj is None:
        raise NotFoundException(f"Quote '{quote_id}' not found")

    if quote_obj.status != "draft":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is '{quote_obj.status}' "
            "and cannot be edited in place. Create a revision instead."
        )

    effective_issue_date = payload.issue_date or quote_obj.issue_date
    effective_expiry = payload.expires_at or quote_obj.expires_at

    if effective_expiry < effective_issue_date:
        raise BadRequestException(
            "Quote expiry date cannot be earlier than its issue date."
        )

    if payload.items is not None and not payload.items:
        raise BadRequestException("A quote must contain at least one line item.")

    if payload.client_id is not None:
        client = await QuoteRepository(db).get_client(workspace.id, payload.client_id)
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
    if payload.has_expense_policy is not None:
        quote_obj.has_expense_policy = payload.has_expense_policy
    if payload.expense_policy is not None:
        quote_obj.expense_policy = payload.expense_policy.model_dump()

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

    if payload.items is not None:
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
        deposit_percent=0.0,
        deposit_amount_minor=None,
    )

    try:
        deposit_config = resolve_deposit_configuration(
            net_payable_minor=totals["net_payable_minor"],
            supplied_fields=payload.model_fields_set,
            deposit_mode=payload.deposit_mode,
            deposit_percentage=payload.deposit_percentage,
            deposit_amount_minor=payload.deposit_amount_minor,
            existing_mode=quote_obj.deposit_mode,
            existing_percentage=quote_obj.deposit_percentage,
            existing_amount_minor=quote_obj.deposit_amount_minor,
        )
    except ValueError as exc:
        raise BadRequestException(str(exc)) from exc

    _apply_totals(
        quote_obj,
        totals,
        discount=discount,
        tax_rate=tax_rate,
        wht_rate=wht_rate,
        deposit_pct=deposit_config["deposit_percentage"],
        deposit_config=deposit_config,
    )

    await db.commit()
    await QuoteRepository(db).refresh(quote_obj)
    return quote_obj


async def send_quote(
    db: AsyncSession,
    workspace: Workspace,
    quote_id: str,
    *,
    send_email: bool = False,
) -> SendQuoteOutcome:
    quote_obj = await QuoteRepository(db).get_for_update(
        workspace.id,
        quote_id,
    )

    if quote_obj is None:
        raise NotFoundException(f"Quote '{quote_id}' not found")

    if quote_obj.status == "draft":
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is a draft and cannot be sent. "
            f"Finalize it first with POST /quotes/{quote_id}/finalize."
        )

    if quote_obj.status not in {"issued", "sent", "viewed"}:
        raise BadRequestException(
            f"Quote '{quote_obj.quote_number}' is "
            f"'{quote_obj.status}' and cannot be sent."
        )

    client = quote_obj.client
    recipient_email = client.email if client else None

    active_message = None

    if send_email and recipient_email:
        active_message = await get_active_document_email(
            db,
            message_type="quote_email",
            aggregate_id=quote_obj.id,
        )

        if active_message is not None:
            existing_share_url = get_active_document_share_url(active_message)

            existing_token = (
                existing_share_url.rstrip("/").rsplit("/", 1)[-1]
                if existing_share_url
                else None
            )

            if existing_token and hash_token(existing_token) == quote_obj.share_token_hash:
                quote_obj.share_token = existing_token
                share_url = existing_share_url
            else:
                await supersede_active_document_emails(
                    db,
                    message_type="quote_email",
                    aggregate_id=quote_obj.id,
                )
                active_message = None

    if active_message is None:
        await _ensure_share_token(db, quote_obj)
        share_url = f"{settings.WEB_BASE_URL.rstrip('/')}/q/{quote_obj.share_token}"

    email_sent = False
    email_queued = False
    dispatched = False
    is_first_dispatch = quote_obj.sent_at is None

    if send_email:
        if recipient_email:
            if active_message is not None:
                email_queued = True
            else:
                deduct_credit = False

                if await should_meter_document_send(
                    db,
                    message_type="quote_email",
                    aggregate_id=quote_obj.id,
                    is_first_dispatch=is_first_dispatch,
                ):
                    deduct_credit = await check_delivery_quota(
                        workspace,
                        db,
                    )

                message = enqueue_email(
                    db,
                    message_type="quote_email",
                    aggregate_id=quote_obj.id,
                    payload=build_quote_email_payload(
                        to_email=recipient_email,
                        quote_number=quote_obj.quote_number,
                        share_url=share_url,
                        business_name=workspace.business_name,
                        client_name=client.name if client else None,
                        formatted_total=format_money(
                            quote_obj.total_minor,
                            quote_obj.currency,
                        ),
                        expires_at=quote_obj.expires_at.strftime("%d %b %Y"),
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
            quote_obj.email_delivery_status = DocumentDeliveryStatus.QUEUED

        else:
            quote_obj.email_delivery_status = DocumentDeliveryStatus.NO_EMAIL

    else:
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
                        f"link_share:{quote_obj.id}:"
                        f"{quote_obj.version}"
                    ),
                )

        dispatched = True
        quote_obj.email_delivery_status = DocumentDeliveryStatus.LINK_SHARED

    old_status = quote_obj.status

    if dispatched:
        if quote_obj.status in {"issued", "sent"}:
            if quote_obj.status == "issued":
                transition_document(
                    db,
                    document=quote_obj,
                    document_type="quote",
                    to_status="sent",
                    actor_type="issuer",
                    actor_id=workspace.owner_id,
                    source="issuer_send",
                )

        if quote_obj.sent_at is None:
            quote_obj.sent_at = datetime.now(timezone.utc)

    if dispatched:
        await record_document_dispatched(
            db,
            workspace,
            document_type="quote",
            document_id=quote_obj.id,
            source="issuer_send",
        )

    await db.commit()
    await QuoteRepository(db).refresh(quote_obj)

    return SendQuoteOutcome(
        quote=quote_obj,
        email_sent=email_sent,
        email_queued=email_queued,
        recipient_email=recipient_email,
        share_url=share_url,
    )


async def convert_quote_to_invoice(
    db: AsyncSession, workspace: Workspace, quote_id: str
):
    repository = QuoteRepository(db)
    quote_obj = await repository.get_for_update(workspace.id, quote_id)
    if quote_obj is None:
        raise NotFoundException(f"Quote '{quote_id}' not found")
    client = await repository.get_client(workspace.id, quote_obj.client_id)
    if client is None:
        raise NotFoundException("Quote client not found in this workspace")
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

    record_quote_invoice_linked(
        db,
        quote=quote_obj,
        invoice=invoice,
        actor_type="issuer",
        actor_id=workspace.owner_id,
        source="issuer_convert",
    )
    
    await db.commit()
    await QuoteRepository(db).refresh(invoice)
    return invoice, client


async def view_public_quote(
    db: AsyncSession,
    token: str,
) -> tuple[Quote, Optional[str], Workspace]:
    row = await QuoteRepository(db).get_public_for_update(token)

    if row is None:
        raise NotFoundException("Quote not found or invalid link")

    quote_obj, client_name, workspace = row

    if quote_obj.status == "draft":
        raise NotFoundException("Quote not found or invalid link")

    first_view_recorded = record_document_first_view(
        db,
        document=quote_obj,
        document_type="quote",
        record_unchanged_status=True,
    )

    if first_view_recorded:
        if workspace and workspace.owner_id:
            from app.domains.notifications.service import NotificationService

            await NotificationService.create_notification(
                db,
                workspace_id=workspace.id,
                recipient_user_id=workspace.owner_id,
                type="quote_viewed",
                title=f"Quote {quote_obj.quote_number} was viewed",
                body=f"{client_name or 'Client'} opened and viewed the quote.",
                document_type="quote",
                document_id=quote_obj.id,
                document_number=quote_obj.quote_number,
                link_url=f"/quotes/{quote_obj.id}",
                commit=False,
            )

        # Persist the view timestamp, lifecycle event and notification
        # in one transaction.
        await db.commit()
        await QuoteRepository(db).refresh(quote_obj)

    return quote_obj, client_name, workspace


async def accept_public_quote(
    db: AsyncSession,
    token: str,
    payload: QuoteAcceptRequest,
    context: Optional[AcceptanceContext] = None,
) -> tuple[Quote, Optional[str], Workspace]:
    row = await QuoteRepository(db).get_public_for_update(token)
    if row is None:
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
    if quote_obj.expires_at < business_today(workspace.timezone):
        raise BadRequestException(
            "This quote has expired. Please contact the freelancer for an updated quote."
        )
    if quote_obj.status not in {"issued", "sent", "viewed", "accepted"}:
        raise BadRequestException(
            f"Cannot accept a quote in '{quote_obj.status}' status."
        )
    if payload.version != quote_obj.version:
        raise BadRequestException(
            f"This quote has been revised to v{quote_obj.version}; you are accepting "
            f"v{payload.version}. Please refresh and accept the latest version."
        )

    accepted_by_name = payload.accepted_by_name.strip()
    if not accepted_by_name:
        raise BadRequestException("The accepting client's name is required.")
    if not payload.agreed_to_terms:
        raise BadRequestException(
            "Please confirm that you have read and agree to the terms of this quote."
        )

    changed = False
    accepted_now = quote_obj.status != "accepted"

    if accepted_now:
        transition_document(
            db,
            document=quote_obj,
            document_type="quote",
            to_status="accepted",
            actor_type="client",
            source="client_accept",
            metadata={"accepted_by_name": accepted_by_name},
        )

        quote_obj.accepted_at = datetime.now(timezone.utc)
        quote_obj.accepted_by_name = accepted_by_name

        # Evidence: what the client saw, what they agreed to, and where from.
        # Never overwritten by a repeated request: only the first acceptance counts.
        snapshot = build_terms_snapshot(quote_obj, client_name, workspace)
        context = context or AcceptanceContext()
        quote_obj.accepted_terms_snapshot = snapshot
        quote_obj.accepted_terms_hash = hash_terms_snapshot(snapshot)
        quote_obj.accepted_consent_text = CONSENT_TEXT
        quote_obj.accepted_consent_version = CONSENT_TEXT_VERSION
        quote_obj.accepted_ip = context.ip_address
        quote_obj.accepted_user_agent = context.clean_user_agent()

        changed = True

    invoice = await invoices_service.get_invoice_by_quote_id(
        db, workspace, quote_obj.id
    )
    
    if invoice is None:
        invoice = await invoices_service.create_draft_invoice_from_quote(
            db, workspace, quote_obj, commit=False
        )
        quote_obj.invoice_id = invoice.id

        record_quote_invoice_linked(
            db,
            quote=quote_obj,
            invoice=invoice,
            actor_type="system",
            source="quote_accepted_invoice_created",
        )

        changed = True

    # Snapshot commercial terms & create engagement (BAG-ENG-002, BAG-EXP-001)
    await engagements_service.create_or_get_engagement_from_quote(
        db, quote_obj, workspace
    )
    changed = True

    if accepted_now:
        await _notify_workspace_owner(
            db,
            workspace,
            notification_type="quote_accepted",
            title=f"Quote {quote_obj.quote_number} was accepted!",
            body=f"{accepted_by_name} accepted the quote.",
            quote_obj=quote_obj,
        )

    if changed:
        await db.commit()
        await QuoteRepository(db).refresh(quote_obj)
        if invoice is not None:
            await QuoteRepository(db).refresh(invoice)

    return quote_obj, client_name, workspace


async def decline_public_quote(
    db: AsyncSession,
    token: str,
    payload: QuoteDeclineRequest,
) -> tuple[Quote, Optional[str], Workspace]:
    row = await QuoteRepository(db).get_public_for_update(token)
    if row is None:
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

    if quote_obj.expires_at < business_today(workspace.timezone):
        raise BadRequestException(
            "This quote has expired and can no longer be declined."
        )

    if payload.reason:
        quote_obj.decline_reason = payload.reason.strip()

    transition_document(
        db,
        document=quote_obj,
        document_type="quote",
        to_status="declined",
        actor_type="client",
        source="client_decline",
        metadata={"reason": quote_obj.decline_reason},
    )

    quote_obj.declined_at = datetime.now(timezone.utc)

    reason_suffix = (
        f': "{quote_obj.decline_reason}"' if quote_obj.decline_reason else "."
    )

    await _notify_workspace_owner(
        db,
        workspace,
        notification_type="quote_declined",
        title=f"Quote {quote_obj.quote_number} was declined",
        body=f"{client_name or 'Client'} declined the quote{reason_suffix}",
        quote_obj=quote_obj,
    )

    await db.commit()
    await QuoteRepository(db).refresh(quote_obj)

    return quote_obj, client_name, workspace


async def request_quote_review(
    db: AsyncSession,
    token: str,
    payload: QuoteReviewRequest,
) -> tuple[Quote, Optional[str], Workspace]:
    row = await QuoteRepository(db).get_public_for_update(token)
    if row is None:
        raise NotFoundException("Quote not found or invalid link")
    quote_obj, client_name, workspace = row

    if quote_obj.status == "draft":
        raise NotFoundException("Quote not found or invalid link")

    if quote_obj.status in {"accepted", "declined", "converted"}:
        raise BadRequestException(
            f"Cannot request changes on a {quote_obj.status} quote."
        )

    if quote_obj.expires_at < business_today(workspace.timezone):
        raise BadRequestException(
            "This quote has expired. Please contact the issuer for an updated quote."
        )

    if quote_obj.status == "review_requested":
        return quote_obj, client_name, workspace

    quote_obj.review_reason = (payload.reason or "").strip() or None

    transition_document(
        db,
        document=quote_obj,
        document_type="quote",
        to_status="review_requested",
        actor_type="client",
        source="client_request_review",
        metadata={"reason": quote_obj.review_reason},
    )

    quote_obj.review_requested_at = datetime.now(timezone.utc)

    reason_text = f' "{quote_obj.review_reason}"' if quote_obj.review_reason else ""

    await _notify_workspace_owner(
        db,
        workspace,
        notification_type="quote_review_requested",
        title=f"Changes requested on quote {quote_obj.quote_number}",
        body=f"{client_name or 'Client'} requested review:{reason_text}",
        quote_obj=quote_obj,
    )

    await db.commit()
    await QuoteRepository(db).refresh(quote_obj)

    return quote_obj, client_name, workspace


async def list_quote_revisions(
    db: AsyncSession, workspace: Workspace, quote_id: str
) -> list[QuoteRevision]:
    await _get_quote_or_404(db, workspace, quote_id)
    return await QuoteRepository(db).list_revisions(quote_id)


async def post_public_quote_comment(
    db: AsyncSession,
    token: str,
    payload: QuoteCommentCreate,
) -> tuple[QuoteComment, Quote, Workspace, Optional[str], Optional[str]]:
    row = await QuoteRepository(db).get_public_with_workspace(token)
    if row is None:
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
        item = await QuoteRepository(db).get_line_item(
            quote_obj.id, payload.line_item_id
        )
        if item is None:
            raise BadRequestException("That line item does not belong to this quote.")
        item_description = item.description

    author_name = payload.author_name.strip()
    message = payload.message.strip()

    if not author_name or not message:
        raise BadRequestException("A comment author and message are required.")

    comment = QuoteComment(
        quote_id=quote_obj.id,
        line_item_id=payload.line_item_id,
        author_name=author_name,
        message=message,
        is_from_client=True,
    )

    repository = QuoteRepository(db)
    repository.add(comment)

    # Generate the comment ID before using it in the notification.
    await db.flush()

    await _notify_workspace_owner(
        db,
        workspace,
        notification_type="client_comment",
        title=f"New question on quote {quote_obj.quote_number}",
        body=f"{comment.author_name}: {comment.message[:150]}",
        quote_obj=quote_obj,
        comment_id=comment.id,
    )

    await db.commit()
    await repository.refresh(comment)

    owner_email = await repository.get_owner_email(workspace)

    return comment, quote_obj, workspace, item_description, owner_email


async def list_quote_comments(
    db: AsyncSession,
    workspace: Workspace,
    quote_id: str,
) -> list[QuoteComment]:
    await _get_quote_or_404(db, workspace, quote_id)
    return await QuoteRepository(db).list_comments(quote_id)


async def create_quote_comment(
    db: AsyncSession, workspace: Workspace, quote_id: str, payload
) -> QuoteComment:
    quote_obj = await _get_quote_or_404(db, workspace, quote_id)
    if payload.line_item_id:
        item = await QuoteRepository(db).get_line_item(
            quote_obj.id, payload.line_item_id
        )
        if item is None:
            raise BadRequestException("That line item does not belong to this quote.")
    author_name = (
        payload.author_name.strip()
        if payload.author_name and payload.author_name.strip()
        else (workspace.business_name or "Business")
    )
    message = payload.message.strip()
    if not message:
        raise BadRequestException("A comment message is required.")
    comment = QuoteComment(
        quote_id=quote_obj.id,
        line_item_id=payload.line_item_id,
        author_name=author_name,
        message=message,
        is_from_client=False,
    )
    repository = QuoteRepository(db)
    repository.add(comment)
    await db.commit()
    await repository.refresh(comment)
    return comment
