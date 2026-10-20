from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class CreditLedgerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    amount: int
    balance_after: int
    reason: str
    description: Optional[str] = None
    created_at: datetime


class CreditBalanceResponse(BaseModel):
    workspace_id: str
    balance: int
    tier: str = "free"
    free_sends_used_this_month: int = 0
    free_sends_limit: int = 3
    history: List[CreditLedgerResponse] = []


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    workspace_id: str
    tier: str = "free"
    status: str = "active"
    currency: str = "NGN"
    amount_minor: int = 0
    billing_interval: str = "annual"
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    grace_period_end: Optional[datetime] = None
    in_grace_period: bool = False
    dunning_attempts: int = 0
    free_sends_used_this_month: int = 0
    free_sends_limit: int = 3
    credit_balance: int = 0


class CheckoutRequest(BaseModel):
    plan: str  # creator_pro or professional
    currency: str = "NGN"  # NGN or USD
    callback_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    authorization_url: str
    reference: str
    plan: str
    amount_minor: int
    currency: str


class CreditPackPurchaseRequest(BaseModel):
    pack: str = "200_credits"
    currency: str = "NGN"
    callback_url: Optional[str] = None


class SubscriptionCancelResponse(BaseModel):
    message: str
    tier: str
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool
