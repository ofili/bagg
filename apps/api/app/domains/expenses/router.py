from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.workspaces.dependencies import resolve_active_workspace
from app.domains.workspaces.models import Workspace
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
from app.domains.expenses import service as expense_service
from app.integrations.storage import StorageService

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    payload: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    expense, approval_token, email_queued = await expense_service.record_expense(
        db, workspace, payload
    )
    return expense_service.map_expense_to_response(
        expense,
        approval_token=approval_token,
        approval_email_queued=email_queued,
    )


@router.get("/engagement/{engagement_id}", response_model=List[ExpenseResponse])
async def list_expenses_by_engagement(
    engagement_id: str,
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    expenses = await expense_service.list_expenses(db, workspace, engagement_id)
    return [expense_service.map_expense_to_response(e) for e in expenses]


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    expense, approval_token = await expense_service.update_expense(
        db, workspace, expense_id, payload
    )
    return expense_service.map_expense_to_response(expense, approval_token=approval_token)


@router.post("/{expense_id}/approval-link/regenerate", response_model=ExpenseResponse)
async def regenerate_expense_approval_link(
    expense_id: str,
    send_email: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    expense, approval_token, email_queued = (
        await expense_service.regenerate_expense_approval_link(
            db, workspace, expense_id, send_email=send_email
        )
    )
    return expense_service.map_expense_to_response(
        expense,
        approval_token=approval_token,
        approval_email_queued=email_queued,
    )


@router.post("/receipt-upload-url")
async def get_receipt_upload_url(
    filename: str,
    engagement_id: str,
    workspace: Workspace = Depends(resolve_active_workspace),
):
    storage = StorageService()
    return storage.get_presigned_upload_url(
        filename=filename,
        workspace_id=workspace.id,
        engagement_id=engagement_id,
    )


@router.post("/add-to-invoice", response_model=AddExpensesToInvoiceResponse)
async def add_expenses_to_invoice(
    payload: AddExpensesToInvoiceRequest,
    db: AsyncSession = Depends(get_db),
    workspace: Workspace = Depends(resolve_active_workspace),
):
    return await expense_service.add_expenses_to_invoice(db, workspace, payload)


@router.get("/public/{token}", response_model=PublicExpenseView)
async def view_public_expense(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    return await expense_service.view_public_expense(db, token)


@router.post("/public/{token}/approve", response_model=ExpenseResponse)
async def approve_public_expense(
    token: str,
    payload: ExpenseApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    expense = await expense_service.approve_public_expense(db, token, payload)
    return expense_service.map_expense_to_response(expense)


@router.post("/public/{token}/decline", response_model=ExpenseResponse)
async def decline_public_expense(
    token: str,
    payload: ExpenseDeclineRequest,
    db: AsyncSession = Depends(get_db),
):
    expense = await expense_service.decline_public_expense(db, token, payload)
    return expense_service.map_expense_to_response(expense)
