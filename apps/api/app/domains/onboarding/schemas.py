import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BusinessProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    business_name: str = Field(
        min_length=1,
        max_length=200,
    )

    country: str = Field(
        min_length=2,
        max_length=2,
    )

    default_currency: str = Field(
        min_length=3,
        max_length=3,
    )

    address: str | None = Field(
        default=None,
        max_length=500,
    )

    @field_validator("business_name")
    @classmethod
    def validate_business_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Business name is required.")

        return value

    @field_validator("country")
    @classmethod
    def validate_country(cls, value: str) -> str:
        value = value.strip().upper()

        if not re.fullmatch(r"[A-Z]{2}", value):
            raise ValueError("Country must be a two-letter country code.")

        return value

    @field_validator("default_currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        value = value.strip().upper()

        if not re.fullmatch(r"[A-Z]{3}", value):
            raise ValueError("Currency must be a three-letter currency code.")

        return value

    @field_validator("address")
    @classmethod
    def normalize_address(cls, value: str | None) -> str | None:
        if value is None:
            return None

        value = value.strip()
        return value or None


class OnboardingNextAction(BaseModel):
    type: str
    href: str


class BusinessProfileResponse(BaseModel):
    business_name: str
    country: str
    default_currency: str
    address: str | None = None


class OnboardingProgressResponse(BaseModel):
    status: Literal[
        "not_started",
        "in_progress",
        "completed",
    ]

    schema_version: int

    current_step: str | None

    completed_steps: list[str]

    skipped_steps: list[str]

    required_steps_remaining: list[str]

    onboarding_completed: bool

    business_profile: BusinessProfileResponse

    next_action: OnboardingNextAction | None

    started_at: datetime | None

    completed_at: datetime | None

    last_activity_at: datetime