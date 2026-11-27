"""Central scheduler for Bagg periodic background tasks.

The scheduler coordinates periodic work. It does not consume email or
document-generation queues; those remain owned by their dedicated workers.
"""

from __future__ import annotations

import asyncio
import logging
import signal
import time

from dataclasses import dataclass
from typing import Awaitable, Callable

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

import app.models  # noqa: F401
from app.core.config import settings
from app.core.database import AsyncSessionLocal, engine
from app.domains.billing.service import expire_due_subscriptions
from app.domains.recurring_invoices.worker import (
    run_recurring_invoice_worker,
)
from app.domains.reminders.service import process_due_reminders

logger = logging.getLogger("bagg-scheduler")

TaskCallable = Callable[[], Awaitable[object]]

# A stable, application-specific PostgreSQL advisory-lock key.
# PostgreSQL advisory locks accept signed 64-bit integers.
SCHEDULER_LEADER_LOCK_ID = 7_184_209_631_027_451


@dataclass(frozen=True, slots=True)
class ScheduledTask:
    name: str
    interval_seconds: int
    run: TaskCallable


def build_tasks() -> list[ScheduledTask]:
    """Build the code-defined periodic task registry."""

    async def enqueue_due_reminders() -> int:
        async with AsyncSessionLocal() as db:
            return await process_due_reminders(db=db, limit=100)

    async def expire_subscriptions() -> int:
        async with AsyncSessionLocal() as db:
            return await expire_due_subscriptions(db)

    return [
        ScheduledTask(
            name="recurring_invoices",
            interval_seconds=max(5, settings.RECURRING_INVOICE_POLL_SECONDS),
            run=run_recurring_invoice_worker,
        ),
        ScheduledTask(
            name="reminders",
            interval_seconds=max(5, settings.SCHEDULER_REMINDERS_INTERVAL_SECONDS),
            run=enqueue_due_reminders,
        ),
        ScheduledTask(
            name="subscription_expiry",
            interval_seconds=max(
                5,
                settings.SCHEDULER_SUBSCRIPTION_EXPIRY_INTERVAL_SECONDS,
            ),
            run=expire_subscriptions,
        ),
    ]


async def run_once() -> dict[str, object]:
    """Execute every registered periodic task once, independently."""

    results: dict[str, object] = {}

    for task in build_tasks():
        try:
            results[task.name] = await task.run()
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception(
                "Scheduled task failed",
                extra={
                    "task_name": task.name,
                    "error_type": type(exc).__name__,
                },
            )
            results[f"{task.name}_error"] = type(exc).__name__

    return results


async def acquire_leadership() -> AsyncConnection | None:
    """Acquire and retain a PostgreSQL session-level advisory lock."""

    connection = await engine.connect()

    try:
        result = await connection.execute(
            text("SELECT pg_try_advisory_lock(:lock_id)"),
            {"lock_id": SCHEDULER_LEADER_LOCK_ID},
        )
        acquired = bool(result.scalar_one())
        await connection.commit()

        if not acquired:
            await connection.close()
            return None

        logger.info(
            "Scheduler leadership acquired",
            extra={"lock_id": SCHEDULER_LEADER_LOCK_ID},
        )
        return connection

    except Exception:
        await connection.close()
        raise


async def release_leadership(connection: AsyncConnection) -> None:
    """Release scheduler leadership and close its dedicated connection."""

    try:
        result = await connection.execute(
            text("SELECT pg_advisory_unlock(:lock_id)"),
            {"lock_id": SCHEDULER_LEADER_LOCK_ID},
        )
        released = bool(result.scalar_one())
        await connection.commit()

        if released:
            logger.info("Scheduler leadership released")
        else:
            logger.warning("Scheduler advisory lock was not held at shutdown")

    except Exception:
        logger.exception("Could not explicitly release scheduler leadership")

    finally:
        await connection.close()


async def verify_leadership(connection: AsyncConnection) -> None:
    """Verify that the dedicated lock connection is still usable.

    A lost PostgreSQL session also loses its session-level advisory lock.
    We fail closed if this connection cannot be verified.
    """

    await connection.execute(text("SELECT 1"))
    await connection.commit()


