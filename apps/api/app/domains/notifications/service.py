import logging

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    async def notify_invoice_viewed(freelancer_email: str, invoice_number: str):
        logger.info(f"Notification: Invoice {invoice_number} was viewed by client. Sending alert to {freelancer_email}")

    @staticmethod
    async def notify_payment_claimed(freelancer_email: str, invoice_number: str, amount_formatted: str):
        logger.info(f"Notification: Client claimed payment of {amount_formatted} on {invoice_number}. Alerting {freelancer_email}")
