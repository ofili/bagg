
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class EmailChangeStartRequest(BaseModel):
    new_email: EmailStr


class EmailChangeStartResponse(BaseModel):
    id: str
    message: str
    expires_in_minutes: int


class EmailChangeVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class EmailChangeStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    current_email_verified: bool
    new_email_verified: bool
    expires_at: str
    completed: bool
    cancelled: bool
    message: str
