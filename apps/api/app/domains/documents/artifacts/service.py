
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.documents.artifacts.hashing import sha256_hex
from app.domains.documents.artifacts.identity import ArtifactIdentity
from app.domains.documents.models import DocumentArtifact
from app.domains.documents.storage.s3 import (
    ImmutableDocumentConflict,
    S3DocumentStorage,
)


class DocumentArtifactService:
    """Persistence service for immutable PDF artifacts.

    The caller must supply a workspace-authorized source document and
    its already-built immutable snapshot. This service does not load
    invoices, quotes, or receipts and does not calculate financial values.

    Transaction ownership:
    - This service commits when it successfully creates an artifact.
    - It rolls back after an IntegrityError.
    - Callers should not combine unrelated pending database changes with
      artifact creation in the same session.
    """

    def __init__(
        self,
        db: AsyncSession,
        storage: S3DocumentStorage | None = None,
    ):
        self.db = db
        self.storage = storage or S3DocumentStorage()

    async def get_existing(
        self,
        identity: ArtifactIdentity,
    ) -> DocumentArtifact | None:
        statement = select(DocumentArtifact).where(
            DocumentArtifact.workspace_id == identity.workspace_id,
            DocumentArtifact.document_type == identity.document_type,
            DocumentArtifact.source_id == identity.source_id,
            DocumentArtifact.source_version == identity.source_version,
            DocumentArtifact.issuance_generation
            == identity.issuance_generation,
            DocumentArtifact.artifact_kind == identity.artifact_kind,
        )

        result = await self.db.execute(statement)
        return result.scalar_one_or_none()

    async def create_issued_artifact(
        self,
        *,
        identity: ArtifactIdentity,
        snapshot: dict,
        pdf_bytes: bytes,
        renderer_version: str,
        template_version: str = "1",
    ) -> DocumentArtifact:
        if identity.artifact_kind != "issued":
            raise ValueError("Only issued artifacts may be persisted here")

        if not pdf_bytes.startswith(b"%PDF-"):
            raise ValueError("Invalid PDF bytes")

        existing = await self.get_existing(identity)
        if existing:
            if existing.sha256 != sha256_hex(pdf_bytes):
                raise ImmutableDocumentConflict(
                    "An issued artifact already exists with different content"
                )
            return existing

        key = identity.storage_key()
        digest = sha256_hex(pdf_bytes)

        # S3 calls are synchronous; never execute them on the async
        # application event loop.
        await asyncio.to_thread(
            self.storage.put_if_absent,
            key=key,
            content=pdf_bytes,
            content_type="application/pdf",
        )

        artifact = DocumentArtifact(
            workspace_id=identity.workspace_id,
            document_type=identity.document_type,
            source_id=identity.source_id,
            source_version=identity.source_version,
            issuance_generation=identity.issuance_generation,
            artifact_kind=identity.artifact_kind,
            storage_key=key,
            mime_type="application/pdf",
            file_size_bytes=len(pdf_bytes),
            sha256=digest,
            snapshot=snapshot,
            renderer="weasyprint",
            renderer_version=renderer_version,
            template_version=template_version,
            generated_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
        )

        self.db.add(artifact)

        try:
            await self.db.flush()
            await self.db.commit()
            await self.db.refresh(artifact)
            return artifact

        except IntegrityError:
            await self.db.rollback()

            # Another request may have inserted the same identity.
            winner = await self.get_existing(identity)

            if winner:
                if winner.sha256 != digest:
                    raise ImmutableDocumentConflict(
                        "A concurrent request created this artifact identity "
                        "with different content"
                    )
                return winner

            raise

    async def get_pdf(
        self,
        *,
        artifact_id: str,
        workspace_id: str,
    ) -> tuple[DocumentArtifact, bytes] | None:
        statement = select(DocumentArtifact).where(
            DocumentArtifact.id == artifact_id,
            DocumentArtifact.workspace_id == workspace_id,
        )

        result = await self.db.execute(statement)
        artifact = result.scalar_one_or_none()

        if artifact is None:
            return None

        content = await asyncio.to_thread(
            self.storage.get,
            artifact.storage_key,
        )

        if sha256_hex(content) != artifact.sha256:
            raise RuntimeError(
                "Stored document integrity verification failed"
            )

        return artifact, content
