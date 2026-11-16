import hashlib

import pytest

from app.domains.documents.artifacts.hashing import (
    sha256_hex,
    verify_sha256,
)
from app.domains.documents.artifacts.identity import ArtifactIdentity


def test_invoice_artifact_identity_generates_expected_storage_key():
    identity = ArtifactIdentity(
        workspace_id="ws_123",
        document_type="invoice",
        source_id="inv_456",
        source_version=2,
        issuance_generation=3,
    )

    assert identity.storage_key() == (
        "workspaces/ws_123/documents/" "invoice/inv_456/v2/g3.pdf"
    )


def test_quote_artifact_identity_generates_expected_storage_key():
    identity = ArtifactIdentity(
        workspace_id="ws_123",
        document_type="quote",
        source_id="qot_456",
        source_version=1,
        issuance_generation=1,
    )

    assert identity.storage_key() == (
        "workspaces/ws_123/documents/" "quote/qot_456/v1/g1.pdf"
    )


def test_receipt_artifact_identity_generates_expected_storage_key():
    identity = ArtifactIdentity(
        workspace_id="ws_123",
        document_type="receipt",
        source_id="rcp_456",
        source_version=1,
        issuance_generation=1,
    )

    assert identity.storage_key() == (
        "workspaces/ws_123/documents/" "receipt/rcp_456/v1/g1.pdf"
    )


@pytest.mark.parametrize(
    "document_type",
    ["invoice", "quote", "receipt"],
)
def test_supported_document_types_are_accepted(document_type):
    identity = ArtifactIdentity(
        workspace_id="ws_123",
        document_type=document_type,
        source_id="source_123",
        source_version=1,
        issuance_generation=1,
    )

    assert identity.document_type == document_type


def test_unsupported_document_type_is_rejected():
    with pytest.raises(ValueError, match="Unsupported document type"):
        ArtifactIdentity(
            workspace_id="ws_123",
            document_type="contract",
            source_id="contract_123",
            source_version=1,
            issuance_generation=1,
        )


def test_unsupported_artifact_kind_is_rejected():
    with pytest.raises(ValueError, match="Unsupported artifact kind"):
        ArtifactIdentity(
            workspace_id="ws_123",
            document_type="invoice",
            source_id="inv_123",
            source_version=1,
            issuance_generation=1,
            artifact_kind="final",
        )


@pytest.mark.parametrize("version", [0, -1])
def test_non_positive_source_version_is_rejected(version):
    with pytest.raises(ValueError, match="source_version must be positive"):
        ArtifactIdentity(
            workspace_id="ws_123",
            document_type="invoice",
            source_id="inv_123",
            source_version=version,
            issuance_generation=1,
        )


@pytest.mark.parametrize("generation", [0, -1])
def test_non_positive_issuance_generation_is_rejected(generation):
    with pytest.raises(
        ValueError,
        match="issuance_generation must be positive",
    ):
        ArtifactIdentity(
            workspace_id="ws_123",
            document_type="invoice",
            source_id="inv_123",
            source_version=1,
            issuance_generation=generation,
        )


def test_preview_is_a_valid_artifact_kind():
    identity = ArtifactIdentity(
        workspace_id="ws_123",
        document_type="invoice",
        source_id="inv_123",
        source_version=1,
        issuance_generation=1,
        artifact_kind="preview",
    )

    assert identity.artifact_kind == "preview"


def test_source_version_changes_storage_identity():
    first = ArtifactIdentity(
        workspace_id="ws_123",
        document_type="invoice",
        source_id="inv_123",
        source_version=1,
        issuance_generation=1,
    )
    second = ArtifactIdentity(
        workspace_id="ws_123",
        document_type="invoice",
        source_id="inv_123",
        source_version=2,
        issuance_generation=1,
    )

    assert first.storage_key() != second.storage_key()


def test_issuance_generation_changes_storage_identity():
    first = ArtifactIdentity(
        workspace_id="ws_123",
        document_type="invoice",
        source_id="inv_123",
        source_version=1,
        issuance_generation=1,
    )
    second = ArtifactIdentity(
        workspace_id="ws_123",
        document_type="invoice",
        source_id="inv_123",
        source_version=1,
        issuance_generation=2,
    )

    assert first.storage_key() != second.storage_key()


def test_sha256_hex_matches_standard_digest():
    content = b"%PDF-1.7 test document"

    assert sha256_hex(content) == hashlib.sha256(content).hexdigest()


def test_verify_sha256_accepts_matching_digest():
    content = b"%PDF-1.7 test document"

    assert verify_sha256(content, sha256_hex(content)) is True


def test_verify_sha256_rejects_different_digest():
    content = b"%PDF-1.7 test document"

    assert verify_sha256(content, "0" * 64) is False
