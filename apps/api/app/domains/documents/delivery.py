"""Document delivery status and immutable PDF delivery.

DocumentDeliveryStatus is the email/link dispatch status contract stored on
invoice and quote records.

PDF delivery retrieves immutable artifacts generated from persisted document
snapshots. It never renders a PDF or reads mutable financial records.
"""

import logging
from enum import StrEnum
from urllib.parse import quote

from fastapi import HTTPException, status
from fastapi.responses import Response
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_token
from app.domains.invoices.models import Invoice
from app.domains.quotes.models import Quote
from app.domains.receipts.models import Receipt
from app.domains.documents.artifacts.service import DocumentArtifactService
from app.domains.documents.models import DocumentGenerationJob

logger = logging.getLogger(__name__)


class DocumentDeliveryStatus(StrEnum):
    QUEUED = "queued"
    DELIVERED = "delivered"
    FAILED = "failed"
    NO_EMAIL = "no_email"
    LINK_SHARED = "link_shared"


PUBLIC_DOCUMENT_MODELS = {
    "invoice": Invoice,
    "quote": Quote,
    "receipt": Receipt,
}


async def deliver_public_document(
    db: AsyncSession,
    *,
    token: str,
    document_type: str,
) -> Response:
    """Validate a public share token and deliver its immutable PDF."""

    model = PUBLIC_DOCUMENT_MODELS.get(document_type)

    if model is None or not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or invalid link",
        )

    token_hash = hash_token(token)

    statement = select(model).where(model.share_token_hash == token_hash)

    result = await db.execute(statement)
    document = result.scalar_one_or_none()

    # Invalid, revoked and unknown tokens all receive the same response.
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or invalid link",
        )

    if document_type == "invoice":
        publicly_accessible_statuses = {
            "issued",
            "sent",
            "viewed",
            "payment_claimed",
            "partially_paid",
            "paid",
        }

        if (
            document.status not in publicly_accessible_statuses
            or document.voided_at is not None
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or invalid link",
            )

    elif document_type == "quote":
        if document.status == "draft":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or invalid link",
            )

    elif document_type == "receipt":
        if not document.is_verified:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or invalid link",
            )

    if not document.workspace_id or not document.id:
        logger.error(
            "Public document has incomplete identity: type=%s",
            document_type,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The generated document is temporarily unavailable.",
        )

    return await deliver_issued_document(
        db,
        workspace_id=document.workspace_id,
        document_type=document_type,
        source_id=document.id,
    )


async def deliver_issued_document(
    db: AsyncSession,
    *,
    workspace_id: str,
    document_type: str,
    source_id: str,
) -> Response:
    """Deliver the latest immutable issued PDF for a workspace document."""

    if document_type not in {"invoice", "quote", "receipt"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    statement = (
        select(DocumentGenerationJob)
        .where(
            DocumentGenerationJob.workspace_id == workspace_id,
            DocumentGenerationJob.document_type == document_type,
            DocumentGenerationJob.source_id == source_id,
            DocumentGenerationJob.artifact_kind == "issued",
        )
        .order_by(
            desc(DocumentGenerationJob.source_version),
            desc(DocumentGenerationJob.issuance_generation),
            desc(DocumentGenerationJob.created_at),
        )
        .limit(1)
    )

    result = await db.execute(statement)
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if job.status != "succeeded":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "document_not_ready",
                "status": job.status,
                "message": "The PDF document is not ready yet.",
            },
        )

    if not job.artifact_id:
        logger.error(
            "Document generation job succeeded without an artifact: %s",
            job.id,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The generated document is temporarily unavailable.",
        )

    artifact_service = DocumentArtifactService(db)

    try:
        artifact_result = await artifact_service.get_pdf(
            artifact_id=job.artifact_id,
            workspace_id=workspace_id,
        )
    except Exception:
        logger.exception(
            "Unable to retrieve generated document artifact for job %s",
            job.id,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The generated document is temporarily unavailable.",
        ) from None

    if artifact_result is None:
        logger.error(
            "Document artifact metadata or storage object is missing for job %s",
            job.id,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The generated document is temporarily unavailable.",
        )

    artifact, pdf_content = artifact_result

    expected_identity = (
        artifact.workspace_id == workspace_id
        and artifact.document_type == document_type
        and artifact.source_id == source_id
        and artifact.source_version == job.source_version
        and artifact.issuance_generation == job.issuance_generation
        and artifact.artifact_kind == job.artifact_kind
        and artifact.id == job.artifact_id
        and artifact.mime_type == "application/pdf"
    )

    if not expected_identity:
        logger.error(
            "Document artifact identity mismatch for generation job %s",
            job.id,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The generated document is temporarily unavailable.",
        )

    if not pdf_content.startswith(b"%PDF-"):
        logger.error(
            "Document artifact is not a valid PDF for generation job %s",
            job.id,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The generated document is temporarily unavailable.",
        )

    filename = f"{document_type.title()}-{source_id}.pdf"

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (f"inline; filename*=UTF-8''{quote(filename)}"),
            "Content-Length": str(len(pdf_content)),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )
