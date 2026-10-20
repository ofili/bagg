from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import List, Optional, Any
from datetime import date, datetime
from app.core.money import validate_currency


class LineItemSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    position: int = 0
    description: str = Field(..., min_length=1)
    quantity: int = Field(default=1, ge=1)
    unit_price_minor: int = Field(default=0, ge=0)
    total_minor: Optional[int] = None


class InvoiceCreate(BaseModel):
    client_id: str
    currency: str = "NGN"
    issue_date: date = Field(default_factory=date.today)
    due_date: Optional[date] = None
    items: List[LineItemSchema] = []
    discount_minor: int = Field(default=0, ge=0)
    tax_rate_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    wht_rate_percent: float = Field(default=0.0, ge=0.0, le=100.0)
    deposit_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    deposit_amount_minor: Optional[int] = Field(None, ge=0)
    deposit_due_date: Optional[date] = None
    direct_checkout_enabled: bool = True
    notes: Optional[str] = None
    payment_profile_id: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def check_currency(cls, v: str) -> str:
        clean = v.upper().strip()
        if not validate_currency(clean):
            raise ValueError(f"Currency '{v}' is not supported. Must be one of NGN, USD, GBP, EUR, GHS, KES, ZAR.")
        return clean


class InvoiceUpdate(BaseModel):
    client_id: Optional[str] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    items: Optional[List[LineItemSchema]] = None
    discount_minor: Optional[int] = Field(None, ge=0)
    tax_rate_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    wht_rate_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    deposit_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    deposit_amount_minor: Optional[int] = Field(None, ge=0)
    deposit_due_date: Optional[date] = None
    direct_checkout_enabled: Optional[bool] = None
    notes: Optional[str] = None
    payment_profile_id: Optional[str] = None


class InvoiceReviseRequest(BaseModel):
    items: List[LineItemSchema]
    discount_minor: Optional[int] = Field(None, ge=0)
    tax_rate_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    wht_rate_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    deposit_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    deposit_amount_minor: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None
    reason: Optional[str] = "Scope or pricing adjustment"


class WHTCreditNoteUpdate(BaseModel):
    wht_credit_note_number: str = Field(..., min_length=1)


class InvoiceRevisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    version: int
    subtotal_minor: int
    discount_minor: int
    tax_rate_percent: float
    tax_minor: int
    total_minor: int
    wht_rate_percent: float = 0.0
    wht_minor: int = 0
    net_payable_minor: int = 0
    deposit_amount_minor: Optional[int] = None
    items_snapshot: Any
    revised_reason: Optional[str] = None
    created_at: datetime


from app.domains.payments.schemas import PaymentClaimResponse


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    client_id: str
    client_name: Optional[str] = None
    invoice_number: str
    sequence_number: int
    currency: str
    status: str
    issue_date: date
    due_date: date
    items: List[LineItemSchema] = []
    subtotal_minor: int
    discount_minor: int
    tax_rate_percent: float
    tax_minor: int
    total_minor: int
    wht_rate_percent: float = 0.0
    wht_minor: int = 0
    net_payable_minor: int = 0
    wht_credit_note_number: Optional[str] = None
    deposit_percentage: Optional[float] = None
    deposit_amount_minor: Optional[int] = None
    deposit_due_date: Optional[date] = None
    amount_paid_minor: int = 0
    balance_due_minor: int = 0
    direct_checkout_enabled: bool = True
    direct_payment_reference: Optional[str] = None
    paid_at: Optional[datetime] = None
    payment_profile_id: Optional[str] = None
    notes: Optional[str] = None
    share_token: Optional[str] = None
    sent_at: Optional[datetime] = None
    email_delivery_status: Optional[str] = None
    pdf_url: Optional[str] = None
    version: int = 1
    last_revised_at: Optional[datetime] = None
    whatsapp_share_url: Optional[str] = None
    latest_claim: Optional[PaymentClaimResponse] = None
    created_at: datetime
    updated_at: datetime


class InvoiceSendResponse(BaseModel):
    invoice: InvoiceResponse
    whatsapp_url: str
    email_sent: bool
    recipient_email: Optional[str] = None
    share_url: str
    message: str


class CurrencyMetricsResponse(BaseModel):
    currency: str
    outstanding_minor: int = 0
    overdue_minor: int = 0
    paid_this_month_minor: int = 0
    invoices_count: int = 0
    draft_count: int = 0
    sent_count: int = 0
    viewed_count: int = 0
    claimed_count: int = 0
    partially_paid_count: int = 0
    paid_count: int = 0
    overdue_count: int = 0
    cancelled_count: int = 0

