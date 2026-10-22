from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime, date


class QuoteLineItemCreate(BaseModel):
    description: str = Field(..., min_length=1)
    quantity: int = Field(default=1, ge=1)
    unit_price_minor: int = Field(..., ge=0)


class QuoteLineItemSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    position: int
    description: str
    quantity: int
    unit_price_minor: int
    total_minor: int


class QuoteCreate(BaseModel):
    client_id: str
    currency: str = "NGN"
    issue_date: Optional[date] = None
    expires_at: Optional[date] = None
    validity_days: Optional[int] = Field(default=14, ge=1, le=365)
    items: List[QuoteLineItemCreate] = Field(..., min_length=1)
    discount_minor: int = Field(default=0, ge=0)
    tax_rate_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    wht_rate_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    deposit_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    deposit_amount_minor: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None


class QuoteUpdate(BaseModel):
    client_id: Optional[str] = None
    currency: Optional[str] = None
    issue_date: Optional[date] = None
    expires_at: Optional[date] = None
    items: Optional[List[QuoteLineItemCreate]] = None
    discount_minor: Optional[int] = Field(default=None, ge=0)
    tax_rate_percent: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    wht_rate_percent: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    deposit_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    deposit_amount_minor: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None


class QuoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    client_id: str
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    quote_number: str
    sequence_number: int
    version: int = 1
    last_revised_at: Optional[datetime] = None
    currency: str
    status: str
    is_expired: bool = False
    issue_date: date
    expires_at: date
    items: List[QuoteLineItemSchema]
    subtotal_minor: int
    discount_minor: int
    tax_rate_percent: float
    tax_minor: int
    total_minor: int
    wht_rate_percent: float
    wht_minor: int
    net_payable_minor: int
    deposit_percentage: Optional[float] = None
    deposit_amount_minor: Optional[int] = None
    notes: Optional[str] = None
    share_token: Optional[str] = None
    share_url: Optional[str] = None
    whatsapp_share_url: Optional[str] = None
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    accepted_by_name: Optional[str] = None
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_status: Optional[str] = None
    effective_status: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PublicQuoteView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    quote_number: str
    version: int = 1
    last_revised_at: Optional[datetime] = None
    currency: str
    status: str
    is_expired: bool = False
    issue_date: date
    expires_at: date
    items: List[QuoteLineItemSchema]
    subtotal_minor: int
    discount_minor: int
    tax_rate_percent: float
    tax_minor: int
    total_minor: int
    wht_rate_percent: float
    wht_minor: int
    net_payable_minor: int
    deposit_percentage: Optional[float] = None
    deposit_amount_minor: Optional[int] = None
    notes: Optional[str] = None
    business_name: str
    business_logo_url: Optional[str] = None
    business_brand_color: Optional[str] = None
    client_name: Optional[str] = None
    viewed_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    accepted_by_name: Optional[str] = None
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_status: Optional[str] = None
    effective_status: Optional[str] = None
    show_badge: bool = True


class QuoteAcceptRequest(BaseModel):
    accepted_by_name: str = Field(..., min_length=2, max_length=100, description="Full name of person accepting the quote")
    version: Optional[int] = Field(default=None, description="Quote version being accepted (pinned to avoid accepting a stale revision)")


class QuoteReviseRequest(BaseModel):
    client_id: Optional[str] = None
    currency: Optional[str] = None
    issue_date: Optional[date] = None
    expires_at: Optional[date] = None
    items: Optional[List[QuoteLineItemCreate]] = None
    discount_minor: Optional[int] = Field(default=None, ge=0)
    tax_rate_percent: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    wht_rate_percent: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    deposit_percentage: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    deposit_amount_minor: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None
    reason: Optional[str] = Field(default="Scope or pricing adjustment", max_length=500)


class QuoteDeclineRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500, description="Optional feedback note explaining why quote was declined")


class QuoteSendResponse(BaseModel):
    id: str
    quote_number: str
    version: int = 1
    status: str
    share_token: str
    share_url: str
    whatsapp_share_url: str
    sent_at: datetime
