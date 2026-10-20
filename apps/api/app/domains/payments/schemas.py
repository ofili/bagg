from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional
from datetime import date, datetime
from app.core.money import validate_currency

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

    @field_validator('currency')
    @classmethod
    def check_currency(cls, v: str) -> str:
        clean = v.upper().strip()
        if not validate_currency(clean):
            raise ValueError(f"Currency '{v}' is not supported. Must be one of NGN, USD, GBP, EUR, GHS, KES, ZAR.")
        return clean

class PaymentProfileCreate(PaymentProfileBase):
    pass

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

class PaymentProfileValidation(BaseModel):
    currency: str
    has_profile: bool
    default_profile: Optional[PaymentProfileResponse] = None
    message: str

class PaymentClaimCreate(BaseModel):
    invoice_id: str
    amount_minor: int
    payment_date: date
    reference: Optional[str] = None
    proof_file_url: Optional[str] = None

class PaymentClaimResponse(BaseModel):
    id: str
    invoice_id: str
    amount_minor: int
    payment_date: date
    reference: Optional[str] = None
    proof_file_url: Optional[str] = None
    status: str = "pending"
    created_at: datetime
