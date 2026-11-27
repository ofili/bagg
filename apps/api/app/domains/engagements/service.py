from datetime import datetime, timedelta, timezone
from typing import Optional, Any, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import BadRequestException, NotFoundException
from app.core.money import format_money
from app.core.security import generate_share_token
from app.domains.clients.models import Client
from app.domains.email.service import enqueue_scope_change_approval_link
from app.domains.engagements.models import Engagement, ScopeChangeRequest
from app.domains.engagements.repository import EngagementRepository, ScopeChangeRepository
from app.domains.engagements.schemas import (
    EngagementCreate,
    EngagementMarginResponse,
    ScopeChangeAcceptRequest,
    ScopeChangeCreateRequest,
    ScopeChangeDeclineRequest,
    ScopeChangeResponse,
)
from app.domains.expenses.models import Expense
from app.domains.expenses.repository import ExpenseRepository
from app.domains.expenses.service import evaluate_expense_policy
from app.domains.invoices.models import Invoice
from app.domains.quotes.models import Quote
from app.domains.receipts.models import Receipt
from app.domains.workspaces.models import Workspace


async def create_or_get_engagement_from_quote(
    db: AsyncSession,
    quote_obj: Quote,
    workspace: Workspace,
) -> Engagement:
    """Create an engagement from an accepted quote or return existing.

    Snapshots the agreed commercial terms and expense policy into an immutable baseline.
    """
    repo = EngagementRepository(db)
    existing = await repo.get_by_quote_id(workspace.id, quote_obj.id)
    if existing:
        return existing

    # Extract policy parameters
    policy = quote_obj.expense_policy or {}
    cap_minor = policy.get("total_expense_cap_minor")
    threshold_minor = policy.get("per_expense_threshold_minor")

    # Snapshot commercial terms
    commercial_baseline = {
        "source": "accepted_quote",
        "quote_id": quote_obj.id,
        "quote_number": quote_obj.quote_number,
        "quote_version": quote_obj.version,
        "currency": quote_obj.currency,
        "subtotal_minor": quote_obj.subtotal_minor,
        "discount_minor": quote_obj.discount_minor,
        "tax_rate_percent": quote_obj.tax_rate_percent,
        "tax_minor": quote_obj.tax_minor,
        "total_minor": quote_obj.total_minor,
        "wht_rate_percent": quote_obj.wht_rate_percent,
        "wht_minor": quote_obj.wht_minor,
        "net_payable_minor": quote_obj.net_payable_minor,
        "deposit_percentage": quote_obj.deposit_percentage,
        "deposit_amount_minor": quote_obj.deposit_amount_minor,
        "items": [
            {
                "description": it.description,
                "quantity": it.quantity,
                "unit_price_minor": it.unit_price_minor,
                "total_minor": it.total_minor,
            }
            for it in (quote_obj.items or [])
        ],
        "has_expense_policy": bool(quote_obj.has_expense_policy),
        "expense_policy": policy if quote_obj.has_expense_policy else None,
        "accepted_at": quote_obj.accepted_at.isoformat() if quote_obj.accepted_at else None,
        "accepted_by_name": quote_obj.accepted_by_name,
    }

    title = f"Project: Quote {quote_obj.quote_number}"
    if quote_obj.items and len(quote_obj.items) > 0:
        first_desc = quote_obj.items[0].description
        if len(first_desc) > 60:
            first_desc = f"{first_desc[:57]}..."
        title = f"{quote_obj.quote_number} — {first_desc}"

    engagement = Engagement(
        workspace_id=workspace.id,
        client_id=quote_obj.client_id,
        quote_id=quote_obj.id,
        title=title,
        engagement_type="one_off",
        status="active",
        currency=quote_obj.currency,
        commercial_baseline=commercial_baseline,
        baseline_expense_cap_minor=cap_minor if quote_obj.has_expense_policy else None,
        effective_expense_cap_minor=cap_minor if quote_obj.has_expense_policy else None,
        per_expense_threshold_minor=threshold_minor if quote_obj.has_expense_policy else None,
        expense_policy_snapshot=policy if quote_obj.has_expense_policy else None,
        notes=quote_obj.notes,
    )
    repo.add(engagement)
    await db.flush()
    return engagement


