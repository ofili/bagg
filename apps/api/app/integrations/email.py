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
