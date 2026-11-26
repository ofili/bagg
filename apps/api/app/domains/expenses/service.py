from datetime import datetime, date, timedelta, timezone
from typing import Optional, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import NotFoundException, BadRequestException
from app.core.security import generate_share_token
from app.domains.clients.models import Client
from app.domains.engagements.models import Engagement
from app.domains.engagements.repository import EngagementRepository
from app.domains.expenses.models import Expense
from app.domains.expenses.repository import ExpenseRepository
from app.domains.expenses.schemas import (
    AddExpensesToInvoiceRequest,
    AddExpensesToInvoiceResponse,
    ExpenseApprovalRequest,
    ExpenseCreate,
    ExpenseDeclineRequest,
    ExpenseResponse,
    ExpenseUpdate,
    PublicExpenseView,
)
from app.domains.invoices.models import Invoice, InvoiceLineItem
from app.domains.invoices.repository import InvoiceRepository
from app.domains.workspaces.models import Workspace
from app.integrations.storage import StorageService


def evaluate_expense_policy(
    amount_minor: int,
    current_billable_total_minor: int,
    engagement: Engagement,
) -> Tuple[str, str]:
    """Evaluates an expense against the engagement's commercial baseline policy (FR-083).

    Returns:
        (policy_evaluation, initial_approval_status)
        policy_evaluation: "in_policy", "needs_approval", "exceeds_cap"
        initial_approval_status: "not_required", "pending_approval"
    """
    effective_cap = engagement.effective_expense_cap_minor
    threshold = engagement.per_expense_threshold_minor

    # Check cap exceedance first (FR-085, AC-019)
    if effective_cap is not None and (current_billable_total_minor + amount_minor) > effective_cap:
        return "exceeds_cap", "pending_approval"

    # Check per-expense threshold (FR-080, AC-016)
    if threshold is not None and amount_minor > threshold:
        return "needs_approval", "pending_approval"

    return "in_policy", "not_required"


def build_expense_approval_url(token: str) -> str:
    return f"{settings.WEB_BASE_URL.rstrip('/')}/e/{token}"


async def record_expense(
    db: AsyncSession,
    workspace: Workspace,
    payload: ExpenseCreate,
) -> Tuple[Expense, Optional[str]]:
    """Record a new expense against an engagement (FR-081, AC-015, AC-016).

    Returns the expense and, when client approval is required, the raw approval
    token. The token is returned exactly once because only its hash is stored.
    """
    eng_repo = EngagementRepository(db)
    engagement = await eng_repo.get_by_id(workspace.id, payload.engagement_id)
    if not engagement:
        raise NotFoundException(f"Engagement '{payload.engagement_id}' not found.")

    if payload.currency.upper() != engagement.currency.upper():
        raise BadRequestException(
            f"Expense currency ({payload.currency}) must match engagement currency ({engagement.currency}) in v1."
        )

    # Validate receipt storage path belongs to the workspace and engagement (AC-026)
    if payload.receipt_storage_path:
        expected_prefix = f"workspaces/{workspace.id}/engagements/{engagement.id}/"
        if (
            not payload.receipt_storage_path.startswith(expected_prefix)
            or ".." in payload.receipt_storage_path.split("/")
        ):
            raise BadRequestException("Invalid receipt storage path for this workspace and engagement.")

    exp_repo = ExpenseRepository(db)

    # Policy evaluation
    if payload.billable:
        current_total = await exp_repo.sum_billable_expenses(workspace.id, engagement.id)
        evaluation, approval_status = evaluate_expense_policy(
            payload.amount_minor, current_total, engagement
        )
    else:
        # Non-billable expenses are recorded for margin and never require client approval (FR-087)
        evaluation, approval_status = "in_policy", "not_required"

    token, token_hash = generate_share_token()
    now = datetime.now(timezone.utc)

    expense = Expense(
        workspace_id=workspace.id,
        engagement_id=engagement.id,
        client_id=engagement.client_id,
        amount_minor=payload.amount_minor,
        currency=payload.currency.upper(),
        expense_date=payload.expense_date or date.today(),
        description=payload.description.strip(),
        category=payload.category,
        billable=payload.billable,
        milestone_id=payload.milestone_id,
        retainer_period=payload.retainer_period,
        receipt_filename=payload.receipt_filename,
        receipt_storage_path=payload.receipt_storage_path,
        receipt_content_type=payload.receipt_content_type,
        approval_status=approval_status,
        approval_requested_at=now if approval_status == "pending_approval" else None,
        approval_token_hash=token_hash if approval_status == "pending_approval" else None,
        approval_token_expires_at=(now + timedelta(days=14)) if approval_status == "pending_approval" else None,
        notes=payload.notes,
    )

    exp_repo.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense, token if approval_status == "pending_approval" else None


