import asyncio

import pytest

from app.jobs import scheduler


@pytest.mark.asyncio
async def test_run_once_isolates_task_failures(monkeypatch):
    async def successful_task():
        return {"processed": 3}

    async def failing_task():
        raise RuntimeError("simulated failure")

    monkeypatch.setattr(
        scheduler,
        "build_tasks",
        lambda: [
            scheduler.ScheduledTask(
                name="successful",
                interval_seconds=60,
                run=successful_task,
            ),
            scheduler.ScheduledTask(
                name="failing",
                interval_seconds=60,
                run=failing_task,
            ),
        ],
    )

    results = await scheduler.run_once()

    assert results["successful"] == {"processed": 3}
    assert results["failing_error"] == "RuntimeError"


@pytest.mark.asyncio
async def test_scheduler_runs_due_task_and_releases_leadership(monkeypatch):
    stop_event = asyncio.Event()
    calls = []
    released = []

    class FakeConnection:
        pass

    connection = FakeConnection()

    async def acquire():
        return connection

    async def release(received_connection):
        released.append(received_connection)

    async def task():
        calls.append("executed")
        stop_event.set()

    monkeypatch.setattr(scheduler, "acquire_leadership", acquire)
    monkeypatch.setattr(scheduler, "release_leadership", release)

    await scheduler.run_scheduler(
        stop_event,
        tasks=[
            scheduler.ScheduledTask(
                name="test_task",
                interval_seconds=60,
                run=task,
            )
        ],
    )

    assert calls == ["executed"]
    assert released == [connection]


@pytest.mark.asyncio
async def test_scheduler_waits_when_leadership_is_unavailable(monkeypatch):
    stop_event = asyncio.Event()
    attempts = 0

    async def acquire():
        nonlocal attempts
        attempts += 1

        if attempts == 1:
            stop_event.set()

        return None

    monkeypatch.setattr(scheduler, "acquire_leadership", acquire)

    await scheduler.run_scheduler(
        stop_event,
        tasks=[
            scheduler.ScheduledTask(
                name="test_task",
                interval_seconds=60,
                run=lambda: asyncio.sleep(0),
            )
        ],
    )

    assert attempts == 1


@pytest.mark.asyncio
async def test_scheduler_rejects_non_positive_intervals(monkeypatch):
    async def acquire():
        return object()

    monkeypatch.setattr(scheduler, "acquire_leadership", acquire)

    with pytest.raises(ValueError, match="intervals must be positive"):
        await scheduler.run_scheduler(
            asyncio.Event(),
            tasks=[
                scheduler.ScheduledTask(
                    name="invalid",
                    interval_seconds=0,
                    run=lambda: asyncio.sleep(0),
                )
            ],
        )
