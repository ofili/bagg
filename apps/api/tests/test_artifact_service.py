import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.exc import IntegrityError

from app.domains.documents.artifacts import service as service_module
from app.domains.documents.artifacts.hashing import sha256_hex
from app.domains.documents.artifacts.identity import ArtifactIdentity
from app.domains.documents.artifacts.service import DocumentArtifactService
from app.domains.documents.models import DocumentArtifact
from app.domains.documents.storage.s3 import ImmutableDocumentConflict

PDF_BYTES = b"%PDF-1.7 test document bytes"


@pytest.fixture
def identity():
    return ArtifactIdentity(
        workspace_id="ws_123",
        document_type="invoice",
        source_id="inv_123",
        source_version=1,
        issuance_generation=1,
    )


@pytest.fixture
def db():
    session = MagicMock()
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def storage():
    store = MagicMock()
    store.put_if_absent.return_value = SimpleNamespace(
        storage_key="workspaces/ws_123/documents/invoice/inv_123/v1/g1.pdf",
        content_type="application/pdf",
        content_length=len(PDF_BYTES),
        mime_type="application/pdf",
    )
    store.get.return_value = PDF_BYTES
    return store


@pytest.fixture
def service(db, storage):
    return DocumentArtifactService(db=db, storage=storage)


def scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def existing_artifact(*, digest=PDF_BYTES):
    return SimpleNamespace(sha256=sha256_hex(digest))


def integrity_error():
    return IntegrityError(
        "INSERT",
        {},
        Exception("unique constraint"),
    )


@pytest.mark.asyncio
async def test_get_existing_returns_matching_artifact(service, db, identity):
    artifact = MagicMock(spec=DocumentArtifact)
    db.execute.return_value = scalar_result(artifact)

    result = await service.get_existing(identity)

    assert result is artifact
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_existing_returns_none_when_not_found(service, db, identity):
    db.execute.return_value = scalar_result(None)

    result = await service.get_existing(identity)

    assert result is None


@pytest.mark.asyncio
async def test_create_issued_artifact_persists_metadata(
    service,
    db,
    storage,
    identity,
):
    db.execute.return_value = scalar_result(None)

    snapshot = {
        "document_type": "invoice",
        "invoice_number": "INV-001",
        "total_minor": 12500000,
        "currency": "NGN",
    }

    result = await service.create_issued_artifact(
        identity=identity,
        snapshot=snapshot,
        pdf_bytes=PDF_BYTES,
        renderer_version="65.0",
        template_version="1",
    )

    storage.put_if_absent.assert_called_once_with(
        key=identity.storage_key(),
        content=PDF_BYTES,
        content_type="application/pdf",
    )
    db.add.assert_called_once()

    artifact = db.add.call_args.args[0]

    assert isinstance(artifact, DocumentArtifact)
    assert artifact.workspace_id == identity.workspace_id
    assert artifact.document_type == "invoice"
    assert artifact.source_id == "inv_123"
    assert artifact.source_version == 1
    assert artifact.issuance_generation == 1
    assert artifact.artifact_kind == "issued"
    assert artifact.storage_key == identity.storage_key()
    assert artifact.mime_type == "application/pdf"
    assert artifact.file_size_bytes == len(PDF_BYTES)
    assert artifact.sha256 == sha256_hex(PDF_BYTES)
    assert artifact.snapshot == snapshot
    assert artifact.renderer == "reportlab"
    assert artifact.renderer_version == "65.0"
    assert artifact.template_version == "1"

    db.flush.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(artifact)
    assert result is artifact


