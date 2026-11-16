from datetime import datetime, timezone

import pytest

from app.domains.documents.generation import enqueue_document_generation
from app.domains.documents.models import DocumentGenerationJob
from app.domains.documents.schemas import InvoiceDocument
from app.domains.documents.snapshots import serialize_document_snapshot


def sample_invoice_document():
    return InvoiceDocument(
        source_id="inv_test_001",
        workspace_id="ws_test_001",
        invoice_number="INV-0001",
        version=1,
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


def test_snapshot_contains_typed_document_payload():
    document = sample_invoice_document()

    snapshot = serialize_document_snapshot(
        document,
        captured_at=datetime(2026, 11, 16, tzinfo=timezone.utc),
    )

    assert snapshot["snapshot_schema_version"] == 1
    assert snapshot["document_type"] == "invoice"
    assert snapshot["source_id"] == "inv_test_001"
    assert snapshot["workspace_id"] == "ws_test_001"
    assert snapshot["source_version"] == 1
    assert snapshot["document"]["invoice_number"] == "INV-0001"


def test_snapshot_rejects_naive_timestamp():
    document = sample_invoice_document()

    with pytest.raises(ValueError):
        serialize_document_snapshot(
            document,
            captured_at=datetime(2026, 11, 16),
        )


@pytest.mark.asyncio
async def test_enqueue_creates_pending_job(db_session):
    document = sample_invoice_document()

    await enqueue_document_generation(
        db_session,
        document,
        issuance_generation=1,
    )

    await db_session.flush()

    job = await db_session.get(
        DocumentGenerationJob,
        # Query by the stable identity below instead of assuming an ID.
        "not-an-id",
    )

    from sqlalchemy import select

    result = await db_session.execute(
        select(DocumentGenerationJob).where(
            DocumentGenerationJob.workspace_id == "ws_test_001",
            DocumentGenerationJob.document_type == "invoice",
            DocumentGenerationJob.source_id == "inv_test_001",
            DocumentGenerationJob.source_version == 1,
            DocumentGenerationJob.issuance_generation == 1,
            DocumentGenerationJob.artifact_kind == "issued",
        )
    )

    job = result.scalar_one()

    assert job.status == "pending"
    assert job.attempts == 0
    assert job.snapshot["document"]["invoice_number"] == "INV-0001"


@pytest.mark.asyncio
async def test_enqueue_is_idempotent(db_session):
    document = sample_invoice_document()

    await enqueue_document_generation(
        db_session,
        document,
        issuance_generation=1,
    )
    await enqueue_document_generation(
        db_session,
        document,
        issuance_generation=1,
    )

    from sqlalchemy import select, func

    count = await db_session.scalar(
        select(func.count())
        .select_from(DocumentGenerationJob)
        .where(
            DocumentGenerationJob.workspace_id == "ws_test_001",
            DocumentGenerationJob.document_type == "invoice",
            DocumentGenerationJob.source_id == "inv_test_001",
            DocumentGenerationJob.source_version == 1,
            DocumentGenerationJob.issuance_generation == 1,
        )
    )

    assert count == 1


@pytest.mark.asyncio
async def test_reissue_uses_a_new_generation(db_session):
    document = sample_invoice_document()

    await enqueue_document_generation(
        db_session,
        document,
        issuance_generation=1,
    )
    await enqueue_document_generation(
        db_session,
        document,
        issuance_generation=2,
    )

    from sqlalchemy import select, func

    count = await db_session.scalar(
        select(func.count())
        .select_from(DocumentGenerationJob)
        .where(
            DocumentGenerationJob.workspace_id == "ws_test_001",
            DocumentGenerationJob.document_type == "invoice",
            DocumentGenerationJob.source_id == "inv_test_001",
        )
    )

    assert count == 2
