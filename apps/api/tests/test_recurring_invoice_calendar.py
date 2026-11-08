from datetime import date

import pytest

from app.domains.recurring_invoices.calendar import (
    is_schedule_ended,
    next_occurrence,
    period_end,
    period_key,
)


def test_monthly_schedule_preserves_day_31_after_february():
    january = date(2027, 1, 31)

    february = next_occurrence(
        january,
        "monthly",
        anchor_day=31,
    )
    march = next_occurrence(
        february,
        "monthly",
        anchor_day=31,
    )

    assert february == date(2027, 2, 28)
    assert march == date(2027, 3, 31)


def test_monthly_schedule_preserves_day_31_in_leap_year():
    january = date(2028, 1, 31)

    february = next_occurrence(
        january,
        "monthly",
        anchor_day=31,
    )
    march = next_occurrence(
        february,
        "monthly",
        anchor_day=31,
    )

    assert february == date(2028, 2, 29)
    assert march == date(2028, 3, 31)


def test_monthly_schedule_preserves_day_30():
    january = date(2027, 1, 30)

    february = next_occurrence(
        january,
        "monthly",
        anchor_day=30,
    )
    march = next_occurrence(
        february,
        "monthly",
        anchor_day=30,
    )

    assert february == date(2027, 2, 28)
    assert march == date(2027, 3, 30)


def test_quarterly_schedule_advances_three_months():
    current = date(2027, 1, 31)

    result = next_occurrence(
        current,
        "quarterly",
        anchor_day=31,
    )

    assert result == date(2027, 4, 30)


def test_yearly_schedule_preserves_leap_day_and_restores_it():
    current = date(2028, 2, 29)

    non_leap_year = next_occurrence(
        current,
        "yearly",
        anchor_day=29,
        anchor_month=2,
    )
    following_year = next_occurrence(
        non_leap_year,
        "yearly",
        anchor_day=29,
        anchor_month=2,
    )
    next_leap_year = next_occurrence(
        non_leap_year,
        "yearly",
        anchor_day=29,
        anchor_month=2,
    )

    assert non_leap_year == date(2029, 2, 28)
    assert following_year == date(2030, 2, 28)
    assert next_leap_year == date(2031, 2, 28)


def test_yearly_schedule_restores_february_29_in_next_leap_year():
    current = date(2028, 2, 29)

    for _ in range(4):
        current = next_occurrence(
            current,
            "yearly",
            anchor_day=29,
            anchor_month=2,
        )

    assert current == date(2032, 2, 29)


def test_weekly_schedule_advances_by_interval():
    current = date(2027, 1, 4)

    assert next_occurrence(current, "weekly", 2) == date(2027, 1, 18)


def test_daily_schedule_advances_by_interval():
    current = date(2027, 1, 4)

    assert next_occurrence(current, "daily", 3) == date(2027, 1, 7)


def test_period_keys_are_frequency_specific():
    assert period_key(date(2027, 1, 31), "monthly") == "2027-01"
    assert period_key(date(2027, 4, 30), "quarterly") == "2027-Q2"
    assert period_key(date(2027, 12, 31), "yearly") == "2027"
    assert period_key(date(2027, 1, 4), "weekly") == "2027-W01"


def test_period_end_is_day_before_next_period():
    assert period_end(
        date(2027, 1, 31),
        date(2027, 2, 28),
    ) == date(2027, 2, 27)


def test_period_end_rejects_invalid_range():
    with pytest.raises(ValueError):
        period_end(
            date(2027, 2, 1),
            date(2027, 2, 1),
        )


def test_end_after_count():
    assert is_schedule_ended(
        end_rule="after_count",
        generated_count=12,
        end_after_count=12,
        end_date=None,
        next_run_date=date(2028, 1, 1),
    )


def test_end_on_date_allows_occurrence_on_end_date():
    assert not is_schedule_ended(
        end_rule="on_date",
        generated_count=2,
        end_after_count=None,
        end_date=date(2027, 12, 31),
        next_run_date=date(2027, 12, 31),
    )


def test_end_on_date_stops_after_end_date():
    assert is_schedule_ended(
        end_rule="on_date",
        generated_count=2,
        end_after_count=None,
        end_date=date(2027, 12, 31),
        next_run_date=date(2028, 1, 31),
    )


def test_never_end_rule_never_ends():
    assert not is_schedule_ended(
        end_rule="never",
        generated_count=1000,
        end_after_count=None,
        end_date=None,
        next_run_date=date(2030, 1, 1),
    )