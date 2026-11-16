
from __future__ import annotations

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.documents.models import DocumentGenerationJob
from app.domains.documents.snapshots import (
    DocumentSnapshotModel,
    serialize_document_snapshot,
)


async def enqueue_document_generation(
    db: AsyncSession,
    document: DocumentSnapshotModel,
    *,
    issuance_generation: int,
) -> None:
    """Enqueue an issued PDF within the caller's current transaction.

    Safe to call more than once for the same document identity.
    Does not commit or roll back the caller's transaction.
    """
    if issuance_generation < 1:
        raise ValueError("issuance_generation must be positive")

    snapshot = serialize_document_snapshot(document)

    if snapshot["workspace_id"] != document.workspace_id:
        raise ValueError("Snapshot workspace identity mismatch")

    values = {
        "workspace_id": document.workspace_id,
        "document_type": document.document_type,
        "source_id": document.source_id,
        "source_version": snapshot["source_version"],
        "issuance_generation": issuance_generation,
        "artifact_kind": "issued",
        "snapshot": snapshot,
        "status": "pending",
        "attempts": 0,
    }

    statement = (
        insert(DocumentGenerationJob)
        .values(**values)
        .on_conflict_do_nothing(
            index_elements=[
                DocumentGenerationJob.workspace_id,
                DocumentGenerationJob.document_type,
                DocumentGenerationJob.source_id,
                DocumentGenerationJob.source_version,
                DocumentGenerationJob.issuance_generation,
                DocumentGenerationJob.artifact_kind,
            ]
        )
    )

    await db.execute(statement)
