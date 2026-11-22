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
from urllib.parse import urlsplit

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

    reference: Optional[str] = Field(
        default=None,
        max_length=120,
    )

    proof_file_url: Optional[str] = Field(
        default=None,
        max_length=2048,
    )

    @field_validator("reference")
    @classmethod
    def clean_reference(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None

        cleaned = value.strip()

        return cleaned or None

    @field_validator("proof_file_url")
    @classmethod
    def validate_proof_file_url(
        cls,
        value: Optional[str],
    ) -> Optional[str]:
        if value is None:
            return None

        cleaned = value.strip()

        if not cleaned:
            return None

        if len(cleaned) > 2048:
            raise ValueError("Evidence URL is too long.")

        try:
            parsed = urlsplit(cleaned)
            hostname = parsed.hostname
        except ValueError as exc:
            raise ValueError("Evidence URL is invalid.") from exc

        if (
            parsed.scheme.lower() != "https"
            or not hostname
            or parsed.username
            or parsed.password
        ):
            raise ValueError("Evidence must be supplied using a valid HTTPS URL.")

        return cleaned


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
    confirmed_amount_minor: Optional[int] = None
    confirmed_by_user_id: Optional[str] = None

    rejected_at: Optional[datetime] = None
    rejected_by_user_id: Optional[str] = None

    created_at: datetime


class PaymentClaimConfirmRequest(BaseModel):
    amount_paid_minor: Optional[int] = Field(
        default=None,
        gt=0,
    )


class PaymentClaimRejectRequest(BaseModel):
    rejection_reason: str = Field(
        ...,
        min_length=1,
        max_length=2000,
    )

    @field_validator("rejection_reason")
    @classmethod
    def clean_rejection_reason(cls, value: str) -> str:
        cleaned = value.strip()

        if not cleaned:
            raise ValueError("A rejection reason is required.")

        return cleaned
