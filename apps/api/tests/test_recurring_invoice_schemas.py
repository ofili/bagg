from datetime import date

import pytest
from pydantic import ValidationError

from app.domains.recurring_invoices.schemas import (
    RecurringScheduleCreate,
    RecurringScheduleUpdate,
    ResumeScheduleRequest,
)


def valid_create_payload(**overrides):
    payload = {
        "client_id": "clt_test",
        "name": "Monthly Retainer",
        "currency": "NGN",
        "frequency": "monthly",
        "interval": 1,
        "start_date": date(2026, 12, 1),
        "items": [
            {
                "description": "Monthly services",
                "quantity": 1,
                "unit_price_minor": 25000000,
            }
        ],
    }
    payload.update(overrides)
    return payload


def test_create_defaults_to_draft_review():
    payload = RecurringScheduleCreate(**valid_create_payload())
    assert payload.issue_mode == "draft"


@pytest.mark.parametrize(
    "overrides",
    [
        {"end_rule": "never", "end_after_count": 3},
        {"end_rule": "never", "end_date": date(2027, 1, 1)},
        {"end_rule": "after_count"},
        {
            "end_rule": "after_count",
            "end_after_count": 3,
            "end_date": date(2027, 1, 1),
        },
        {"end_rule": "on_date"},
        {
            "end_rule": "on_date",
            "end_date": date(2027, 1, 1),
            "end_after_count": 3,
        },
    ],
)
def test_create_rejects_invalid_end_rule_combinations(overrides):
    with pytest.raises(ValidationError):
        RecurringScheduleCreate(**valid_create_payload(**overrides))


def test_create_rejects_both_deposit_modes():
    with pytest.raises(ValidationError):
        RecurringScheduleCreate(
            **valid_create_payload(
                deposit_percentage=25,
                deposit_amount_minor=500000,
            )
        )


def test_resume_requires_explicit_skip_policy():
    with pytest.raises(ValidationError):
        ResumeScheduleRequest()

    assert (
        ResumeScheduleRequest(missed_period_policy="skip_missed").missed_period_policy
        == "skip_missed"
    )


@pytest.mark.parametrize(
    "field",
    [
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
    ],
)
def test_update_rejects_explicit_null_for_non_nullable_fields(field):
    with pytest.raises(ValidationError):
        RecurringScheduleUpdate(**{field: None})


def test_update_allows_clearing_nullable_fields():
    payload = RecurringScheduleUpdate(
        end_after_count=None,
        end_date=None,
        deposit_percentage=None,
        deposit_amount_minor=None,
        payment_profile_id=None,
        notes=None,
        pause_if_previous_overdue_days=None,
    )
    assert payload.model_fields_set
