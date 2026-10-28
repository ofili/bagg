from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.money import validate_currency


class ContactInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=64)
    is_primary: bool = False
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Contact name is required")
        return value

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Invalid email format")
        return value.lower()


class ContactCreate(ContactInput):
    client_id: str


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    job_title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


class ContactResponse(ContactInput):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    client_id: str
    created_at: datetime
    updated_at: datetime


class ClientBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., min_length=1, max_length=255)
    client_type: Literal["PERSON", "BUSINESS"] = "PERSON"
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    preferred_currency: str = "NGN"
    default_payment_terms_days: int = Field(14, ge=0, le=365)
    tax_id: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Client name is required")
        return value

    @field_validator("preferred_currency")
    @classmethod
    def check_currency(cls, value: str) -> str:
        clean = value.upper().strip()
        if not validate_currency(clean):
            raise ValueError(
                f"Currency '{value}' is not supported. "
                "Must be one of NGN, USD, GBP, EUR, GHS, KES, ZAR."
            )
        return clean

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value:
            return None
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Invalid email format")
        return value.lower()


class ClientCreate(ClientBase):
    contacts: list[ContactInput] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_business_contact(self):
        if self.client_type == "BUSINESS" and not self.contacts:
            raise ValueError("A business client must have at least one contact.")
        return self


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    client_type: Optional[Literal["PERSON", "BUSINESS"]] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    preferred_currency: Optional[str] = None
    default_payment_terms_days: Optional[int] = Field(None, ge=0, le=365)
    tax_id: Optional[str] = None
    notes: Optional[str] = None


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
    contacts: list[ContactResponse] = Field(default_factory=list)
    total_invoiced_minor: int = 0
    total_paid_minor: int = 0
    total_outstanding_minor: int = 0
    invoice_count: int = 0
    created_at: datetime
    updated_at: datetime


class ClientDetailResponse(ClientResponse):
    invoices: list[ClientInvoiceSummary] = Field(default_factory=list)