async def create_manual_engagement(
    db: AsyncSession,
    workspace: Workspace,
    payload: EngagementCreate,
) -> Engagement:
    """Manually creates an engagement for agreed work (BAG-ENG-001)."""
    policy = payload.expense_policy or {}
    cap_minor = payload.baseline_expense_cap_minor or policy.get("total_expense_cap_minor")
    threshold_minor = payload.per_expense_threshold_minor or policy.get("per_expense_threshold_minor")

    commercial_baseline = {
        "source": "manual_agreement",
        "currency": payload.currency.upper(),
        "title": payload.title,
        "expense_policy": policy,
        "baseline_expense_cap_minor": cap_minor,
        "per_expense_threshold_minor": threshold_minor,
    }

    engagement = Engagement(
        workspace_id=workspace.id,
        client_id=payload.client_id,
        quote_id=payload.quote_id,
        title=payload.title.strip(),
        engagement_type=payload.engagement_type,
        status="active",
        currency=payload.currency.upper(),
        start_date=payload.start_date,
        target_completion_date=payload.target_completion_date,
        commercial_baseline=commercial_baseline,
        baseline_expense_cap_minor=cap_minor,
        effective_expense_cap_minor=cap_minor,
        per_expense_threshold_minor=threshold_minor,
        expense_policy_snapshot=policy if policy else None,
        notes=payload.notes,
    )
    repo = EngagementRepository(db)
    repo.add(engagement)
    await db.commit()
    await db.refresh(engagement)
    return engagement


def build_scope_change_approval_url(token: str) -> str:
    return f"{settings.WEB_BASE_URL.rstrip('/')}/sc/{token}"


def map_scope_change_to_response(
    change_req: ScopeChangeRequest,
    approval_token: Optional[str] = None,
    approval_email_queued: bool = False,
) -> ScopeChangeResponse:
    return ScopeChangeResponse(
        id=change_req.id,
        workspace_id=change_req.workspace_id,
        engagement_id=change_req.engagement_id,
        client_id=change_req.client_id,
        expense_id=change_req.expense_id,
        change_type=change_req.change_type,
        title=change_req.title,
        description=change_req.description,
        delta_amount_minor=change_req.delta_amount_minor,
        currency=change_req.currency,
        status=change_req.status,
        approval_url=(
            build_scope_change_approval_url(approval_token) if approval_token else None
        ),
        approval_token_expires_at=change_req.approval_token_expires_at,
        approval_email_queued=approval_email_queued,
        accepted_at=change_req.accepted_at,
        accepted_by_name=change_req.accepted_by_name,
        declined_at=change_req.declined_at,
        decline_reason=change_req.decline_reason,
        created_at=change_req.created_at,
        updated_at=change_req.updated_at,
    )


async def create_scope_change_request(
    db: AsyncSession,
    workspace: Workspace,
    engagement_id: str,
    payload: ScopeChangeCreateRequest,
) -> tuple[ScopeChangeRequest, str, bool]:
    """Create a scope-change request for cap exceedance without mutating the baseline cap (FR-085, AC-019).

    Returns the request, the raw approval token (exposed only once because only
    its hash is persisted), and whether the approval email was queued.
    """
    eng_repo = EngagementRepository(db)
    engagement = await eng_repo.get_by_id(workspace.id, engagement_id)
    if not engagement:
        raise NotFoundException(f"Engagement '{engagement_id}' not found.")

    exp_repo = ExpenseRepository(db)
    expense: Optional[Expense] = None
    delta_minor = payload.delta_amount_minor

    if payload.expense_id:
        expense = await exp_repo.get_by_id(workspace.id, payload.expense_id)
        if not expense or expense.engagement_id != engagement.id:
            raise NotFoundException("Expense not found for this engagement.")
        if delta_minor is None:
            total_billable = await exp_repo.sum_billable_expenses(workspace.id, engagement.id)
            cap = engagement.effective_expense_cap_minor or 0
            delta_minor = max(expense.amount_minor, total_billable - cap)

    if not delta_minor or delta_minor <= 0:
        raise BadRequestException("A positive cap increase amount is required.")

    title = (payload.title or "").strip() or (
        f"Expense cap increase for: {expense.description}" if expense else "Expense cap increase"
    )
    description = (payload.description or "").strip() or (
        f"Requested cap increase of {delta_minor} minor units ({engagement.currency}) to cover {expense.description}."
        if expense
        else None
    )

    token, token_hash = generate_share_token()
    now = datetime.now(timezone.utc)

    change_req = ScopeChangeRequest(
        workspace_id=workspace.id,
        engagement_id=engagement.id,
        client_id=engagement.client_id,
        expense_id=expense.id if expense else None,
        change_type="expense_cap_increase",
        title=title[:255],
        description=description,
        delta_amount_minor=delta_minor,
        currency=engagement.currency,
        status="pending",
        approval_token_hash=token_hash,
        approval_token_expires_at=now + timedelta(days=14),
    )

    sc_repo = ScopeChangeRepository(db)
    sc_repo.add(change_req)
    await db.flush()

    email_queued = False
    if payload.send_email:
        client = await db.get(Client, change_req.client_id)
        if client is not None and client.email:
            enqueue_scope_change_approval_link(
                db,
                change_request_id=change_req.id,
                recipient=client.email,
                business_name=workspace.business_name,
                client_name=client.name,
                title=change_req.title,
                formatted_delta=format_money(
                    change_req.delta_amount_minor, change_req.currency
                ),
                share_url=build_scope_change_approval_url(token),
                expires_at=change_req.approval_token_expires_at.strftime("%d %b %Y"),
            )
            email_queued = True

    await db.commit()
    await db.refresh(change_req)
    return change_req, token, email_queued


