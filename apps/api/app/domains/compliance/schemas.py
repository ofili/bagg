from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime, date


# --- Abuse Reporting (US-SEC-02) ---

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


# --- Data Export (US-SEC-01) ---

class ExportRequest(BaseModel):
    include_invoices: bool = True
    include_clients: bool = True
    include_payments: bool = True
    format: str = "csv"  # csv or zip


class ExportResponse(BaseModel):
    download_url: str
    format: str
    file_size_bytes: int
    generated_at: datetime


# --- Account Deletion (US-SEC-03) ---

class AccountDeletionRequest(BaseModel):
    confirmation_phrase: str = Field(..., description="Must be 'DELETE MY ACCOUNT'")
    reason: Optional[str] = None


class AccountDeletionResponse(BaseModel):
    status: str
    message: str
    data_purge_scheduled_at: datetime
