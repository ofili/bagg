from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from typing import Optional, List
from datetime import datetime, date

from app.core.money import validate_currency
from app.domains.quotes.acceptance import CONSENT_TEXT


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


class ExpensePolicySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reimbursable_categories: List[str] = Field(default_factory=list)
    per_expense_threshold_minor: Optional[int] = Field(default=None, ge=0)
    total_expense_cap_minor: Optional[int] = Field(default=None, ge=0)
    client_approval_required: bool = True


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
    has_expense_policy: bool = False
    expense_policy: Optional[ExpensePolicySchema] = None
    notes: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def check_currency(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not validate_currency(normalized):
            raise ValueError("Unsupported quote currency.")
        return normalized

    @model_validator(mode="after")
    def validate_expense_policy(self):
        if self.has_expense_policy:
            if not self.expense_policy:
                raise ValueError(
                    "An expense policy must be provided when reimbursable "
                    "expenses are enabled."
                )

            categories = self.expense_policy.reimbursable_categories
            if not categories:
                raise ValueError(
                    "Add at least one reimbursable expense category."
                )

        return self


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
    has_expense_policy: Optional[bool] = None
    expense_policy: Optional[ExpensePolicySchema] = None
    notes: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def check_currency(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().upper()
        if not validate_currency(normalized):
            raise ValueError("Unsupported quote currency.")
        return normalized


class QuoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    bagg_reference: str
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
    has_expense_policy: Optional[bool] = False
    expense_policy: Optional[ExpensePolicySchema] = None
    notes: Optional[str] = None
    share_token: Optional[str] = None
    share_url: Optional[str] = None
    whatsapp_share_url: Optional[str] = None
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    email_delivery_status: Optional[str] = None
    review_requested_at: Optional[datetime] = None
    review_reason: Optional[str] = None
    comment_count: int = 0
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


class QuoteCommentCreate(BaseModel):
    line_item_id: Optional[str] = None
    author_name: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1, max_length=2000)


class QuoteCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    quote_id: str
    line_item_id: Optional[str] = None
    author_name: str
    message: str
    is_from_client: bool = True
    created_at: datetime


class PublicQuoteView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    quote_number: str
    version: int = 1
    # Exact wording the client agrees to when accepting. The server stores this text
    # with the acceptance, so what they saw and what is recorded cannot differ.
    acceptance_consent_text: str = CONSENT_TEXT
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
    has_expense_policy: Optional[bool] = False
    expense_policy: Optional[ExpensePolicySchema] = None
    notes: Optional[str] = None
    business_name: str
    business_logo_url: Optional[str] = None
    business_brand_color: Optional[str] = None
    client_name: Optional[str] = None
    viewed_at: Optional[datetime] = None
    review_requested_at: Optional[datetime] = None
    review_reason: Optional[str] = None
    accepted_at: Optional[datetime] = None
    accepted_by_name: Optional[str] = None
    declined_at: Optional[datetime] = None
    decline_reason: Optional[str] = None
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_status: Optional[str] = None
    effective_status: Optional[str] = None
    show_badge: bool = True
    comments: List[QuoteCommentResponse] = []


class QuoteAcceptRequest(BaseModel):
    accepted_by_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Full name of person accepting the quote",
    )
    version: int = Field(
        ...,
        ge=1,
        description="Exact quote version being accepted",
    )
    agreed_to_terms: bool = Field(
        ...,
        description="The client confirmed they have read and agree to the quote's terms",
    )


class AcceptanceRecordResponse(BaseModel):
    """What the issuer can show if an acceptance is ever questioned."""

    quote_id: str
    quote_number: str
    version: int
    accepted_at: datetime
    accepted_by_name: Optional[str] = None
    # False for quotes accepted before evidence capture existed.
    evidence_captured: bool
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    consent_text: Optional[str] = None
    consent_version: Optional[str] = None
    terms_hash: Optional[str] = None
    terms_snapshot: Optional[dict] = None
    # Recomputed on request: True if the stored snapshot still matches its hash.
    hash_verified: Optional[bool] = None
    generated_at: datetime


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
    has_expense_policy: Optional[bool] = None
    expense_policy: Optional[ExpensePolicySchema] = None
    notes: Optional[str] = None
    reason: Optional[str] = Field(default="Scope or pricing adjustment", max_length=500)

    @field_validator("currency")
    @classmethod
    def check_currency(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip().upper()
        if not validate_currency(normalized):
            raise ValueError("Unsupported quote currency.")
        return normalized


class QuoteDeclineRequest(BaseModel):
    reason: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional feedback note explaining why quote was declined",
    )


class QuoteReviewRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=1000)


class QuoteSendRequest(BaseModel):
    send_email: bool = False


class QuoteSendResponse(BaseModel):
    id: str
    bagg_reference: str
    quote_number: str
    version: int = 1
    status: str
    share_token: str
    share_url: str
    whatsapp_share_url: str
    sent_at: Optional[datetime] = None
    email_sent: bool = False
    email_queued: bool = False
    recipient_email: Optional[str] = None
    message: str = ""


class QuoteRevisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    quote_id: str
    version: int

    # Older revision rows may not have captured these fields.
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    currency: Optional[str] = None
    issue_date: Optional[date] = None
    expires_at: Optional[date] = None

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
    has_expense_policy: Optional[bool] = False
    expense_policy: Optional[ExpensePolicySchema] = None
    notes: Optional[str] = None

    items_snapshot: List[dict]
    revised_reason: Optional[str] = None
    created_at: datetime
