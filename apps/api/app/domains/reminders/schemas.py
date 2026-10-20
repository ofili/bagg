from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class ReminderJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    invoice_id: str
    reminder_type: str
    due_at: datetime
    status: str
    idempotency_key: str
    attempts: int
    sent_at: Optional[datetime] = None
    last_attempt_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime


class WhatsAppNudgeResponse(BaseModel):
    whatsapp_url: str
    client_name: str
    invoice_number: str
    total_formatted: str
    due_date: str
    is_overdue: bool
    days_overdue: int


class ReminderProcessResult(BaseModel):
    processed_count: int
    message: str


class ReminderSchedule(BaseModel):
    days_relative_to_due: int
    reminder_type: str
    channel: str = "email"
    enabled: bool = True


class ReminderSettings(BaseModel):
    workspace_id: str
    auto_remind: bool = True
    schedules: List[ReminderSchedule]
