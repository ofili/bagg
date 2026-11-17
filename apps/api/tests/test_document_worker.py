import asyncio

import uuid

from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.domains.documents.models import DocumentGenerationJob
from app.jobs.document_worker import (
    ClaimedDocumentJob,
    claim_batch,
    record_failure,
    record_success,
    run_worker,
    utcnow,
)
from app.domains.documents.artifacts.identity import ArtifactIdentity
from app.domains.documents.schemas import InvoiceDocument
from app.domains.documents.snapshots import serialize_document_snapshot
from app.jobs.document_worker import (
    parse_document_snapshot,
    validate_snapshot_job_identity,
)


def sample_invoice_document() -> InvoiceDocument:
    return InvoiceDocument(
        source_id="inv_worker_test_001",
        workspace_id="ws_worker_test_001",
        invoice_number="INV-0001",
        version=2,
        currency="NGN",
        issue_date="2026-11-16",
        due_date="2026-11-30",
        subtotal_minor=100000,
        discount_minor=0,
        tax_minor=0,
        total_minor=100000,
        wht_minor=0,
        net_payable_minor=100000,
        items=[],
        formatted_issue_date="November 16, 2026",
        formatted_due_date="November 30, 2026",
        formatted_subtotal="₦1,000.00",
        formatted_tax="₦0.00",
        formatted_total="₦1,000.00",
        formatted_wht="₦0.00",
        formatted_net_payable="₦1,000.00",
    )


def sample_snapshot() -> dict:
    return serialize_document_snapshot(
        sample_invoice_document(),
        captured_at=datetime(2026, 11, 16, tzinfo=timezone.utc),
    )


def sample_identity() -> ArtifactIdentity:
    return ArtifactIdentity(
        workspace_id="ws_worker_test_001",
        document_type="invoice",
        source_id="inv_worker_test_001",
        source_version=2,
        issuance_generation=1,
        artifact_kind="issued",
    )


def test_parse_document_snapshot_returns_typed_document():
    document = parse_document_snapshot(sample_snapshot())

    assert isinstance(document, InvoiceDocument)
    assert document.source_id == "inv_worker_test_001"
    assert document.workspace_id == "ws_worker_test_001"
    assert document.version == 2


def test_parse_document_snapshot_rejects_non_dict():
    with pytest.raises(ValueError, match="invalid_snapshot"):
        parse_document_snapshot(None)


def test_parse_document_snapshot_rejects_unknown_schema_version():
    snapshot = sample_snapshot()
    snapshot["snapshot_schema_version"] = 999

    with pytest.raises(ValueError, match="unsupported_snapshot_version"):
        parse_document_snapshot(snapshot)


def test_parse_document_snapshot_rejects_document_type_mismatch():
    snapshot = sample_snapshot()
    snapshot["document_type"] = "quote"

    with pytest.raises(ValueError, match="snapshot_document_type_mismatch"):
        parse_document_snapshot(snapshot)


def test_parse_document_snapshot_rejects_source_mismatch():
    snapshot = sample_snapshot()
    snapshot["source_id"] = "inv_some_other_record"

    with pytest.raises(ValueError, match="snapshot_source_mismatch"):
        parse_document_snapshot(snapshot)


def test_parse_document_snapshot_rejects_workspace_mismatch():
    snapshot = sample_snapshot()
    snapshot["workspace_id"] = "ws_some_other_workspace"

    with pytest.raises(ValueError, match="snapshot_workspace_mismatch"):
        parse_document_snapshot(snapshot)


def test_parse_document_snapshot_rejects_source_version_mismatch():
    snapshot = sample_snapshot()
    snapshot["source_version"] = 1

    with pytest.raises(ValueError, match="snapshot_version_mismatch"):
        parse_document_snapshot(snapshot)


def test_validate_snapshot_job_identity_accepts_matching_identity():
    snapshot = sample_snapshot()

    validate_snapshot_job_identity(
        snapshot,
        sample_identity(),
    )


@pytest.mark.parametrize(
    ("field", "value", "error_code"),
    [
        ("document_type", "quote", "job_document_type_mismatch"),
        ("source_id", "inv_other", "job_source_mismatch"),
        ("workspace_id", "ws_other", "job_workspace_mismatch"),
        ("source_version", 99, "job_source_version_mismatch"),
    ],
)
def test_validate_snapshot_job_identity_rejects_mismatches(
    field,
    value,
    error_code,
):
    snapshot = sample_snapshot()
    snapshot[field] = value

    with pytest.raises(ValueError, match=error_code):
        validate_snapshot_job_identity(
            snapshot,
            sample_identity(),
        )


