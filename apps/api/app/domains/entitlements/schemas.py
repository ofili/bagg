from datetime import datetime

from pydantic import BaseModel, Field


class EntitlementCreditsResponse(BaseModel):
    balance: int = 0


class EntitlementsResponse(BaseModel):
    workspace_id: str
    plan: str
    subscription_status: str
    access_source: str
    is_paid: bool
    in_grace_period: bool = False
    current_period_end: datetime | None = None
    entitlements: dict[str, bool | int | None] = Field(default_factory=dict)
    credits: EntitlementCreditsResponse
