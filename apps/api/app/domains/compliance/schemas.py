from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AbuseReportCreate(BaseModel):
    reporter_email: Optional[str] = None
    reporter_name: Optional[str] = None
    reason: str = Field(..., min_length=10)


class AbuseReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    workspace_id: str
    reporter_email: Optional[str] = None
    reason: str
    status: str
    created_at: datetime


class ExportRequest(BaseModel):
    include_invoices: bool = True
    include_clients: bool = True
    include_payments: bool = True
    format: str = "csv"


class ExportResponse(BaseModel):
    download_url: str
    format: str
    file_size_bytes: int
    generated_at: datetime


class AccountDeletionRequest(BaseModel):
    confirmation_phrase: str = Field(
        ...,
        description="Must be exactly 'DELETE MY ACCOUNT'",
    )
    challenge_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Consumed account-deletion security challenge ID",
    )
    reason: Optional[str] = None


class AccountDeletionResponse(BaseModel):
    status: str
    message: str

    # Kept for response compatibility with the previous API contract.
    # This is the completion timestamp, not a future scheduled purge.
    data_purge_scheduled_at: datetime = Field(
        description="Timestamp when account deactivation and anonymisation completed."
    )