async def _run_task(task: ScheduledTask) -> None:
    started = time.monotonic()

    logger.info(
        "Scheduled task started",
        extra={"task_name": task.name},
    )

    try:
        result = await task.run()
        logger.info(
            "Scheduled task completed",
            extra={
                "task_name": task.name,
                "duration_ms": round((time.monotonic() - started) * 1000),
                "result": result,
            },
        )

    except asyncio.CancelledError:
        logger.info(
            "Scheduled task cancelled",
            extra={"task_name": task.name},
        )
        raise

    except Exception as exc:
        logger.exception(
            "Scheduled task failed",
            extra={
                "task_name": task.name,
                "duration_ms": round((time.monotonic() - started) * 1000),
                "error_type": type(exc).__name__,
            },
        )


async def run_scheduler(
    stop_event: asyncio.Event,
    *,
    tasks: list[ScheduledTask] | None = None,
) -> None:
    """Run periodic tasks while this process holds scheduler leadership."""

    registered_tasks = tasks if tasks is not None else build_tasks()

    if not registered_tasks:
        logger.warning("Scheduler started with no registered tasks")
        return

    if any(task.interval_seconds < 1 for task in registered_tasks):
        raise ValueError("Scheduled task intervals must be positive")

    leadership: AsyncConnection | None = None

    while not stop_event.is_set() and leadership is None:
        try:
            leadership = await acquire_leadership()
        except Exception:
            logger.exception("Could not acquire scheduler leadership")

        if leadership is None and not stop_event.is_set():
            try:
                await asyncio.wait_for(
                    stop_event.wait(),
                    timeout=max(1, settings.SCHEDULER_LEADER_RETRY_SECONDS),
                )
            except asyncio.TimeoutError:
                pass

    if leadership is None:
        return

    active: dict[str, asyncio.Task[None]] = {}
    now = time.monotonic()
    next_run = {task.name: now for task in registered_tasks}
    task_by_name = {task.name: task for task in registered_tasks}
    heartbeat_seconds = max(5, settings.SCHEDULER_HEARTBEAT_SECONDS)
    next_heartbeat = now + heartbeat_seconds

    logger.info(
        "Bagg scheduler started",
        extra={
            "task_count": len(registered_tasks),
            "tasks": [
                {
                    "name": task.name,
                    "interval_seconds": task.interval_seconds,
                }
                for task in registered_tasks
            ],
        },
    )

    try:
        while not stop_event.is_set():
            now = time.monotonic()

            # Remove completed task handles before evaluating due work.
            for name, running_task in list(active.items()):
                if running_task.done():
                    active.pop(name, None)
                    # Retrieve unexpected exceptions to avoid unobserved-task
                    # warnings. _run_task normally handles its own failures.
                    if not running_task.cancelled():
                        running_task.exception()

            for task in registered_tasks:
                if now < next_run[task.name]:
                    continue

                if task.name in active:
                    logger.warning(
                        "Scheduled task still running; skipping this interval",
                        extra={"task_name": task.name},
                    )
                else:
                    active[task.name] = asyncio.create_task(
                        _run_task(task),
                        name=f"bagg-scheduler-{task.name}",
                    )

                # Schedule from this evaluation time. A long-running task
                # therefore cannot trigger a burst of missed executions.
                next_run[task.name] = now + task.interval_seconds

            if now >= next_heartbeat:
                try:
                    await verify_leadership(leadership)
                except Exception:
                    logger.exception(
                        "Scheduler leadership connection lost; stopping scheduler"
                    )
                    break

                next_heartbeat = time.monotonic() + heartbeat_seconds

            due_times = list(next_run.values())
            timeout = max(
                0.1,
                min(
                    1.0,
                    min(due_times) - time.monotonic(),
                    next_heartbeat - time.monotonic(),
                ),
            )

            try:
                await asyncio.wait_for(stop_event.wait(), timeout=timeout)
            except asyncio.TimeoutError:
                pass

    finally:
        logger.info("Scheduler stopping; waiting for active tasks")

        if active:
            await asyncio.gather(*active.values(), return_exceptions=True)

        await release_leadership(leadership)


def install_shutdown_handlers(
    loop: asyncio.AbstractEventLoop,
    stop_event: asyncio.Event,
) -> None:
    """Install SIGINT/SIGTERM handlers, including a Windows fallback."""

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, stop_event.set)
        except (NotImplementedError, RuntimeError):
            try:
                signal.signal(
                    sig,
                    lambda *_: loop.call_soon_threadsafe(stop_event.set),
                )
            except (OSError, ValueError):
                logger.warning(
                    "Could not install scheduler signal handler",
                    extra={"signal": sig.name},
                )


async def main() -> None:
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    install_shutdown_handlers(loop, stop_event)

    try:
        await run_scheduler(stop_event)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    asyncio.run(main())
