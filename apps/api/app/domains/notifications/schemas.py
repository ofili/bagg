from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    recipient_user_id: str
    type: str
    title: str
    body: str
    document_type: str
    document_id: str
    document_number: str
    comment_id: Optional[str] = None
    link_url: str
    read_at: Optional[datetime] = None
    created_at: datetime


class UnreadCountResponse(BaseModel):
    unread_count: int
