import asyncio
import logging

from app.core.database import AsyncSessionLocal
from app.domains.recurring_invoices.service import (
    process_due_recurring_invoices,
)

logger = logging.getLogger(__name__)


async def run_recurring_invoice_worker() -> dict[str, int]:
    """
    Run one bounded recurring-invoice batch.

    The domain service owns draft generation, idempotency, entitlement checks,
    and the same-day auto-issue guard. The worker must not independently
    finalize or send invoices because doing so could bypass the stale-run
    protection.
    """
    async with AsyncSessionLocal() as db:
        stats = await process_due_recurring_invoices(
            db,
            limit=50,
        )

    logger.info("Recurring invoice worker completed: %s", stats)
    return stats


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_recurring_invoice_worker())
