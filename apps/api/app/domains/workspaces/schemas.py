from pydantic import BaseModel, Field
from typing import Optional

from pydantic import BaseModel, Field, field_validator
from app.core.dates import (
    DEFAULT_WORKSPACE_TIMEZONE,
    validate_timezone_name,
)

class WorkspaceBase(BaseModel):
    name: str = "My Workspace"
    business_name: str = "My Business"
    brand_color: Optional[str] = "#10B981"
    default_currency: str = "NGN"
    country: str = "NG"
    tax_id: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    invoice_prefix: str = "INV-"
    quote_prefix: str = "QOT-"
    receipt_prefix: str = "REC-"
    timezone: str = DEFAULT_WORKSPACE_TIMEZONE


@field_validator("timezone")
@classmethod
def validate_workspace_timezone(cls, value: str) -> str:
    return validate_timezone_name(value)


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    business_name: Optional[str] = None
    brand_color: Optional[str] = None
    default_currency: Optional[str] = None
    country: Optional[str] = None
    tax_id: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    invoice_prefix: Optional[str] = None
    quote_prefix: Optional[str] = None
    receipt_prefix: Optional[str] = None
    timezone: Optional[str] = None


    @field_validator("timezone")
    @classmethod
    def validate_workspace_timezone(cls, value: Optional[str]) -> Optional[str]:
        return value if value is None else validate_timezone_name(value)


class WorkspaceOnboardingRequest(BaseModel):
    business_name: str = Field(min_length=1, max_length=200)
    country: str = Field(min_length=2, max_length=5)
    default_currency: str = Field(min_length=3, max_length=3)
    address: Optional[str] = Field(default=None, max_length=500)


class WorkspaceResponse(WorkspaceBase):
    id: str
    owner_id: str
    onboarding_completed: bool = False
    next_invoice_number: int = 1
    next_quote_number: int = 1
    next_receipt_number: int = 1
