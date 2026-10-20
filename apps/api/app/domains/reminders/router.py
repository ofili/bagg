from fastapi import APIRouter
from app.domains.reminders.schemas import ReminderSettings, ReminderSchedule

router = APIRouter(prefix="/reminders", tags=["Reminders"])

@router.get("/settings", response_model=ReminderSettings)
async def get_reminder_settings():
    """Returns workspace default reminder schedule."""
    return ReminderSettings(
        workspace_id="ws_demo_01",
        auto_remind=True,
        schedules=[
            ReminderSchedule(days_relative_to_due=-3, channel="email", enabled=True),
            ReminderSchedule(days_relative_to_due=0, channel="email", enabled=True),
            ReminderSchedule(days_relative_to_due=3, channel="email", enabled=True),
            ReminderSchedule(days_relative_to_due=7, channel="email", enabled=True)
        ]
    )
