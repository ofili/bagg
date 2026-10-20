from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.domains.invoices.schemas import InvoiceResponse
from app.domains.payments.schemas import PaymentProfileResponse, PaymentClaimResponse


class CommentCreate(BaseModel):
    line_item_id: Optional[str] = None
    author_name: str
    message: str


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    line_item_id: Optional[str] = None
    author_name: str
    message: str
    is_from_client: bool = True
    created_at: datetime


class PublicInvoiceView(BaseModel):
    invoice: InvoiceResponse
    payment_profile: Optional[PaymentProfileResponse] = None
    comments: List[CommentResponse] = []
    is_revised: bool = False
    revision_banner: Optional[str] = None
    revisions_count: int = 0
    show_viral_footer: bool = True
    viral_footer_text: Optional[str] = "Powered by bagg. — Invoicing & get-paid workspace for African creators"
    viral_footer_link: Optional[str] = "https://bagg.africa?utm_source=invoice_footer&utm_medium=referral"
    latest_claim: Optional[PaymentClaimResponse] = None


class DirectCheckoutRequest(BaseModel):
    amount_minor: Optional[int] = None
    callback_url: Optional[str] = None


class DirectCheckoutResponse(BaseModel):
    checkout_url: str
    reference: str
    amount_minor: int
    currency: str


class PaymentVerificationRequest(BaseModel):
    reference: str


class PaymentVerificationResponse(BaseModel):
    status: str
    message: str
    invoice_status: str
    amount_paid_minor: int
    balance_due_minor: int
