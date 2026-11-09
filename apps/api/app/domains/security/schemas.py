from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class StepUpRequest(BaseModel):
    purpose: str = Field(min_length=1, max_length=80)
    resource_type: Optional[str] = Field(default=None, max_length=80)
    resource_id: Optional[str] = Field(default=None, max_length=160)
    payload: dict[str, Any]


class StepUpRequestResponse(BaseModel):
    challenge_id: str
    operation_id: str
    expires_in_seconds: int
    message: str


class StepUpVerifyRequest(BaseModel):
    challenge_id: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=6, max_length=6, pattern=r"^[0-9]{6}$")


class SecurityAuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_type: str
    outcome: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    created_at: Any


class RecoveryCodeResponse(BaseModel):
    codes: list[str]
    message: str


class StepUpVerifyResponse(BaseModel):
    verified: bool
    challenge_id: str
    operation_id: str
    message: str