@pytest.mark.asyncio
async def test_create_issued_artifact_returns_existing_artifact(
    service,
    db,
    storage,
    identity,
):
    existing = existing_artifact()
    db.execute.return_value = scalar_result(existing)

    result = await service.create_issued_artifact(
        identity=identity,
        snapshot={"invoice_number": "INV-001"},
        pdf_bytes=PDF_BYTES,
        renderer_version="65.0",
    )

    assert result is existing
    storage.put_if_absent.assert_not_called()
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_issued_artifact_rejects_preview_identity(service):
    preview_identity = ArtifactIdentity(
        workspace_id="ws_123",
        document_type="invoice",
        source_id="inv_123",
        source_version=1,
        issuance_generation=1,
        artifact_kind="preview",
    )

    with pytest.raises(
        ValueError,
        match="Only issued artifacts may be persisted",
    ):
        await service.create_issued_artifact(
            identity=preview_identity,
            snapshot={},
            pdf_bytes=PDF_BYTES,
            renderer_version="65.0",
        )


@pytest.mark.asyncio
async def test_create_issued_artifact_rejects_invalid_pdf(
    service,
    storage,
    db,
    identity,
):
    with pytest.raises(ValueError, match="Invalid PDF bytes"):
        await service.create_issued_artifact(
            identity=identity,
            snapshot={},
            pdf_bytes=b"not a pdf",
            renderer_version="65.0",
        )

    storage.put_if_absent.assert_not_called()
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_issued_artifact_does_not_insert_when_upload_fails(
    service,
    storage,
    db,
    identity,
):
    storage.put_if_absent.side_effect = RuntimeError("S3 unavailable")
    db.execute.return_value = scalar_result(None)

    with pytest.raises(RuntimeError, match="S3 unavailable"):
        await service.create_issued_artifact(
            identity=identity,
            snapshot={},
            pdf_bytes=PDF_BYTES,
            renderer_version="65.0",
        )

    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_issued_artifact_rolls_back_on_integrity_error(
    service,
    db,
    storage,
    identity,
):
    db.execute.side_effect = [
        scalar_result(None),
        scalar_result(None),
    ]
    db.flush.side_effect = integrity_error()

    with pytest.raises(IntegrityError):
        await service.create_issued_artifact(
            identity=identity,
            snapshot={},
            pdf_bytes=PDF_BYTES,
            renderer_version="65.0",
        )

    db.rollback.assert_awaited_once()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_create_issued_artifact_returns_concurrent_winner(
    service,
    db,
    storage,
    identity,
):
    winner = existing_artifact()

    db.execute.side_effect = [
        scalar_result(None),
        scalar_result(winner),
    ]
    db.flush.side_effect = integrity_error()

    result = await service.create_issued_artifact(
        identity=identity,
        snapshot={},
        pdf_bytes=PDF_BYTES,
        renderer_version="65.0",
    )

    assert result is winner
    db.rollback.assert_awaited_once()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_pdf_returns_artifact_and_verified_bytes(
    service,
    db,
    storage,
):
    artifact = SimpleNamespace(
        id="doc_123",
        workspace_id="ws_123",
        storage_key="workspaces/ws_123/documents/invoice/inv_123/v1/g1.pdf",
        sha256=sha256_hex(PDF_BYTES),
        mime_type="application/pdf",
    )
    db.execute.return_value = scalar_result(artifact)

    result = await service.get_pdf(
        artifact_id="doc_123",
        workspace_id="ws_123",
    )

    assert result == (artifact, PDF_BYTES)
    storage.get.assert_called_once_with(artifact.storage_key)


@pytest.mark.asyncio
async def test_get_pdf_returns_none_for_unknown_or_other_workspace_artifact(
    service,
    db,
    storage,
):
    db.execute.return_value = scalar_result(None)

    result = await service.get_pdf(
        artifact_id="doc_123",
        workspace_id="another_workspace",
    )

    assert result is None
    storage.get.assert_not_called()


