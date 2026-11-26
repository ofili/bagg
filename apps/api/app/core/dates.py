"""Workspace-aware business date utilities.

Business dates are evaluated in the workspace's configured IANA timezone,
not the server's local timezone.
"""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_WORKSPACE_TIMEZONE = "Africa/Lagos"


def validate_timezone_name(value: str) -> str:
    """Validate and normalize an IANA timezone identifier.

    Args:
        value: IANA timezone name, e.g. Africa/Lagos or Europe/London.

    Returns:
        The normalized timezone identifier.

    Raises:
        ValueError: If the value is empty or is not a recognized timezone.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("A valid IANA timezone is required.")

    timezone_name = value.strip()

    try:
        ZoneInfo(timezone_name)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError(
            f"Unknown timezone '{timezone_name}'. "
            "Use a valid IANA timezone identifier."
        ) from exc

    return timezone_name


def business_today(
    timezone_name: str,
    *,
    now: datetime | None = None,
) -> date:
    """Return the current calendar date in a workspace's timezone.

    Args:
        timezone_name: Workspace IANA timezone identifier.
        now: Optional timezone-aware datetime. Primarily useful for
            deterministic calculations and tests. When omitted, the
            current UTC instant is used.

    Returns:
        The calendar date in the requested workspace timezone.

    Raises:
        ValueError: If the timezone is invalid or ``now`` is naive.
    """
    normalized_timezone = validate_timezone_name(timezone_name)
    workspace_timezone = ZoneInfo(normalized_timezone)

    instant = now if now is not None else datetime.now(timezone.utc)

    if instant.tzinfo is None or instant.utcoffset() is None:
        raise ValueError("The supplied datetime must be timezone-aware.")

    return instant.astimezone(workspace_timezone).date()
