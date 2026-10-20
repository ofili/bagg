import logging

logger = logging.getLogger(__name__)

async def handle_send_reminder(invoice_id: str):
    logger.info(f"Worker job: Sending reminder for invoice {invoice_id}")

async def handle_generate_pdf(invoice_id: str):
    logger.info(f"Worker job: Rendering PDF for invoice {invoice_id}")