async def update_expense(
    db: AsyncSession,
    workspace: Workspace,
    expense_id: str,
    payload: ExpenseUpdate,
) -> Tuple[Expense, Optional[str]]:
    """Updates an expense. Re-evaluates policy and invalidates prior approvals if amount/billable changes (AC-018).

    Returns the expense and a newly generated raw approval token when the
    update moves the expense back into ``pending_approval``.
    """
    exp_repo = ExpenseRepository(db)
    expense = await exp_repo.get_by_id(workspace.id, expense_id)
    if not expense:
        raise NotFoundException(f"Expense '{expense_id}' not found.")

    # Guard: locked if already attached to an active invoice (AC-021, Decision 9)
    if expense.invoicing_status in {"drafted", "invoiced"}:
        raise BadRequestException(
            "Expense is already attached to an invoice. Corrections must be handled through invoice line adjustment."
        )

    eng_repo = EngagementRepository(db)
    engagement = await eng_repo.get_by_id(workspace.id, expense.engagement_id)

    amount_changed = payload.amount_minor is not None and payload.amount_minor != expense.amount_minor
    billable_changed = payload.billable is not None and payload.billable != expense.billable

    if payload.description is not None:
        expense.description = payload.description.strip()
    if payload.category is not None:
        expense.category = payload.category
    if payload.expense_date is not None:
        expense.expense_date = payload.expense_date
    if payload.notes is not None:
        expense.notes = payload.notes
    if payload.milestone_id is not None:
        expense.milestone_id = payload.milestone_id
    if payload.retainer_period is not None:
        expense.retainer_period = payload.retainer_period

    approval_token: Optional[str] = None

    if amount_changed or billable_changed:
        new_amount = payload.amount_minor if payload.amount_minor is not None else expense.amount_minor
        new_billable = payload.billable if payload.billable is not None else expense.billable

        expense.amount_minor = new_amount
        expense.billable = new_billable

        # Invalidate previous approval if modified (AC-018)
        expense.approved_at = None
        expense.approved_by_name = None
        expense.declined_at = None
        expense.decline_reason = None

        if new_billable and engagement:
            current_total = await exp_repo.sum_billable_expenses(
                workspace.id, engagement.id, exclude_expense_id=expense.id
            )
            _, approval_status = evaluate_expense_policy(new_amount, current_total, engagement)
            expense.approval_status = approval_status
            if approval_status == "pending_approval":
                now = datetime.now(timezone.utc)
                approval_token, token_hash = generate_share_token()
                expense.approval_token_hash = token_hash
                expense.approval_requested_at = now
                expense.approval_token_expires_at = now + timedelta(days=14)
            else:
                expense.approval_token_hash = None
                expense.approval_token_expires_at = None
        else:
            expense.approval_status = "not_required"
            expense.approval_token_hash = None
            expense.approval_token_expires_at = None

    await db.commit()
    await db.refresh(expense)
    return expense, approval_token


async def regenerate_expense_approval_link(
    db: AsyncSession,
    workspace: Workspace,
    expense_id: str,
) -> Tuple[Expense, str]:
    """Rotate an expense approval link and return the new raw token once.

    Only a billable expense that is still awaiting client approval can have a
    live approval link. Regenerating revokes the previous link immediately.
    """
    exp_repo = ExpenseRepository(db)
    expense = await exp_repo.get_by_id(workspace.id, expense_id, for_update=True)
    if not expense:
        raise NotFoundException(f"Expense '{expense_id}' not found.")

    if not expense.billable or expense.approval_status != "pending_approval":
        raise BadRequestException(
            "Only a billable expense awaiting client approval can have an approval link."
        )

    token, token_hash = generate_share_token()
    now = datetime.now(timezone.utc)
    expense.approval_token_hash = token_hash
    expense.approval_requested_at = now
    expense.approval_token_expires_at = now + timedelta(days=14)

    await db.commit()
    await db.refresh(expense)
    return expense, token


