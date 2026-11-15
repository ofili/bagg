from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ClientEventName = Literal[
    "onboarding.step_viewed",
    "onboarding.step_started",
    "onboarding.plan_viewed",
    "invoice.create_started",
    "invoice.previewed",
    "quote.create_started",
    "quote.previewed",
    "billing.checkout_started",
    "activation.checklist_dismissed",
    "activation.checklist_resumed",
]


class ClientEventCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(min_length=1, max_length=128)
    event_name: ClientEventName
    event_version: int = Field(default=1, ge=1)
    occurred_at: datetime | None = None
    properties: dict[str, Any] = Field(default_factory=dict)

    @field_validator("properties")
    @classmethod
    def validate_properties(cls, value: dict[str, Any]) -> dict[str, Any]:
        allowed_keys = {
            "surface",
            "step",
            "plan_code",
            "billing_interval",
            "action",
            "route",
            "document_type",
            "error_code",
        }

        if len(value) > 20:
            raise ValueError("Too many event properties.")

        invalid = set(value) - allowed_keys

        if invalid:
            raise ValueError(
                f"Unsupported event properties: {', '.join(sorted(invalid))}"
            )

        for key, item in value.items():
            if item is not None and not isinstance(
                item,
                (str, int, float, bool),
            ):
                raise ValueError(f"Event property '{key}' must be a scalar value.")

            if isinstance(item, str) and len(item) > 250:
                raise ValueError(f"Event property '{key}' is too long.")

        return value


class ClientEventResponse(BaseModel):
    accepted: bool
    duplicate: bool


class ActivationMilestoneResponse(BaseModel):
    key: str
    completed: bool
    completed_at: datetime | None = None


class ActivationNextAction(BaseModel):
    key: str
    href: str


class ActivationResponse(BaseModel):
    activation_status: Literal[
        "in_progress",
        "initially_activated",
        "commercially_activated",
    ]
    milestones: list[ActivationMilestoneResponse]
    next_recommended_action: ActivationNextAction
