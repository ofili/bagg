from pydantic import BaseModel, Field


class ProfileUpdate(BaseModel):
    """Editable personal details. Email and avatar are not editable here yet."""
    full_name: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=32)