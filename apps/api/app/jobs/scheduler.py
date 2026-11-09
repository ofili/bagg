"""Long-running scheduler for Bagg background jobs."""

from __future__ import annotations

import asyncio
import logging

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.domains.billing.service import expire_due_subscriptions
from app.domains.recurring_invoices.worker import (
    run_recurring_invoice_worker,
)
from app.domains.reminders.service import process_due_reminders

logger = logging.getLogger("bagg-scheduler")


async def run_once() -> dict[str, object]:
    results: dict[str, object] = {}

    try:
        results["recurring_invoices"] = await run_recurring_invoice_worker()
    except Exception as exc:
        logger.exception(
            "Recurring invoice worker failed",
            extra={"error_type": type(exc).__name__},
        )
        results["recurring_invoice_error"] = type(exc).__name__

    try:
        async with AsyncSessionLocal() as db:
            results["reminders_queued"] = await process_due_reminders(db=db, limit=100)
    except Exception as exc:
        logger.exception(
            "Reminder enqueue worker failed",
            extra={"error_type": type(exc).__name__},
        )
        results["reminder_error"] = type(exc).__name__

    try:
        async with AsyncSessionLocal() as db:
            results["subscriptions_downgraded"] = await expire_due_subscriptions(db)
    except Exception as exc:
        logger.exception(
            "Subscription expiry worker failed",
            extra={"error_type": type(exc).__name__},
        )
        results["subscription_expiry_error"] = type(exc).__name__

    return results


async def main() -> None:
    logger.info("Bagg scheduler started")

    poll_seconds = max(
        5,
        settings.RECURRING_INVOICE_POLL_SECONDS,
    )

    while True:
        try:
            results = await run_once()
            logger.info(
                "Scheduled cycle completed: %s",
                results,
            )

        except asyncio.CancelledError:
            raise

        except Exception:
            logger.exception("Bagg scheduler cycle failed")

        await asyncio.sleep(poll_seconds)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
