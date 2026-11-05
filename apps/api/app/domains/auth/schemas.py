
from pydantic import BaseModel, EmailStr, Field

from app.domains.workspaces.schemas import WorkspaceResponse


class MagicLinkRequest(BaseModel):
    email: EmailStr


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^[0-9]{6}$",
    )


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
