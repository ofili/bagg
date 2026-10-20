from pydantic import BaseModel, EmailStr
from typing import Optional
from app.domains.workspaces.schemas import WorkspaceResponse

class MagicLinkRequest(BaseModel):
    email: EmailStr

class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str

class UserResponse(BaseModel):
    id: str
    email: str
    is_active: bool

class AuthResponse(BaseModel):
    user: UserResponse
    workspace: WorkspaceResponse
    message: str = "Authenticated successfully"
