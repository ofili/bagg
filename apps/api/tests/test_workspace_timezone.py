from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.core.dates import (
    business_today,
    validate_timezone_name,
)
from app.domains.workspaces.schemas import WorkspaceUpdate


def test_valid_iana_timezone_is_preserved():
    assert validate_timezone_name("Africa/Lagos") == "Africa/Lagos"
    assert validate_timezone_name("Europe/London") == "Europe/London"


def test_timezone_whitespace_is_normalized():
    assert validate_timezone_name("  Africa/Lagos  ") == "Africa/Lagos"


@pytest.mark.parametrize(
    "value",
    ["", "   ", "Not/A_Timezone", "Africa/InvalidCity"],
)
def test_invalid_timezone_is_rejected(value):
    with pytest.raises(ValueError):
        validate_timezone_name(value)


def test_workspace_update_accepts_timezone():
    payload = WorkspaceUpdate(timezone="Europe/London")

    assert payload.timezone == "Europe/London"


def test_workspace_update_rejects_invalid_timezone():
    with pytest.raises(ValidationError):
        WorkspaceUpdate(timezone="Not/A_Timezone")


def test_business_today_uses_workspace_timezone():
    instant = datetime(2026, 1, 1, 23, 30, tzinfo=timezone.utc)

    assert business_today("Africa/Lagos", now=instant).isoformat() == "2026-01-02"
    assert business_today("UTC", now=instant).isoformat() == "2026-01-01"