async def list_expenses(
    db: AsyncSession,
    workspace: Workspace,
    engagement_id: str,
) -> List[Expense]:
    """Lists all expenses for an engagement (for provider view)."""
    repo = ExpenseRepository(db)
    return await repo.list_by_engagement(workspace.id, engagement_id, include_non_billable=True)


def map_expense_to_response(
    expense: Expense, approval_token: Optional[str] = None
) -> ExpenseResponse:
    storage = StorageService()
    download_url = (
        storage.get_presigned_download_url(expense.receipt_storage_path)
        if expense.receipt_storage_path
        else None
    )

    return ExpenseResponse(
        id=expense.id,
        bagg_reference=expense.bagg_reference,
        workspace_id=expense.workspace_id,
        engagement_id=expense.engagement_id,
        client_id=expense.client_id,
        amount_minor=expense.amount_minor,
        currency=expense.currency,
        expense_date=expense.expense_date,
        description=expense.description,
        category=expense.category,
        billable=expense.billable,
        milestone_id=expense.milestone_id,
        retainer_period=expense.retainer_period,
        receipt_filename=expense.receipt_filename,
        receipt_download_url=download_url,
        approval_status=expense.approval_status,
        approval_requested_at=expense.approval_requested_at,
        approved_at=expense.approved_at,
        approved_by_name=expense.approved_by_name,
        declined_at=expense.declined_at,
        decline_reason=expense.decline_reason,
        approval_token=approval_token,
        approval_url=(
            build_expense_approval_url(approval_token) if approval_token else None
        ),
        approval_token_expires_at=expense.approval_token_expires_at,
        invoicing_status=expense.invoicing_status,
        invoice_id=expense.invoice_id,
        invoiced_at=expense.invoiced_at,
        reimbursement_status=expense.reimbursement_status,
        reimbursed_at=expense.reimbursed_at,
        notes=expense.notes,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
    )


def _ensure_approval_token_active(expense: Expense) -> None:
    if not expense.billable:
        raise NotFoundException("Expense not found or invalid link.")
    if expense.approval_token_expires_at is not None:
        now = datetime.now(timezone.utc)
        expires_at = expense.approval_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now:
            raise BadRequestException("This expense approval link has expired.")


async def view_public_expense(db: AsyncSession, token: str) -> PublicExpenseView:
    """Public client view of an expense awaiting or having received approval (FR-084, AC-025, AC-026)."""
    repo = ExpenseRepository(db)
    expense = await repo.get_by_approval_token(token)
    if not expense or not expense.billable:
        raise NotFoundException("Expense not found or invalid link.")

    now = datetime.now(timezone.utc)
    is_expired = False
    if expense.approval_token_expires_at is not None:
        expires_at = expense.approval_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        is_expired = expires_at < now

    if is_expired and expense.approval_status == "pending_approval":
        raise BadRequestException("This expense approval link has expired.")

    ws_res = await db.execute(select(Workspace).where(Workspace.id == expense.workspace_id))
    workspace = ws_res.scalar_one_or_none()
    cl_res = await db.execute(select(Client).where(Client.id == expense.client_id))
    client = cl_res.scalar_one_or_none()

    storage = StorageService()
    download_url = (
        storage.get_presigned_download_url(expense.receipt_storage_path)
        if expense.receipt_storage_path
        else None
    )

    engagement = await EngagementRepository(db).get_by_id(
        expense.workspace_id, expense.engagement_id
    )

    return PublicExpenseView(
        id=expense.id,
        bagg_reference=expense.bagg_reference,
        description=expense.description,
        category=expense.category,
        amount_minor=expense.amount_minor,
        currency=expense.currency,
        expense_date=expense.expense_date,
        receipt_filename=expense.receipt_filename,
        receipt_download_url=download_url,
        approval_status=expense.approval_status,
        approved_at=expense.approved_at,
        approved_by_name=expense.approved_by_name,
        declined_at=expense.declined_at,
        decline_reason=expense.decline_reason,
        business_name=workspace.business_name if workspace else "Studio Bagg",
        client_name=client.name if client else None,
        expense_policy_snapshot=engagement.expense_policy_snapshot if engagement else None,
        is_expired=is_expired,
    )