async def regenerate_scope_change_approval_link(
    db: AsyncSession,
    workspace: Workspace,
    change_request_id: str,
    *,
    send_email: bool = False,
) -> tuple[ScopeChangeRequest, str, bool]:
    """Rotate a scope-change approval link and return the new raw token once.

    Only a pending request can have a live approval link. Regenerating revokes
    the previous link immediately.
    """
    sc_repo = ScopeChangeRepository(db)
    change_req = await sc_repo.get_by_id(
        workspace.id, change_request_id, for_update=True
    )
    if not change_req:
        raise NotFoundException(
            f"Scope change request '{change_request_id}' not found."
        )

    if change_req.status != "pending":
        raise BadRequestException(
            "Only a pending scope change request can have an approval link."
        )

    token, token_hash = generate_share_token()
    change_req.approval_token_hash = token_hash
    change_req.approval_token_expires_at = datetime.now(timezone.utc) + timedelta(days=14)

    email_queued = False
    if send_email:
        client = await db.get(Client, change_req.client_id)
        if client is not None and client.email:
            enqueue_scope_change_approval_link(
                db,
                change_request_id=change_req.id,
                recipient=client.email,
                business_name=workspace.business_name,
                client_name=client.name,
                title=change_req.title,
                formatted_delta=format_money(
                    change_req.delta_amount_minor, change_req.currency
                ),
                share_url=build_scope_change_approval_url(token),
                expires_at=change_req.approval_token_expires_at.strftime("%d %b %Y"),
            )
            email_queued = True

    await db.commit()
    await db.refresh(change_req)
    return change_req, token, email_queued


async def accept_public_scope_change(
    db: AsyncSession,
    token: str,
    payload: ScopeChangeAcceptRequest,
) -> ScopeChangeRequest:
    """Client accepts a scope-change request, raising effective_expense_cap_minor while preserving baseline (AC-019)."""
    sc_repo = ScopeChangeRepository(db)
    change_req = await sc_repo.get_by_approval_token(token, for_update=True)
    if not change_req:
        raise NotFoundException("Scope change request not found or invalid link.")

    if change_req.approval_token_expires_at is not None:
        now = datetime.now(timezone.utc)
        expires_at = change_req.approval_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now:
            raise BadRequestException("This scope change link has expired.")

    if change_req.status != "pending":
        raise BadRequestException(
            f"Scope change request cannot be accepted in '{change_req.status}' status."
        )

    actor_name = payload.accepted_by_name.strip()
    if not actor_name:
        raise BadRequestException("Approver name is required.")

    eng_repo = EngagementRepository(db)
    engagement = await eng_repo.get_by_id(
        change_req.workspace_id, change_req.engagement_id, for_update=True
    )
    if not engagement:
        raise NotFoundException("Engagement not found.")

    # Never mutate baseline_expense_cap_minor; only update effective_expense_cap_minor (AC-019)
    current_effective = engagement.effective_expense_cap_minor or 0
    engagement.effective_expense_cap_minor = current_effective + change_req.delta_amount_minor

    change_req.status = "accepted"
    change_req.accepted_at = datetime.now(timezone.utc)
    change_req.accepted_by_name = actor_name

    # Release linked expense if it was awaiting cap approval
    if change_req.expense_id:
        exp_repo = ExpenseRepository(db)
        expense = await exp_repo.get_by_id(change_req.workspace_id, change_req.expense_id)
        if expense and expense.approval_status == "pending_approval":
            other_total = await exp_repo.sum_billable_expenses(
                change_req.workspace_id,
                engagement.id,
                exclude_expense_id=expense.id,
            )
            eval_result, _ = evaluate_expense_policy(expense.amount_minor, other_total, engagement)
            if eval_result != "exceeds_cap":
                expense.approval_status = "approved"
                expense.approved_at = change_req.accepted_at
                expense.approved_by_name = actor_name

    await db.commit()
    await db.refresh(change_req)
    return change_req


