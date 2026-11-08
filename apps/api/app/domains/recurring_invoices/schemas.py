from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.core.money import validate_currency

Frequency = Literal["daily", "weekly", "monthly", "quarterly", "yearly"]
EndRule = Literal["never", "after_count", "on_date"]
IssueMode = Literal["draft", "auto_issue"]
ScheduleStatus = Literal["active", "paused", "cancelled", "completed"]
ResumePolicy = Literal["skip_missed"]


class RecurringLineItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1, max_length=255)
    quantity: int = Field(default=1, ge=1)
    unit_price_minor: int = Field(default=0, ge=0)

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Line item description cannot be empty.")
        return value


class RecurringScheduleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=160)
    currency: str = "NGN"

    frequency: Frequency
    interval: int = Field(default=1, ge=1, le=12)
    start_date: date

    end_rule: EndRule = "never"
    end_after_count: int | None = Field(default=None, ge=1)
    end_date: date | None = None

    draft_lead_days: int = Field(default=3, ge=0, le=30)
    due_date_offset_days: int = Field(default=14, ge=0, le=365)
    issue_mode: IssueMode = "draft"
    review_reminder_days: int = Field(default=1, ge=1, le=30)

    items: list[RecurringLineItem] = Field(min_length=1, max_length=100)
    discount_minor: int = Field(default=0, ge=0)
    tax_rate_percent: float = Field(default=0, ge=0, le=100)
    wht_rate_percent: float = Field(default=0, ge=0, le=100)

    deposit_percentage: float | None = Field(default=None, ge=0, le=100)
    deposit_amount_minor: int | None = Field(default=None, ge=0)

    payment_profile_id: str | None = None
    direct_checkout_enabled: bool = True
    notes: str | None = Field(default=None, max_length=5000)
    timezone: str = Field(default="Africa/Lagos", min_length=1, max_length=64)

    pause_if_previous_overdue_days: int | None = Field(
        default=None,
        ge=1,
        le=365,
    )

    @field_validator("currency")
    @classmethod
    def validate_currency_code(cls, value: str) -> str:
        value = value.upper().strip()
        if not validate_currency(value):
            raise ValueError("Unsupported currency.")
        return value

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Schedule name cannot be empty.")
        return value

    @model_validator(mode="after")
    def validate_configuration(self):
        _validate_end_rule_fields(
            self.end_rule,
            self.end_after_count,
            self.end_date,
        )
        _validate_deposit_fields(
            self.deposit_percentage,
            self.deposit_amount_minor,
        )
        return self


