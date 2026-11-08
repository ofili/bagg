"""Transactional security-email adapter backed by the shared encrypted outbox."""

from __future__ import annotations

from html import escape
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.email_outbox import enqueue_email

_TEMPLATES = {
    "security_email_change_current": (
        "Confirm your current email address",
        "Use this verification code to confirm the email address on your Bagg account.",
    ),
    "security_email_change_new": (
        "Confirm your new email address",
        "Use this verification code to confirm the new email address for your Bagg account.",
    ),
}


def _render_security_email(*, message: str, code: str, expires_in_minutes: int) -> str:
    return (
        '<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5">'
        '<main style="max-width:560px;margin:24px auto;padding:24px">'
        "<h2>Bagg account security</h2>"
        f"<p>{escape(message)}</p>"
        '<p style="font-size:28px;font-weight:700;letter-spacing:6px">'
        f"{escape(code)}</p>"
        f"<p>This code expires in {int(expires_in_minutes)} minutes.</p>"
        "<p>If you did not request this change, secure your account and contact support.</p>"
        "</main></body></html>"
    )


async def enqueue_security_email(
    db: AsyncSession,
    *,
    recipient: str,
    template: str,
    payload: dict[str, Any],
    aggregate_id: str,
) -> None:
    """Add the security email to the same transaction as its state change.

    This function intentionally does not commit. The caller commits the
    verification request and encrypted outbox record atomically.
    """
    if template not in _TEMPLATES:
        raise ValueError(f"Unsupported security email template: {template}")
    code = payload.get("code")
    expires_in_minutes = payload.get("expires_in_minutes")
    if not isinstance(code, str) or not code.isdigit() or len(code) != 6:
        raise ValueError("Security email requires a six-digit verification code")
    if not isinstance(expires_in_minutes, int) or expires_in_minutes < 1:
        raise ValueError("Security email expiry must be a positive integer")

    subject, message = _TEMPLATES[template]
    enqueue_email(
        db,
        message_type=template,
        aggregate_id=aggregate_id,
        payload={
            "to_email": recipient,
            "subject": subject,
            "html": _render_security_email(
                message=message,
                code=code,
                expires_in_minutes=expires_in_minutes,
            ),
        },
    )