async def decline_public_scope_change(
    db: AsyncSession,
    token: str,
    payload: ScopeChangeDeclineRequest,
) -> ScopeChangeRequest:
    """Client declines a scope-change request; effective cap remains unchanged and expense stays blocked (AC-019)."""
    sc_repo = ScopeChangeRepository(db)
    change_req = await sc_repo.get_by_approval_token(token, for_update=True)
    if not change_req:
        raise NotFoundException("Scope change request not found or invalid link.")

    if change_req.status != "pending":
        raise BadRequestException(
            f"Scope change request cannot be declined in '{change_req.status}' status."
        )

    reason = payload.reason.strip()
    if not reason:
        raise BadRequestException("A reason is required when declining a scope change.")

    change_req.status = "declined"
    change_req.declined_at = datetime.now(timezone.utc)
    change_req.decline_reason = reason

    if change_req.expense_id:
        exp_repo = ExpenseRepository(db)
        expense = await exp_repo.get_by_id(change_req.workspace_id, change_req.expense_id)
        if expense and expense.approval_status == "pending_approval":
            expense.approval_status = "declined"
            expense.declined_at = change_req.declined_at
            expense.decline_reason = reason

    await db.commit()
    await db.refresh(change_req)
    return change_req


async def get_engagement_margin(
    db: AsyncSession,
    workspace: Workspace,
    engagement_id: str,
) -> EngagementMarginResponse:
    """Computes engagement margin using confirmed payments only (FR-088, AC-027)."""
    eng_repo = EngagementRepository(db)
    engagement = await eng_repo.get_by_id(workspace.id, engagement_id)
    if not engagement:
        raise NotFoundException(f"Engagement '{engagement_id}' not found.")

    # Gather all invoices tied to this engagement (via quote_id, engagement_id, or billed expenses)
    exp_invoice_ids_stmt = select(Expense.invoice_id).where(
        Expense.workspace_id == workspace.id,
        Expense.engagement_id == engagement.id,
        Expense.invoice_id.is_not(None),
    )
    exp_inv_res = await db.execute(exp_invoice_ids_stmt)
    invoice_ids = {row[0] for row in exp_inv_res.all() if row[0]}

    eng_inv_stmt = select(Invoice.id).where(
        Invoice.workspace_id == workspace.id,
        (Invoice.engagement_id == engagement.id)
        | (Invoice.quote_id == engagement.quote_id if engagement.quote_id else False),
    )
    eng_inv_res = await db.execute(eng_inv_stmt)
    for row in eng_inv_res.all():
        invoice_ids.add(row[0])

    confirmed_received_minor = 0
    outstanding_invoiced_minor = 0

    if invoice_ids:
        # Confirmed payments come strictly from verified Receipt records
        rcp_stmt = select(func.coalesce(func.sum(Receipt.amount_paid_minor), 0)).where(
            Receipt.workspace_id == workspace.id,
            Receipt.invoice_id.in_(invoice_ids),
            Receipt.is_verified == True,
        )
        confirmed_received_minor = int((await db.execute(rcp_stmt)).scalar_one() or 0)

        # Outstanding invoiced amounts exclude draft and cancelled/voided invoices
        inv_stmt = select(Invoice).where(
            Invoice.workspace_id == workspace.id,
            Invoice.id.in_(invoice_ids),
            Invoice.status.notin_(("draft", "cancelled", "void")),
            Invoice.voided_at.is_(None),
        )
        invoices = (await db.execute(inv_stmt)).scalars().all()
        for inv in invoices:
            target = inv.net_payable_minor if inv.net_payable_minor is not None else inv.total_minor
            outstanding_invoiced_minor += max(0, (target or 0) - (inv.amount_paid_minor or 0))

    # Costs include both billable and non-billable expenses (excluding declined billable requests)
    billable_stmt = select(func.coalesce(func.sum(Expense.amount_minor), 0)).where(
        Expense.workspace_id == workspace.id,
        Expense.engagement_id == engagement.id,
        Expense.billable == True,
        Expense.approval_status != "declined",
    )
    billable_costs_minor = int((await db.execute(billable_stmt)).scalar_one() or 0)

    non_billable_stmt = select(func.coalesce(func.sum(Expense.amount_minor), 0)).where(
        Expense.workspace_id == workspace.id,
        Expense.engagement_id == engagement.id,
        Expense.billable == False,
    )
    non_billable_costs_minor = int((await db.execute(non_billable_stmt)).scalar_one() or 0)

    total_costs_minor = billable_costs_minor + non_billable_costs_minor
    net_margin_minor = confirmed_received_minor - total_costs_minor

    return EngagementMarginResponse(
        engagement_id=engagement.id,
        currency=engagement.currency,
        confirmed_received_minor=confirmed_received_minor,
        outstanding_invoiced_minor=outstanding_invoiced_minor,
        billable_costs_minor=billable_costs_minor,
        non_billable_costs_minor=non_billable_costs_minor,
        total_costs_minor=total_costs_minor,
        net_margin_minor=net_margin_minor,
        baseline_expense_cap_minor=engagement.baseline_expense_cap_minor,
        effective_expense_cap_minor=engagement.effective_expense_cap_minor,
    )
