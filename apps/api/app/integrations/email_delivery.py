import asyncio
import logging
import smtplib
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from enum import Enum

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

SENDLY_API_URL = "https://api.sendlyai.com/v1/messages"


class DeliveryOutcome(str, Enum):
    ACCEPTED = "accepted"
    RETRYABLE = "retryable"
    PERMANENT = "permanent"
    AMBIGUOUS = "ambiguous"


@dataclass(frozen=True)
class DeliveryResult:
    outcome: DeliveryOutcome
    provider: str
    error_code: str | None = None


def _send_via_smtp(
    to_email: str,
    subject: str,
    html: str,
) -> DeliveryResult:
    provider = "smtp"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.DEFAULT_FROM_EMAIL
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=15,
        ) as server:

            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(
                    settings.SMTP_USER,
                    settings.SMTP_PASSWORD,
                )

            server.sendmail(
                settings.DEFAULT_FROM_EMAIL,
                [to_email],
                msg.as_string(),
            )

        return DeliveryResult(
            outcome=DeliveryOutcome.ACCEPTED,
            provider=provider,
        )

    except smtplib.SMTPAuthenticationError:
        return DeliveryResult(
            DeliveryOutcome.PERMANENT,
            provider,
            "smtp_authentication_failed",
        )

    except smtplib.SMTPRecipientsRefused:
        return DeliveryResult(
            DeliveryOutcome.PERMANENT,
            provider,
            "smtp_recipient_rejected",
        )

    except smtplib.SMTPResponseException as exc:
        if 400 <= exc.smtp_code < 500:
            outcome = DeliveryOutcome.RETRYABLE
            code = "smtp_temporary_rejection"
        else:
            outcome = DeliveryOutcome.PERMANENT
            code = "smtp_permanent_rejection"

        return DeliveryResult(outcome, provider, code)

    except (TimeoutError, OSError):
        return DeliveryResult(
            DeliveryOutcome.AMBIGUOUS,
            provider,
            "smtp_transport_ambiguous",
        )

    except Exception:
        return DeliveryResult(
            DeliveryOutcome.AMBIGUOUS,
            provider,
            "smtp_unexpected_failure",
        )


async def _send_via_sendly(
    to_email: str,
    subject: str,
    html: str,
) -> DeliveryResult:

    provider = "sendly"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                SENDLY_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.SENDLY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "channel": "email",
                    "to": to_email,
                    "from": (settings.SENDLY_FROM_EMAIL or settings.DEFAULT_FROM_EMAIL),
                    "subject": subject,
                    "html": html,
                },
            )

        if 200 <= response.status_code < 300:
            return DeliveryResult(
                DeliveryOutcome.ACCEPTED,
                provider,
            )

        if response.status_code == 429 or response.status_code >= 500:
            return DeliveryResult(
                DeliveryOutcome.RETRYABLE,
                provider,
                f"sendly_http_{response.status_code}",
            )

        return DeliveryResult(
            DeliveryOutcome.PERMANENT,
            provider,
            f"sendly_http_{response.status_code}",
        )

    except (httpx.TimeoutException, httpx.TransportError):
        return DeliveryResult(
            DeliveryOutcome.AMBIGUOUS,
            provider,
            "sendly_transport_ambiguous",
        )

    except Exception:
        return DeliveryResult(
            DeliveryOutcome.AMBIGUOUS,
            provider,
            "sendly_unexpected_failure",
        )


async def deliver_email(
    to_email: str,
    subject: str,
    html: str,
    provider: str | None = None,
) -> DeliveryResult:

    selected = provider or ("sendly" if settings.SENDLY_API_KEY else "smtp")

    if selected == "sendly":
        if not settings.SENDLY_API_KEY:
            return DeliveryResult(
                DeliveryOutcome.PERMANENT,
                selected,
                "sendly_not_configured",
            )

        return await _send_via_sendly(
            to_email,
            subject,
            html,
        )

    if selected == "smtp":
        return await asyncio.to_thread(
            _send_via_smtp,
            to_email,
            subject,
            html,
        )

    return DeliveryResult(
        DeliveryOutcome.PERMANENT,
        selected,
        "unknown_provider",
    )
