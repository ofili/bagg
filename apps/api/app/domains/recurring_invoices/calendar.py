from calendar import monthrange
from datetime import date, timedelta
from typing import Literal


Frequency = Literal[
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
]


def _days_in_month(year: int, month: int) -> int:
    return monthrange(year, month)[1]


def _add_months(
    value: date,
    months: int,
    *,
    anchor_day: int,
) -> date:
    absolute_month = (value.year * 12) + (value.month - 1) + months
    year, zero_based_month = divmod(absolute_month, 12)
    month = zero_based_month + 1

    day = min(anchor_day, _days_in_month(year, month))
    return date(year, month, day)


def _add_years(
    value: date,
    years: int,
    *,
    anchor_month: int,
    anchor_day: int,
) -> date:
    year = value.year + years
    day = min(anchor_day, _days_in_month(year, anchor_month))
    return date(year, anchor_month, day)


def next_occurrence(
    current: date,
    frequency: Frequency,
    interval: int = 1,
    *,
    anchor_day: int | None = None,
    anchor_month: int | None = None,
) -> date:
    if interval < 1:
        raise ValueError("interval must be at least 1")

    preserved_day = anchor_day or current.day
    preserved_month = anchor_month or current.month

    if frequency == "daily":
        return current + timedelta(days=interval)

    if frequency == "weekly":
        return current + timedelta(weeks=interval)

    if frequency == "monthly":
        return _add_months(
            current,
            interval,
            anchor_day=preserved_day,
        )

    if frequency == "quarterly":
        return _add_months(
            current,
            interval * 3,
            anchor_day=preserved_day,
        )

    if frequency == "yearly":
        return _add_years(
            current,
            interval,
            anchor_month=preserved_month,
            anchor_day=preserved_day,
        )

    raise ValueError(f"Unsupported recurring frequency: {frequency}")


def period_key(
    period_start: date,
    frequency: Frequency,
) -> str:
    if frequency == "daily":
        return period_start.isoformat()

    if frequency == "weekly":
        iso_year, iso_week, _ = period_start.isocalendar()
        return f"{iso_year}-W{iso_week:02d}"

    if frequency == "monthly":
        return period_start.strftime("%Y-%m")

    if frequency == "quarterly":
        quarter = ((period_start.month - 1) // 3) + 1
        return f"{period_start.year}-Q{quarter}"

    if frequency == "yearly":
        return str(period_start.year)

    raise ValueError(f"Unsupported recurring frequency: {frequency}")


def period_end(
    period_start: date,
    next_period_start: date,
) -> date:
    if next_period_start <= period_start:
        raise ValueError("next_period_start must be after period_start")

    return next_period_start - timedelta(days=1)


def should_end_schedule(
    *,
    end_rule: str,
        generated_count: int,
        end_after_count: int | None,
        end_date: date | None,
        next_run_date: date,
) -> bool:
    if end_rule == "after_count":
        return (
            end_after_count is not None
            and generated_count >= end_after_count
        )
    if end_rule == "on_date":
        return (
            end_date is not None
            and next_run_date > end_date
        )

    return False


def is_schedule_ended(
    *,
    end_rule: str,
    generated_count: int,
    end_after_count: int | None,
    end_date: date | None,
    next_run_date: date,
) -> bool:
    if end_rule == "never":
        return False

    if end_rule == "after_count":
        if end_after_count is None:
            raise ValueError("end_after_count is required for after_count")
        return generated_count >= end_after_count

    if end_rule == "on_date":
        if end_date is None:
            raise ValueError("end_date is required for on_date")
        return next_run_date > end_date

    raise ValueError(f"Unsupported end rule: {end_rule}")
