from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CreditLedgerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    amount: int
    balance_after: int
    reason: str
    description: str | None = None
    created_at: datetime


class CreditBalanceResponse(BaseModel):
    workspace_id: str
    balance: int
    tier: str = "free"
    free_sends_used_this_month: int = 0
    free_sends_limit: int = 3
    history: list[CreditLedgerResponse] = Field(default_factory=list)


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str | None = None
    workspace_id: str
    tier: str = "free"
    status: str = "active"
    currency: str = "NGN"
    amount_minor: int = 0
    billing_interval: str = "annual"
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False
    grace_period_end: datetime | None = None
    in_grace_period: bool = False
    dunning_attempts: int = 0
    free_sends_used_this_month: int = 0
    free_sends_limit: int = 3
    credit_balance: int = 0


class PlanCatalogueItem(BaseModel):
    code: str
    name: str
    available: bool
    availability_status: str = "available"
    billing_intervals: list[str] = Field(default_factory=list)
    prices: dict[str, int] = Field(default_factory=dict)


class PlanCatalogueResponse(BaseModel):
    currency: str
    plans: list[PlanCatalogueItem]


class CheckoutRequest(BaseModel):
    plan: str
    billing_interval: Literal["monthly", "annual"]
    callback_url: str | None = None


class CheckoutResponse(BaseModel):
    checkout_id: str
    authorization_url: str
    reference: str
    plan: str
    billing_interval: str | None = None
    amount_minor: int
    currency: str
    status: str = "pending"


class CheckoutStatusResponse(BaseModel):
    checkout_id: str
    reference: str
    purchase_type: str
    plan: str | None = None
    pack: str | None = None
    billing_interval: str | None = None
    amount_minor: int
    currency: str
    status: str
    authorization_url: str | None = None
    paid_at: datetime | None = None
    created_at: datetime


class CreditPackPurchaseRequest(BaseModel):
    pack: str = "200_credits"
    currency: Literal["NGN"] = "NGN"
    callback_url: str | None = None


class SubscriptionCancelResponse(BaseModel):
    message: str
    tier: str
    current_period_end: datetime | None = None
    cancel_at_period_end: bool
    manage_url: str | None = None