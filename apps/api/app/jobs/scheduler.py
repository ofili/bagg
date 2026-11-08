"""Long-running scheduler for recurring invoices and billing entitlements."""

from __future__ import annotations
import asyncio
import logging
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.domains.recurring_invoices.worker import run_recurring_invoice_worker
from app.domains.billing.service import expire_due_subscriptions

logger = logging.getLogger("bagg-scheduler")


async def run_once() -> dict[str, object]:
    results: dict[str, object] = {}
    try:
        results["recurring_invoices"] = await run_recurring_invoice_worker()
    except Exception as exc:
        logger.exception("Recurring invoice worker failed")
        results["recurring_invoice_error"] = str(exc)
    try:
        async with AsyncSessionLocal() as db:
            results["subscriptions_downgraded"] = await expire_due_subscriptions(db)
    except Exception as exc:
        logger.exception("Subscription expiry worker failed")
        results["subscription_expiry_error"] = str(exc)
    return results


async def main() -> None:
    logger.info("Bagg scheduler started")
    while True:
        try:
            logger.info("Scheduled cycle completed: %s", await run_once())
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Bagg scheduler cycle failed")
        await asyncio.sleep(max(5, settings.RECURRING_INVOICE_POLL_SECONDS))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
