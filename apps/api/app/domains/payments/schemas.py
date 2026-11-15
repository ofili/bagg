from datetime import date, datetime
from typing import Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    computed_field,
    field_validator,
    model_validator,
)

from app.core.money import validate_currency
from app.domains.payments.profile_rules import (
    is_payment_profile_usable,
    payment_profile_methods,
)


class PaymentProfileBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    currency: str
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    routing_number: Optional[str] = None
    payment_link: Optional[str] = None
    mobile_money_number: Optional[str] = None
    instructions: Optional[str] = None
    is_default: bool = True

    @field_validator("currency")
    @classmethod
    def check_currency(cls, value: str) -> str:
        clean = value.upper().strip()

        if not validate_currency(clean):
            raise ValueError(
                f"Currency '{value}' is not supported. "
                "Must be one of NGN, USD, GBP, EUR, GHS, KES, ZAR."
            )

        return clean


class PaymentProfileCreate(PaymentProfileBase):
    @model_validator(mode="after")
    def validate_usable_method(self):
        payment_profile_methods(self.model_dump())
        return self


class PaymentProfileUpdate(BaseModel):
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    routing_number: Optional[str] = None
    payment_link: Optional[str] = None
    mobile_money_number: Optional[str] = None
    instructions: Optional[str] = None
    is_default: Optional[bool] = None


class PaymentProfileResponse(PaymentProfileBase):
    id: str
    workspace_id: str
    created_at: datetime

    @computed_field
    @property
    def is_usable(self) -> bool:
        return is_payment_profile_usable(self)

    @computed_field
    @property
    def methods(self) -> list[str]:
        try:
            return payment_profile_methods(self)
        except ValueError:
            return []


class PaymentProfileValidation(BaseModel):
    currency: str
    has_profile: bool
    default_profile: Optional[PaymentProfileResponse] = None
    message: str


class PaymentSetupCurrency(BaseModel):
    currency: str
    profile_count: int
    has_profile: bool
    is_configured: bool
    default_profile_id: Optional[str] = None
    methods: list[str] = Field(default_factory=list)


class PaymentSetupResponse(BaseModel):
    currencies: list[PaymentSetupCurrency]
    configured_currency_count: int
    supported_currency_count: int


class PaymentClaimCreate(BaseModel):
    invoice_id: Optional[str] = None
    amount_minor: int
    payment_date: Optional[date] = None
    reference: Optional[str] = None
    proof_file_url: Optional[str] = None


class PaymentClaimResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    amount_minor: int
    payment_date: date
    reference: Optional[str] = None
    proof_file_url: Optional[str] = None
    status: str = "pending"
    rejection_reason: Optional[str] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime


class PaymentClaimConfirmRequest(BaseModel):
    amount_paid_minor: Optional[int] = None


class PaymentClaimRejectRequest(BaseModel):
    rejection_reason: str
