from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime, date
from app.core.money import validate_currency


class ExpenseCreate(BaseModel):
    engagement_id: str
    amount_minor: int = Field(..., gt=0)
    currency: str = "NGN"
    expense_date: Optional[date] = None
    description: str = Field(..., min_length=1, max_length=500)
    category: Optional[str] = Field(default=None, max_length=100)
    billable: bool = True
    milestone_id: Optional[str] = None
    retainer_period: Optional[str] = None
    receipt_filename: Optional[str] = None
    receipt_storage_path: Optional[str] = None
    receipt_content_type: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def check_currency(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not validate_currency(normalized):
            raise ValueError("Unsupported expense currency.")
        return normalized


class ExpenseUpdate(BaseModel):
    amount_minor: Optional[int] = Field(default=None, gt=0)
    currency: Optional[str] = None
    expense_date: Optional[date] = None
    description: Optional[str] = Field(default=None, min_length=1, max_length=500)
    category: Optional[str] = Field(default=None, max_length=100)
    billable: Optional[bool] = None
    milestone_id: Optional[str] = None
    retainer_period: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def check_currency(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().upper()
        if not validate_currency(normalized):
            raise ValueError("Unsupported expense currency.")
        return normalized


class ExpenseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    bagg_reference: str
    workspace_id: str
    engagement_id: str
    client_id: str
    amount_minor: int
    currency: str
    expense_date: date
    description: str
    category: Optional[str] = None
    billable: bool
    milestone_id: Optional[str] = None
    retainer_period: Optional[str] = None

    receipt_filename: Optional[str] = None
    receipt_download_url: Optional[str] = None

    approval_status: str
    approval_requested_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by_name: Optional[str] = None
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None

    invoicing_status: str
    invoice_id: Optional[str] = None
    invoiced_at: Optional[datetime] = None

    reimbursement_status: str
    reimbursed_at: Optional[datetime] = None

    policy_evaluation: Optional[str] = None  # in_policy, needs_approval, exceeds_cap
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ExpenseApprovalRequest(BaseModel):
    approved_by_name: str = Field(..., min_length=1, max_length=255)


class ExpenseDeclineRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)


class PublicExpenseView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    bagg_reference: str
    description: str
    category: Optional[str] = None
    amount_minor: int
    currency: str
    expense_date: date
    receipt_filename: Optional[str] = None
    receipt_download_url: Optional[str] = None
    approval_status: str
    approved_at: Optional[datetime] = None
    approved_by_name: Optional[str] = None
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None
    business_name: str
    client_name: Optional[str] = None
    expense_policy_snapshot: Optional[dict[str, Any]] = None
    is_expired: bool = False


class AddExpensesToInvoiceRequest(BaseModel):
    expense_ids: List[str] = Field(..., min_length=1)
    invoice_id: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None


class AddExpensesToInvoiceResponse(BaseModel):
    invoice_id: str
    added_expense_ids: List[str]
    total_added_minor: int
    invoice_total_minor: int
