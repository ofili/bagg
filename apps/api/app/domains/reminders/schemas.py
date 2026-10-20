from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ReminderSchedule(BaseModel):
    days_relative_to_due: int
    channel: str = "email"
    enabled: bool = True

class ReminderSettings(BaseModel):
    workspace_id: str
    auto_remind: bool = True
    schedules: List[ReminderSchedule]