async def create_worker_job(
    *,
    status: str = "pending",
    locked_at=None,
    locked_by=None,
    claim_token=None,
    attempts: int = 0,
) -> str:
    """Create a uniquely identified job for worker integration tests."""

    unique = uuid.uuid4().hex

    job = DocumentGenerationJob(
        workspace_id=f"ws_worker_{unique}",
        document_type="invoice",
        source_id=f"inv_worker_{unique}",
        source_version=1,
        issuance_generation=1,
        artifact_kind="issued",
        snapshot=sample_snapshot(),
        status=status,
        attempts=attempts,
        available_at=utcnow() - timedelta(minutes=1),
        locked_at=locked_at,
        locked_by=locked_by,
        claim_token=claim_token,
    )

    async with AsyncSessionLocal() as db:
        db.add(job)
        await db.commit()
        return job.id


async def read_worker_job(job_id: str) -> DocumentGenerationJob:
    async with AsyncSessionLocal() as db:
        job = await db.get(DocumentGenerationJob, job_id)
        assert job is not None
        return job


async def delete_worker_job(job_id: str) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(DocumentGenerationJob, job_id)
        if job is not None:
            await db.delete(job)
            await db.commit()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "locked_at",
    [
        None,
        utcnow() - timedelta(hours=1),
    ],
)
async def test_claim_batch_recovers_expired_or_unlocked_jobs(
    locked_at,
    monkeypatch,
):
    monkeypatch.setattr(settings, "DOCUMENT_WORKER_BATCH_SIZE", 10)

    job_id = await create_worker_job(
        status="processing",
        locked_at=locked_at,
        locked_by="dead-worker",
        claim_token="old-claim",
        attempts=1,
    )

    before = await read_worker_job(job_id)

    print(
        "PERSISTED BEFORE CLAIM:",
        {
            "id": before.id,
            "status": before.status,
            "locked_at": before.locked_at,
            "locked_by": before.locked_by,
            "claim_token": before.claim_token,
            "attempts": before.attempts,
            "available_at": before.available_at,
        },
    )

    try:
        claims = await claim_batch()

        stored_before = await read_worker_job(job_id)

        print(
            "BEFORE CLAIM:",
            {
                "id": stored_before.id,
                "status": stored_before.status,
                "locked_at": stored_before.locked_at,
                "locked_by": stored_before.locked_by,
                "claim_token": stored_before.claim_token,
                "attempts": stored_before.attempts,
                "available_at": stored_before.available_at,
            },
        )

        async with AsyncSessionLocal() as db:
            from sqlalchemy import func, select

            counts = await db.execute(
                select(
                    DocumentGenerationJob.status,
                    func.count(DocumentGenerationJob.id),
                ).group_by(DocumentGenerationJob.status)
            )

            print("JOB COUNTS:", counts.all())

        matching = [claim for claim in claims if claim.job_id == job_id]
        assert len(matching) == 1

        stored = await read_worker_job(job_id)

        assert stored.status == "processing"
        assert stored.attempts == 2
        assert stored.claim_token == matching[0].claim_token
        assert stored.claim_token != "old-claim"
        assert stored.locked_by is not None
    finally:
        await delete_worker_job(job_id)


@pytest.mark.asyncio
async def test_record_failure_schedules_retry(
    monkeypatch,
):
    monkeypatch.setattr(
        "app.jobs.document_worker.random.uniform",
        lambda lower, upper: 0,
    )
    monkeypatch.setattr(settings, "DOCUMENT_WORKER_MAX_ATTEMPTS", 5)

    token = uuid.uuid4().hex
    job_id = await create_worker_job(
        status="processing",
        locked_at=utcnow(),
        locked_by="test-worker",
        claim_token=token,
        attempts=1,
    )

    try:
        before = utcnow()

        await record_failure(
            job_id,
            token,
            error_code="renderer_failure",
        )

        stored = await read_worker_job(job_id)

        assert stored.status == "pending"
        assert stored.last_error_code == "renderer_failure"
        assert stored.locked_at is None
        assert stored.locked_by is None
        assert stored.claim_token is None
        assert before + timedelta(seconds=30) <= stored.available_at
        assert stored.available_at <= before + timedelta(seconds=31)
    finally:
        await delete_worker_job(job_id)


@pytest.mark.asyncio
async def test_record_failure_marks_job_failed_at_attempt_limit(
    monkeypatch,
):
    monkeypatch.setattr(settings, "DOCUMENT_WORKER_MAX_ATTEMPTS", 5)

    token = uuid.uuid4().hex
    job_id = await create_worker_job(
        status="processing",
        locked_at=utcnow(),
        locked_by="test-worker",
        claim_token=token,
        attempts=5,
    )

    try:
        await record_failure(
            job_id,
            token,
            error_code="renderer_failure",
        )

        stored = await read_worker_job(job_id)

        assert stored.status == "failed"
        assert stored.completed_at is not None
        assert stored.claim_token is None
        assert stored.locked_by is None
    finally:
        await delete_worker_job(job_id)


@pytest.mark.asyncio
async def test_stale_claim_cannot_record_failure():
    current_token = uuid.uuid4().hex
    stale_token = uuid.uuid4().hex

    job_id = await create_worker_job(
        status="processing",
        locked_at=utcnow(),
        locked_by="test-worker",
        claim_token=current_token,
        attempts=2,
    )

    try:
        await record_failure(
            job_id,
            stale_token,
            error_code="stale_failure",
        )

        stored = await read_worker_job(job_id)

        assert stored.status == "processing"
        assert stored.claim_token == current_token
        assert stored.last_error_code is None
    finally:
        await delete_worker_job(job_id)


