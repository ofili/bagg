from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EntitlementOverrideCreate(BaseModel):
    entitlement_key: str = Field(min_length=1, max_length=120)
    override_value: Any
    reason: str = Field(min_length=1, max_length=1000)
    effective_at: datetime | None = None
    expires_at: datetime


class EntitlementOverrideRevoke(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)


class EntitlementOverrideResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    entitlement_key: str
    override_value: Any
    reason: str
    status: str
    created_by_admin_id: str
    effective_at: datetime
    expires_at: datetime
    revoked_at: datetime | None
    revoked_by_admin_id: str | None
    revocation_reason: str | None
    created_at: datetime
    updated_at: datetime