async def approve_public_expense(
    db: AsyncSession,
    token: str,
    payload: ExpenseApprovalRequest,
) -> Expense:
    """Client approves a billable expense via secure link (FR-084, AC-017)."""
    repo = ExpenseRepository(db)
    expense = await repo.get_by_approval_token(token, for_update=True)
    if not expense:
        raise NotFoundException("Expense not found or invalid link.")

    _ensure_approval_token_active(expense)

    if expense.approval_status != "pending_approval":
        raise BadRequestException(
            f"Expense cannot be approved in '{expense.approval_status}' status."
        )

    actor_name = payload.approved_by_name.strip()
    if not actor_name:
        raise BadRequestException("Approver name is required.")

    from app.domains.engagements.repository import ScopeChangeRepository

    engagement = await EngagementRepository(db).get_by_id(
        expense.workspace_id, expense.engagement_id
    )

    expense.approval_status = "approved"
    expense.approved_at = datetime.now(timezone.utc)
    expense.approved_by_name = actor_name
    if engagement:
        scope_changes = await ScopeChangeRepository(db).list_by_engagement(
            engagement.workspace_id, engagement.id
        )
        approved_changes_count = sum(1 for sc in scope_changes if sc.status == "approved")
        expense.policy_snapshot_at_approval = {
            **(engagement.expense_policy_snapshot or {}),
            "policy_version": f"v1.{approved_changes_count}",
            "effective_expense_cap_minor": engagement.effective_expense_cap_minor,
            "per_expense_threshold_minor": engagement.per_expense_threshold_minor,
        }
    await db.commit()
    await db.refresh(expense)
    return expense


async def decline_public_expense(
    db: AsyncSession,
    token: str,
    payload: ExpenseDeclineRequest,
) -> Expense:
    """Client declines a billable expense via secure link (FR-084, AC-017)."""
    repo = ExpenseRepository(db)
    expense = await repo.get_by_approval_token(token, for_update=True)
    if not expense:
        raise NotFoundException("Expense not found or invalid link.")

    _ensure_approval_token_active(expense)

    if expense.approval_status != "pending_approval":
        raise BadRequestException(
            f"Expense cannot be declined in '{expense.approval_status}' status."
        )

    reason = payload.reason.strip()
    if not reason:
        raise BadRequestException("A reason is required when declining an expense.")

    expense.approval_status = "declined"
    expense.declined_at = datetime.now(timezone.utc)
    expense.decline_reason = reason
    await db.commit()
    await db.refresh(expense)
    return expense


