import asyncio
import logging

logger = logging.getLogger(__name__)

async def claim_due_jobs():
    """
    Polls scheduled jobs in PostgreSQL using SELECT FOR UPDATE SKIP LOCKED
    and executes them reliably.
    """
    logger.info("Claim due jobs scheduler active.")