@pytest.mark.asyncio
async def test_stale_claim_cannot_record_success():
    current_token = uuid.uuid4().hex
    stale_token = uuid.uuid4().hex

    job_id = await create_worker_job(
        status="processing",
        locked_at=utcnow(),
        locked_by="test-worker",
        claim_token=current_token,
        attempts=2,
    )

    try:
        await record_success(
            job_id,
            stale_token,
            "doc_artifact_stale",
        )

        stored = await read_worker_job(job_id)

        assert stored.status == "processing"
        assert stored.claim_token == current_token
        assert stored.artifact_id is None
    finally:
        await delete_worker_job(job_id)


@pytest.mark.asyncio
async def test_concurrent_claims_do_not_claim_same_job(
    monkeypatch,
):
    monkeypatch.setattr(settings, "DOCUMENT_WORKER_BATCH_SIZE", 10)

    job_id = await create_worker_job()

    try:
        first, second = await asyncio.gather(
            claim_batch(),
            claim_batch(),
        )

        claims = [
            claim
            for batch in (first, second)
            for claim in batch
            if claim.job_id == job_id
        ]

        assert len(claims) == 1

        stored = await read_worker_job(job_id)

        assert stored.status == "processing"
        assert stored.claim_token == claims[0].claim_token
    finally:
        await delete_worker_job(job_id)


@pytest.mark.asyncio
async def test_claim_batch_prioritises_recoverable_jobs_over_pending_backlog(
    monkeypatch,
):
    monkeypatch.setattr(settings, "DOCUMENT_WORKER_BATCH_SIZE", 1)

    recovery_job_id = await create_worker_job(
        status="processing",
        locked_at=None,
        locked_by="dead-worker",
        claim_token="old-claim",
        attempts=1,
    )

    pending_job_id = await create_worker_job(
        status="pending",
        attempts=0,
    )

    try:
        claims = await claim_batch()

        assert len(claims) == 1
        assert claims[0].job_id == recovery_job_id

        recovered = await read_worker_job(recovery_job_id)
        pending = await read_worker_job(pending_job_id)

        assert recovered.status == "processing"
        assert recovered.attempts == 2
        assert recovered.claim_token == claims[0].claim_token
        assert recovered.claim_token != "old-claim"

        assert pending.status == "pending"
        assert pending.attempts == 0
    finally:
        await delete_worker_job(recovery_job_id)
        await delete_worker_job(pending_job_id)


@pytest.mark.asyncio
async def test_run_worker_processes_claimed_batch_concurrently(monkeypatch):
    stop_event = asyncio.Event()

    claims = [
        ClaimedDocumentJob(job_id="job-one", claim_token="token-one"),
        ClaimedDocumentJob(job_id="job-two", claim_token="token-two"),
    ]

    active = 0
    maximum_active = 0
    completed = []

    async def fake_claim_batch():
        return claims

    async def fake_process_job(claim):
        nonlocal active, maximum_active

        active += 1
        maximum_active = max(maximum_active, active)

        await asyncio.sleep(0.05)

        completed.append(claim.job_id)
        active -= 1

        if len(completed) == len(claims):
            stop_event.set()

    monkeypatch.setattr(
        "app.jobs.document_worker.claim_batch",
        fake_claim_batch,
    )
    monkeypatch.setattr(
        "app.jobs.document_worker.process_job",
        fake_process_job,
    )

    await run_worker(stop_event)

    assert maximum_active == 2
    assert set(completed) == {"job-one", "job-two"}


@pytest.mark.asyncio
async def test_run_worker_finishes_claimed_batch_before_shutdown(monkeypatch):
    stop_event = asyncio.Event()

    claims = [
        ClaimedDocumentJob(job_id="job-one", claim_token="token-one"),
        ClaimedDocumentJob(job_id="job-two", claim_token="token-two"),
    ]

    started = set()
    completed = set()
    all_started = asyncio.Event()
    claim_calls = 0

    async def fake_claim_batch():
        nonlocal claim_calls
        claim_calls += 1
        return claims

    async def fake_process_job(claim):
        started.add(claim.job_id)

        if len(started) == len(claims):
            all_started.set()

        await all_started.wait()

        if claim.job_id == "job-one":
            stop_event.set()

        await asyncio.sleep(0.01)
        completed.add(claim.job_id)

    monkeypatch.setattr(
        "app.jobs.document_worker.claim_batch",
        fake_claim_batch,
    )
    monkeypatch.setattr(
        "app.jobs.document_worker.process_job",
        fake_process_job,
    )

    await run_worker(stop_event)

    assert claim_calls == 1
    assert started == {"job-one", "job-two"}
    assert completed == {"job-one", "job-two"}
