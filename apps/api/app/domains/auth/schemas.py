from typing import Literal

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.domains.workspaces.schemas import WorkspaceResponse


class AttributionPayload(BaseModel):
    """Validated first-touch acquisition context supplied during registration."""

    source: str | None = Field(default=None, max_length=100)
    medium: str | None = Field(default=None, max_length=100)
    campaign: str | None = Field(default=None, max_length=150)
    content: str | None = Field(default=None, max_length=150)
    term: str | None = Field(default=None, max_length=150)
    referral_code: str | None = Field(default=None, max_length=100)
    referrer: str | None = Field(default=None, max_length=500)
    landing_path: str | None = Field(default=None, max_length=300)

    @field_validator("*", mode="before")
    @classmethod
    def normalize_strings(cls, value):
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("Attribution values must be strings.")
        value = value.strip()
        return value[:500] or None


class MagicLinkRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^[0-9]{6}$",
    )
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    attribution: AttributionPayload | None = None
    intent: Literal["signup", "login"] = "login"

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value):
        if value is None:
            return None

        value = value.strip()

        if value is None or len(value) == 0:
            raise ValueError("Full name cannot be blank.")

        return value

    @model_validator(mode="after")
    def require_name_for_signup(self):
        if self.intent == "signup" and not self.full_name:
            raise ValueError("Full name is required to create an account.")

        return self


class UserResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    full_name: str | None = None
    phone_number: str | None = None
    avatar_url: str | None = None


class AuthResponse(BaseModel):
    user: UserResponse
    workspace: WorkspaceResponse
    is_new_user: bool = False
    message: str = "Authenticated successfully"