class RecurringScheduleUpdate(BaseModel):
    """
    Partial update. Omitted fields retain their existing values.

    Null is meaningful only for nullable fields such as end_after_count,
    end_date, deposit values, payment_profile_id and notes.
    """

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=160)
    frequency: Frequency | None = None
    interval: int | None = Field(default=None, ge=1, le=12)

    end_rule: EndRule | None = None
    end_after_count: int | None = Field(default=None, ge=1)
    end_date: date | None = None

    draft_lead_days: int | None = Field(default=None, ge=0, le=30)
    due_date_offset_days: int | None = Field(default=None, ge=0, le=365)
    issue_mode: IssueMode | None = None
    review_reminder_days: int | None = Field(default=None, ge=1, le=30)

    items: list[RecurringLineItem] | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    currency: str | None = None

    discount_minor: int | None = Field(default=None, ge=0)
    tax_rate_percent: float | None = Field(default=None, ge=0, le=100)
    wht_rate_percent: float | None = Field(default=None, ge=0, le=100)

    deposit_percentage: float | None = Field(default=None, ge=0, le=100)
    deposit_amount_minor: int | None = Field(default=None, ge=0)

    payment_profile_id: str | None = None
    direct_checkout_enabled: bool | None = None
    notes: str | None = Field(default=None, max_length=5000)

    pause_if_previous_overdue_days: int | None = Field(
        default=None,
        ge=1,
        le=365,
    )

    @field_validator("currency")
    @classmethod
    def validate_currency_code(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.upper().strip()
        if not validate_currency(value):
            raise ValueError("Unsupported currency.")
        return value

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Schedule name cannot be empty.")
        return value

    @model_validator(mode="after")
    def validate_update_fields(self):
        non_nullable_when_supplied = {
            "name",
            "frequency",
            "interval",
            "end_rule",
            "draft_lead_days",
            "due_date_offset_days",
            "issue_mode",
            "review_reminder_days",
            "items",
            "currency",
            "discount_minor",
            "tax_rate_percent",
            "wht_rate_percent",
            "direct_checkout_enabled",
        }
        for field_name in non_nullable_when_supplied:
            if (
                field_name in self.model_fields_set
                and getattr(self, field_name) is None
            ):
                raise ValueError(f"{field_name} cannot be null.")

        if (
            self.deposit_percentage is not None
            and self.deposit_amount_minor is not None
        ):
            raise ValueError(
                "Specify either a deposit percentage or a fixed deposit amount, not both."
            )
        return self


class ResumeScheduleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Required deliberately: resuming is a business decision, not an implicit
    # default. Missed periods are skipped and never backfilled.
    missed_period_policy: ResumePolicy


class RecurringScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    workspace_id: str
    client_id: str
    created_by_user_id: str | None

    name: str
    currency: str
    frequency: str
    interval: int

    start_date: date
    next_run_date: date
    anchor_day: int
    anchor_month: int

    end_rule: str
    end_after_count: int | None
    end_date: date | None

    issue_mode: str
    draft_lead_days: int
    due_date_offset_days: int
    review_reminder_days: int

    items: list[dict]
    discount_minor: int
    tax_rate_percent: float
    wht_rate_percent: float
    deposit_percentage: float | None
    deposit_amount_minor: int | None
    payment_profile_id: str | None
    direct_checkout_enabled: bool
    notes: str | None

    pause_if_previous_overdue_days: int | None
    timezone: str
    status: str
    generated_count: int

    paused_at: datetime | None
    pause_started_on: date | None
    resume_policy: str | None
    cancelled_at: datetime | None
    completed_at: datetime | None

    created_at: datetime
    updated_at: datetime


class RecurringScheduleListResponse(BaseModel):
    items: list[RecurringScheduleResponse]
    total: int
    limit: int
    offset: int


class RecurringOccurrenceResponse(BaseModel):
    invoice_id: str
    invoice_number: str | None
    invoice_status: str
    period_key: str
    period_start: date
    period_end: date
    recurring_label: str
    due_date: date | None
    total_minor: int
    currency: str
    created_at: datetime


class RecurringOccurrenceListResponse(BaseModel):
    items: list[RecurringOccurrenceResponse]
    total: int
    limit: int
    offset: int


def _validate_end_rule_fields(
    end_rule: EndRule,
    end_after_count: int | None,
    end_date: date | None,
) -> None:
    if end_rule == "never":
        if end_after_count is not None or end_date is not None:
            raise ValueError(
                "end_after_count and end_date must be omitted when end_rule is never."
            )
    elif end_rule == "after_count":
        if end_after_count is None:
            raise ValueError(
                "end_after_count is required when end_rule is after_count."
            )
        if end_date is not None:
            raise ValueError("end_date must be omitted when end_rule is after_count.")
    elif end_rule == "on_date":
        if end_date is None:
            raise ValueError("end_date is required when end_rule is on_date.")
        if end_after_count is not None:
            raise ValueError(
                "end_after_count must be omitted when end_rule is on_date."
            )


def _validate_deposit_fields(
    deposit_percentage: float | None,
    deposit_amount_minor: int | None,
) -> None:
    if deposit_percentage is not None and deposit_amount_minor is not None:
        raise ValueError(
            "Specify either a deposit percentage or a fixed deposit amount, not both."
        )
