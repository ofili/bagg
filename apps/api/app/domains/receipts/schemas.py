from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime, date


class ReceiptCreate(BaseModel):
    amount_paid_minor: int = Field(..., gt=0, description="Amount paid in integer minor units (kobo/cents)")
    payment_date: Optional[date] = None
    payment_method: str = Field(default="bank_transfer", description="bank_transfer, card, mobile_money, cash, manual")
    reference: Optional[str] = None
    payer_name: Optional[str] = None
    notes: Optional[str] = None
    confirm_received: bool = Field(
        default=False,
        description="Issuer explicitly confirms the funds have been received",
    )


class ReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    bagg_reference: str
    workspace_id: str
    client_id: str
    client_name: Optional[str] = None
    invoice_id: str
    invoice_number: str
    payment_claim_id: Optional[str] = None
    receipt_number: str
    sequence_number: int
    currency: str
    amount_paid_minor: int
    balance_remaining_minor: int
    payment_date: date
    payment_method: str
    reference: Optional[str] = None
    payer_name: Optional[str] = None
    notes: Optional[str] = None
    is_verified: bool
    verified_at: Optional[datetime] = None
    verification_code: str
    confirmation_source: str = "legacy"
    confirmed_by_user_id: Optional[str] = None
    provider: Optional[str] = None
    provider_reference: Optional[str] = None
    share_token: Optional[str] = None
    share_url: Optional[str] = None
    whatsapp_share_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PublicReceiptView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    receipt_number: str
    invoice_number: str
    currency: str
    amount_paid_minor: int
    balance_remaining_minor: int
    payment_date: date
    payment_method: str
    reference: Optional[str] = None
    payer_name: Optional[str] = None
    is_verified: bool
    verified_at: Optional[datetime] = None
    verification_code: str
    confirmation_source: str = "legacy"
    provider: Optional[str] = None
    notes: Optional[str] = None
    business_name: str
    business_logo_url: Optional[str] = None
    business_brand_color: Optional[str] = None
    client_name: Optional[str] = None
    show_badge: bool = True


class StatementEntry(BaseModel):
    date: date
    type: str  # 'invoice' or 'receipt'
    reference_number: str
    description: str
    debit_minor: int  # billed (invoice)
    credit_minor: int  # paid (receipt)
    running_balance_minor: int


class ClientStatementResponse(BaseModel):
    client_id: str
    client_name: str
    currency: str
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    opening_balance_minor: int = 0
    entries: List[StatementEntry] = []
    total_invoiced_minor: int = 0
    total_paid_minor: int = 0
    closing_balance_minor: int = 0
    business_name: str
    generated_at: datetime
