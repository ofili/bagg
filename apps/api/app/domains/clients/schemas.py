from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.core.money import validate_currency


class ClientBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    preferred_currency: str = "NGN"
    default_payment_terms_days: int = Field(14, ge=0, le=365)
    tax_id: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("preferred_currency")
    @classmethod
    def check_currency(cls, v: str) -> str:
        clean = v.upper().strip()
        if not validate_currency(clean):
            raise ValueError(f"Currency '{v}' is not supported. Must be one of NGN, USD, GBP, EUR, GHS, KES, ZAR.")
        return clean

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v.lower()


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    preferred_currency: Optional[str] = None
    default_payment_terms_days: Optional[int] = Field(None, ge=0, le=365)
    tax_id: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("preferred_currency")
    @classmethod
    def check_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = v.upper().strip()
        if not validate_currency(clean):
            raise ValueError(f"Currency '{v}' is not supported. Must be one of NGN, USD, GBP, EUR, GHS, KES, ZAR.")
        return clean

    @field_validator("email")
    @classmethod
    def clean_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v.lower()


class ClientInvoiceSummary(BaseModel):
    id: str
    invoice_number: str
    currency: str
    total_minor: int
    status: str
    due_date: str


class ClientResponse(ClientBase):
    id: str
    bagg_reference: str
    workspace_id: str
    total_invoiced_minor: int = 0
    total_paid_minor: int = 0
    total_outstanding_minor: int = 0
    invoice_count: int = 0
    created_at: datetime
    updated_at: datetime


class ClientDetailResponse(ClientResponse):
    invoices: List[ClientInvoiceSummary] = []
