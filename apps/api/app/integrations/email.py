import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailSender:
    async def send_invoice_email(self, to_email: str, invoice_number: str, share_url: str):
        """Sends invoice link via configured SMTP (Mailpit locally, Postmark/Resend in prod)."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Invoice {invoice_number} from Bagg"
        msg["From"] = settings.DEFAULT_FROM_EMAIL
        msg["To"] = to_email

        html = f"""
        <p>You have received an invoice: <strong>{invoice_number}</strong></p>
        <p><a href="{share_url}">Click here to view and pay the invoice</a></p>
        """
        msg.attach(MIMEText(html, "html"))

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.DEFAULT_FROM_EMAIL, [to_email], msg.as_string())
            logger.info(f"Email successfully delivered to {to_email}")
        except Exception as e:
            logger.warning(f"Could not connect to SMTP server: {e}. (Mocked for dev)")

    async def send_reminder_email(
        self,
        to_email: str,
        client_name: str,
        invoice_number: str,
        formatted_total: str,
        due_date: str,
        share_url: str,
        reminder_type: str,
    ):
        """Sends courteous payment reminder email based on reminder cadence (US-REM-01)."""
        subject_map = {
            "upcoming_3d": f"Upcoming: Invoice {invoice_number} is due in 3 days",
            "due_today": f"Payment Due Today: Invoice {invoice_number}",
            "overdue_3d": f"Polite Follow-up: Invoice {invoice_number} was due 3 days ago",
            "overdue_7d": f"Reminder: Invoice {invoice_number} is overdue",
        }
        subject = subject_map.get(reminder_type, f"Payment Reminder: Invoice {invoice_number}")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.DEFAULT_FROM_EMAIL
        msg["To"] = to_email

        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <p>Dear {client_name},</p>
            <p>This is a courteous reminder that invoice <strong>{invoice_number}</strong> for <strong>{formatted_total}</strong> is due on <strong>{due_date}</strong>.</p>
            <p style="margin: 24px 0;">
                <a href="{share_url}" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View & Pay Invoice</a>
            </p>
            <p style="color: #6b7280; font-size: 13px;">If you have already initiated this transfer, please visit the link above and tap "I've Paid" to submit your confirmation.</p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">Sent via Bagg Invoicing</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.DEFAULT_FROM_EMAIL, [to_email], msg.as_string())
            logger.info(f"Reminder email ({reminder_type}) delivered to {to_email}")
        except Exception as e:
            logger.warning(f"Could not connect to SMTP server: {e}. (Mocked for dev)")
