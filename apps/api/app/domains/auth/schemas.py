
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

class AuthResponse(BaseModel):
    user: UserResponse
    workspace: WorkspaceResponse
    message: str = "Authenticated successfully"