@pytest.mark.asyncio
async def test_get_pdf_rejects_corrupted_stored_bytes(
    service,
    db,
    storage,
):
    artifact = SimpleNamespace(
        id="doc_123",
        workspace_id="ws_123",
        storage_key="documents/invoice.pdf",
        sha256=sha256_hex(PDF_BYTES),
        mime_type="application/pdf",
    )
    db.execute.return_value = scalar_result(artifact)
    storage.get.return_value = b"%PDF-1.7 tampered content"

    with pytest.raises(
        RuntimeError,
        match="integrity verification failed",
    ):
        await service.get_pdf(
            artifact_id="doc_123",
            workspace_id="ws_123",
        )


@pytest.mark.asyncio
async def test_create_issued_artifact_offloads_storage_upload_to_thread(
    service,
    db,
    identity,
    monkeypatch,
):
    db.execute.return_value = scalar_result(None)

    original_to_thread = asyncio.to_thread
    calls = []

    async def tracked_to_thread(func, *args, **kwargs):
        calls.append(func)
        return await original_to_thread(func, *args, **kwargs)

    monkeypatch.setattr(
        service_module.asyncio,
        "to_thread",
        tracked_to_thread,
    )

    await service.create_issued_artifact(
        identity=identity,
        snapshot={"invoice_number": "INV-001"},
        pdf_bytes=PDF_BYTES,
        renderer_version="65.0",
    )

    assert service.storage.put_if_absent in calls


@pytest.mark.asyncio
async def test_get_pdf_offloads_storage_download_to_thread(
    service,
    db,
    storage,
    monkeypatch,
):
    artifact = SimpleNamespace(
        id="doc_123",
        workspace_id="ws_123",
        storage_key="documents/invoice.pdf",
        sha256=sha256_hex(PDF_BYTES),
        mime_type="application/pdf",
    )
    db.execute.return_value = scalar_result(artifact)

    original_to_thread = asyncio.to_thread
    calls = []

    async def tracked_to_thread(func, *args, **kwargs):
        calls.append(func)
        return await original_to_thread(func, *args, **kwargs)

    monkeypatch.setattr(
        service_module.asyncio,
        "to_thread",
        tracked_to_thread,
    )

    await service.get_pdf(
        artifact_id="doc_123",
        workspace_id="ws_123",
    )

    assert service.storage.get in calls


@pytest.mark.asyncio
async def test_existing_artifact_rejects_different_pdf_bytes(
    service,
    db,
    storage,
    identity,
):
    existing = existing_artifact(digest=b"%PDF-1.7 original document")
    db.execute.return_value = scalar_result(existing)

    with pytest.raises(
        ImmutableDocumentConflict,
        match="already exists with different content",
    ):
        await service.create_issued_artifact(
            identity=identity,
            snapshot={"invoice_number": "INV-001"},
            pdf_bytes=PDF_BYTES,
            renderer_version="65.0",
        )

    storage.put_if_absent.assert_not_called()
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_concurrent_winner_with_different_hash_is_rejected(
    service,
    db,
    storage,
    identity,
):
    winner = existing_artifact(digest=b"%PDF-1.7 different document")

    db.execute.side_effect = [
        scalar_result(None),
        scalar_result(winner),
    ]
    db.flush.side_effect = integrity_error()

    with pytest.raises(
        ImmutableDocumentConflict,
        match="different content",
    ):
        await service.create_issued_artifact(
            identity=identity,
            snapshot={"invoice_number": "INV-001"},
            pdf_bytes=PDF_BYTES,
            renderer_version="65.0",
        )

    db.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_concurrent_winner_with_same_hash_is_idempotent(
    service,
    db,
    storage,
    identity,
):
    winner = existing_artifact()

    db.execute.side_effect = [
        scalar_result(None),
        scalar_result(winner),
    ]
    db.flush.side_effect = integrity_error()

    result = await service.create_issued_artifact(
        identity=identity,
        snapshot={"invoice_number": "INV-001"},
        pdf_bytes=PDF_BYTES,
        renderer_version="65.0",
    )

    assert result is winner
    db.rollback.assert_awaited_once()
