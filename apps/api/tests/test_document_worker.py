from datetime import datetime, timezone

import pytest

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