async def add_expenses_to_invoice(
    db: AsyncSession,
    workspace: Workspace,
    payload: AddExpensesToInvoiceRequest,
) -> AddExpensesToInvoiceResponse:
    """Adds approved/in-policy billable expenses to a draft invoice or a new standalone expenses invoice (BAG-EXP-005)."""
    unique_ids = list(dict.fromkeys(payload.expense_ids))
    exp_repo = ExpenseRepository(db)
    expenses = await exp_repo.get_for_update_by_ids(workspace.id, unique_ids)

    if len(expenses) != len(unique_ids):
        raise NotFoundException("One or more requested expenses were not found in this workspace.")

    clients = {e.client_id for e in expenses}
    currencies = {e.currency.upper() for e in expenses}
    if len(clients) > 1:
        raise BadRequestException("All expenses added to an invoice must belong to the same client.")
    if len(currencies) > 1:
        raise BadRequestException("All expenses added to an invoice must use the same currency.")

    client_id = next(iter(clients))
    currency = next(iter(currencies))

    # Validate each expense's eligibility (AC-016, AC-017, AC-019, AC-020, AC-022)
    engagement_ids = {e.engagement_id for e in expenses}
    eng_repo = EngagementRepository(db)
    engagements_by_id = {}
    for eng_id in engagement_ids:
        eng = await eng_repo.get_by_id(workspace.id, eng_id)
        if not eng:
            raise NotFoundException(f"Engagement '{eng_id}' not found.")
        engagements_by_id[eng_id] = eng

    for exp in expenses:
        if not exp.billable:
            raise BadRequestException(
                f"Expense '{exp.description}' is non-billable and cannot be added to an invoice."
            )
        if exp.approval_status not in {"not_required", "approved"}:
            raise BadRequestException(
                f"Expense '{exp.description}' has approval status '{exp.approval_status}' and cannot be billed."
            )
        if exp.invoicing_status != "uninvoiced" or exp.invoice_id is not None:
            raise BadRequestException(
                f"Expense '{exp.description}' is already attached to an active invoice."
            )

    # Check cap exceedance per engagement (AC-019)
    for eng_id, eng in engagements_by_id.items():
        if eng.effective_expense_cap_minor is not None:
            # Sum current billable expenses already on invoices plus the new expenses to be added
            billed_stmt = select(func.coalesce(func.sum(Expense.amount_minor), 0)).where(
                Expense.workspace_id == workspace.id,
                Expense.engagement_id == eng_id,
                Expense.billable == True,
                Expense.invoicing_status.in_(("drafted", "invoiced")),
                Expense.id.notin_(unique_ids),
            )
            already_billed = int((await db.execute(billed_stmt)).scalar_one() or 0)
            adding_for_eng = sum(e.amount_minor for e in expenses if e.engagement_id == eng_id)
            if (already_billed + adding_for_eng) > eng.effective_expense_cap_minor:
                raise BadRequestException(
                    "Selected expenses exceed the engagement expense cap. "
                    "An accepted scope-change request is required before billing."
                )

    inv_repo = InvoiceRepository(db)
    if payload.invoice_id:
        invoice = await inv_repo.get_for_update(workspace.id, payload.invoice_id)
        if not invoice:
            raise NotFoundException(f"Invoice '{payload.invoice_id}' not found.")
        if invoice.status != "draft":
            raise BadRequestException(
                "Expenses cannot be added to a finalised, sent, or paid invoice. Create a new draft invoice instead."
            )
        if invoice.client_id != client_id:
            raise BadRequestException("Expenses do not match the target invoice's client.")
        if invoice.currency.upper() != currency:
            raise BadRequestException(
                f"Expense currency ({currency}) must match invoice currency ({invoice.currency}) in v1."
            )
        next_pos = max((item.position for item in (invoice.items or [])), default=-1) + 1
    else:
        raw_token, token_hash = generate_share_token()
        invoice = Invoice(
            workspace_id=workspace.id,
            client_id=client_id,
            engagement_id=next(iter(engagement_ids)) if len(engagement_ids) == 1 else None,
            currency=currency,
            status="draft",
            issue_date=date.today(),
            due_date=payload.due_date,
            subtotal_minor=0,
            discount_minor=0,
            tax_rate_percent=0.0,
            tax_minor=0,
            total_minor=0,
            wht_rate_percent=0.0,
            wht_minor=0,
            net_payable_minor=0,
            amount_paid_minor=0,
            notes=payload.notes or "Reimbursable engagement expenses",
            share_token=raw_token,
            share_token_hash=token_hash,
            version=1,
        )
        inv_repo.add(invoice)
        await inv_repo.flush()
        next_pos = 0

    total_added_minor = 0
    added_ids: List[str] = []
    now = datetime.now(timezone.utc)

    for idx, exp in enumerate(expenses):
        desc = exp.description
        if exp.receipt_filename:
            desc = f"{desc} (Receipt: {exp.receipt_filename})"

        line_item = InvoiceLineItem(
            invoice_id=invoice.id,
            position=next_pos + idx,
            description=desc,
            quantity=1,
            unit_price_minor=exp.amount_minor,
            total_minor=exp.amount_minor,
        )
        db.add(line_item)
        await db.flush()

        exp.invoicing_status = "drafted"
        exp.invoice_id = invoice.id
        exp.invoice_item_id = line_item.id
        exp.invoiced_at = now

        total_added_minor += exp.amount_minor
        added_ids.append(exp.id)

    # Pass-through expense lines carry no computed tax or WHT in v1 (Decision 4 / BAG-EXP-005)
    invoice.subtotal_minor = (invoice.subtotal_minor or 0) + total_added_minor
    invoice.total_minor = (invoice.total_minor or 0) + total_added_minor
    invoice.net_payable_minor = (invoice.net_payable_minor or 0) + total_added_minor

    await db.commit()
    await db.refresh(invoice)

    return AddExpensesToInvoiceResponse(
        invoice_id=invoice.id,
        added_expense_ids=added_ids,
        total_added_minor=total_added_minor,
        invoice_total_minor=invoice.total_minor,
    )
