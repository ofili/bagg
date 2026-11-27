from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, date


class EngagementCreate(BaseModel):
    client_id: str
    title: str = Field(..., min_length=1, max_length=255)
    engagement_type: str = Field(default="one_off")
    currency: str = "NGN"
    quote_id: Optional[str] = None
    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    baseline_expense_cap_minor: Optional[int] = Field(default=None, ge=0)
    per_expense_threshold_minor: Optional[int] = Field(default=None, ge=0)
    expense_policy: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    notes: Optional[str] = None


class EngagementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    bagg_reference: str
    workspace_id: str
    client_id: str
    quote_id: Optional[str] = None
    title: str
    engagement_type: str
    status: str
    currency: str
    start_date: Optional[date] = None
    target_completion_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    commercial_baseline: Optional[dict[str, Any]] = None
    baseline_expense_cap_minor: Optional[int] = None
    effective_expense_cap_minor: Optional[int] = None
    per_expense_threshold_minor: Optional[int] = None
    expense_policy_snapshot: Optional[dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ScopeChangeCreateRequest(BaseModel):
    expense_id: Optional[str] = None
    title: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = None
    delta_amount_minor: Optional[int] = Field(default=None, gt=0)
    # Email the one-time approval link to the client.
    send_email: bool = False


class ScopeChangeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    engagement_id: str
    client_id: str
    expense_id: Optional[str] = None
    change_type: str
    title: str
    description: Optional[str] = None
    delta_amount_minor: int
    currency: str
    status: str

    # Returned only when the link is created or regenerated. The raw token is
    # never persisted, so later reads cannot expose it again. Only the URL is
    # returned, not the bare token, to keep the secret out of logs and caches.
    approval_url: Optional[str] = None
    approval_token_expires_at: Optional[datetime] = None
    approval_email_queued: bool = False

    accepted_at: Optional[datetime] = None
    accepted_by_name: Optional[str] = None
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ScopeChangeAcceptRequest(BaseModel):
    accepted_by_name: str = Field(..., min_length=1, max_length=255)


class ScopeChangeDeclineRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)


class EngagementMarginResponse(BaseModel):
    engagement_id: str
    currency: str
    confirmed_received_minor: int
    outstanding_invoiced_minor: int
    billable_costs_minor: int
    non_billable_costs_minor: int
    total_costs_minor: int
    net_margin_minor: int
    baseline_expense_cap_minor: Optional[int] = None
    effective_expense_cap_minor: Optional[int] = None
