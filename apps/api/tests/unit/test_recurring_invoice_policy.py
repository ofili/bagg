from datetime import date
from types import SimpleNamespace

from app.domains.recurring_invoices.service import _generation_date


def test_draft_review_can_be_generated_before_period_date():
    schedule = SimpleNamespace(
        issue_mode="draft",
        next_run_date=date(2026, 12, 10),
        draft_lead_days=5,
    )
    assert _generation_date(schedule) == date(2026, 12, 5)


def test_auto_issue_is_generated_only_on_period_date():
    schedule = SimpleNamespace(
        issue_mode="auto_issue",
        next_run_date=date(2026, 12, 10),
        draft_lead_days=30,
    )
    assert _generation_date(schedule) == date(2026, 12, 10)
