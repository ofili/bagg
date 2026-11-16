from __future__ import annotations

from datetime import datetime, timezone
from typing import TypeAlias

from pydantic import BaseModel

from app.domains.documents.schemas import (
    InvoiceDocument,
    QuoteDocument,
    ReceiptDocument,
)

DocumentSnapshotModel: TypeAlias = InvoiceDocument | QuoteDocument | ReceiptDocument

SNAPSHOT_SCHEMA_VERSION = 1


def serialize_document_snapshot(
    document: DocumentSnapshotModel,
    *,
    captured_at: datetime | None = None,
) -> dict:
    """Serialize a typed document into a stable JSON-compatible snapshot.

    The resulting payload is suitable for DocumentArtifact.snapshot.
    It contains no ORM objects, lazy relationships, or database references.
    """
    if not isinstance(
        document,
        (InvoiceDocument, QuoteDocument, ReceiptDocument),
    ):
        raise TypeError(f"Unsupported document snapshot: {type(document).__name__}")

    timestamp = captured_at or datetime.now(timezone.utc)

    if timestamp.tzinfo is None:
        raise ValueError("captured_at must be timezone-aware")

    return {
        "snapshot_schema_version": SNAPSHOT_SCHEMA_VERSION,
        "captured_at": timestamp.astimezone(timezone.utc).isoformat(),
        "document_type": document.document_type,
        "source_id": document.source_id,
        "workspace_id": document.workspace_id,
        "source_version": _source_version(document),
        "document": document.model_dump(mode="json"),
    }


def _source_version(document) -> int:
    if isinstance(document, (InvoiceDocument, QuoteDocument)):
        return document.version

    if isinstance(document, ReceiptDocument):
        return 1

    raise TypeError(f"Unsupported document snapshot: {type(document).__name__}")
