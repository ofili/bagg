import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

SENDLY_API_URL = "https://api.sendlyai.com/v1/messages"


def _html_shell(title: str, body: str) -> str:
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #3A1F0A; margin: 0 0 16px;">{escape(title)}</h2>
        {body}
        <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">Sent via Bagg</p>
    </div>
    """


class EmailSender:
    def _sendly_from(self) -> str:
        address = settings.SENDLY_FROM_EMAIL or settings.DEFAULT_FROM_EMAIL
        if settings.SENDLY_FROM_NAME:
            return f"{settings.SENDLY_FROM_NAME} <{address}>"
        return address

    async def _send_via_sendly(self, to_email: str, subject: str, html: str) -> bool:
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
                        "from": self._sendly_from(),
                        "subject": subject,
                        "html": html,
                    },
                )
            if 200 <= response.status_code < 300:
                logger.info("Email delivered by SendlyAI to %s", to_email)
                return True
            logger.warning(
                "SendlyAI rejected email to %s: %s %s",
                to_email,
                response.status_code,
                response.text[:300],
            )
            return False
        except Exception as exc:
            logger.warning("SendlyAI email to %s failed: %s", to_email, exc)
            return False

    def _send_via_smtp(self, to_email: str, subject: str, html: str) -> bool:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.DEFAULT_FROM_EMAIL
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html"))

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(
                    settings.DEFAULT_FROM_EMAIL, [to_email], msg.as_string()
                )
            logger.info("Email delivered by SMTP to %s", to_email)
            return True
        except Exception as exc:
            if settings.ENVIRONMENT.strip().lower() == "production":
                logger.warning("SMTP email to %s failed: %s", to_email, exc)
                return False
            logger.info("SMTP unavailable (%s); treating local email as delivered", exc)
            return True

    async def _deliver(self, to_email: str, subject: str, html: str) -> bool:
        if settings.SENDLY_API_KEY:
            return await self._send_via_sendly(to_email, subject, html)
        return self._send_via_smtp(to_email, subject, html)

    async def send_invoice_email(
        self, to_email: str, invoice_number: str, share_url: str
    ) -> bool:
        body = (
            f"<p>You have received invoice <strong>{escape(invoice_number)}</strong>.</p>"
            f'<p><a href="{escape(share_url)}">View and pay the invoice</a></p>'
        )
        return await self._deliver(
            to_email,
            f"Invoice {invoice_number} from Bagg",
            _html_shell(f"Invoice {invoice_number}", body),
        )

    async def send_quote_email(
        self,
        to_email: str,
        quote_number: str,
        share_url: str,
        business_name: str,
        client_name: Optional[str],
        formatted_total: str,
        expires_at: str,
    ) -> bool:
        greeting = f"Hi {escape(client_name)}," if client_name else "Hello,"
        body = (
            f"<p>{greeting}</p>"
            f"<p>{escape(business_name)} sent you quote <strong>{escape(quote_number)}</strong> "
            f"for <strong>{escape(formatted_total)}</strong>.</p>"
            f"<p>The offer is valid until {escape(expires_at)}.</p>"
            f'<p><a href="{escape(share_url)}" style="background-color: #FF7A1A; color: #2B1405; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Review and respond</a></p>'
        )
        return await self._deliver(
            to_email,
            f"Quote {quote_number} from {business_name}",
            _html_shell(f"Quote {quote_number}", body),
        )

    async def send_issuer_question_email(
        self,
        to_email: str,
        business_name: str,
        quote_number: str,
        author_name: str,
        message: str,
        share_url: str,
        item_description: Optional[str] = None,
    ) -> bool:
        item_line = (
            f"<p><strong>About:</strong> {escape(item_description)}</p>"
            if item_description
            else ""
        )
        body = (
            f"<p>{escape(author_name)} asked a question on quote "
            f"<strong>{escape(quote_number)}</strong>.</p>"
            f"{item_line}"
            f'<blockquote style="border-left: 3px solid #FF7A1A; margin: 16px 0; padding: 4px 0 4px 12px; color: #3A1F0A;">{escape(message)}</blockquote>'
            f'<p><a href="{escape(share_url)}">Open the quote to respond</a></p>'
        )
        return await self._deliver(
            to_email,
            f"New question on {quote_number}",
            _html_shell(f"New question for {business_name}", body),
        )

    async def send_reminder_email(
        self,
        to_email: str,
        client_name: str,
        invoice_number: str,
        formatted_total: str,
        due_date: str,
        share_url: str,
        reminder_type: str,
    ) -> bool:
        subject_map = {
            "upcoming_3d": f"Upcoming: Invoice {invoice_number} is due in 3 days",
            "due_today": f"Payment Due Today: Invoice {invoice_number}",
            "overdue_3d": f"Polite Follow-up: Invoice {invoice_number} was due 3 days ago",
            "overdue_7d": f"Reminder: Invoice {invoice_number} is overdue",
        }
        subject = subject_map.get(
            reminder_type, f"Payment Reminder: Invoice {invoice_number}"
        )
        body = (
            f"<p>Dear {escape(client_name)},</p>"
            f"<p>This is a courteous reminder that invoice "
            f"<strong>{escape(invoice_number)}</strong> for "
            f"<strong>{escape(formatted_total)}</strong> is due on "
            f"<strong>{escape(due_date)}</strong>.</p>"
            f'<p><a href="{escape(share_url)}" style="background-color: #1FA971; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View &amp; Pay Invoice</a></p>'
            f'<p style="color: #6b7280; font-size: 13px;">If you have already initiated this transfer, open the link and tap "I have paid" to submit your confirmation.</p>'
        )
        return await self._deliver(
            to_email,
            subject,
            _html_shell(f"Invoice {invoice_number}", body),
        )

    async def send_login_code_email(
        self,
        to_email: str,
        code: str,
        expires_in_minutes: int = 10,
    ) -> bool:
        body = (
            "<p>Use this one-time code to sign in to your Bagg account:</p>"
            '<p style="font-size: 32px; font-weight: 800; '
            'letter-spacing: 8px; color: #3A1F0A; margin: 24px 0;">'
            f"{escape(code)}</p>"
            f"<p>This code expires in {expires_in_minutes} minutes.</p>"
            "<p>If you did not request this code, you can ignore this email.</p>"
            "<p>For your security, do not share this code with anyone.</p>"
        )

        return await self._deliver(
            to_email,
            "Your Bagg sign-in code",
            _html_shell("Sign in to Bagg", body),
        )
