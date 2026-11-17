from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.dependencies import require_auth
from app.domains.documents.api_schemas import (
    DocumentGenerationStatusResponse,
    DocumentType,
)
from app.domains.documents.artifacts.service import DocumentArtifactService
from app.domains.documents.models import DocumentGenerationJob

router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


def _build_status_response(
    job: DocumentGenerationJob,
) -> DocumentGenerationStatusResponse:
    pdf_url = None

    if job.status == "succeeded" and job.artifact_id:
        pdf_url = f"/documents/{job.document_type}/{job.source_id}/pdf"

    return DocumentGenerationStatusResponse(
        job_id=job.id,
        document_type=job.document_type,
        source_id=job.source_id,
        source_version=job.source_version,
        issuance_generation=job.issuance_generation,
        artifact_kind=job.artifact_kind,
        status=job.status,
        attempts=job.attempts,
        artifact_id=job.artifact_id,
        last_error_code=job.last_error_code,
        available_at=job.available_at,
        created_at=job.created_at,
        updated_at=job.updated_at,
        completed_at=job.completed_at,
        pdf_url=pdf_url,
    )


async def _get_source_job(
    db: AsyncSession,
    *,
    workspace_id: str,
    document_type: DocumentType,
    source_id: str,
) -> DocumentGenerationJob:
    """
    Return the latest generation job for a source document.

    Source IDs are polymorphic, so document_type is always part
    of the lookup identity.
    """

    statement = (
        select(DocumentGenerationJob)
        .where(
            DocumentGenerationJob.workspace_id == workspace_id,
            DocumentGenerationJob.document_type == document_type,
            DocumentGenerationJob.source_id == source_id,
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
            detail="Document generation record not found.",
        )

    return job


async def _get_job_by_id(
    db: AsyncSession,
    *,
    workspace_id: str,
    job_id: str,
) -> DocumentGenerationJob:
    statement = select(DocumentGenerationJob).where(
        DocumentGenerationJob.id == job_id,
        DocumentGenerationJob.workspace_id == workspace_id,
    )

    result = await db.execute(statement)
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document generation job not found.",
        )

    return job


@router.get(
    "/{document_type}/{source_id}/status",
    response_model=DocumentGenerationStatusResponse,
)
async def get_document_generation_status(
    document_type: DocumentType,
    source_id: str,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the latest PDF-generation status for a financial document.

    The lookup is scoped to the authenticated workspace.
    """

    _user, workspace = auth

    job = await _get_source_job(
        db,
        workspace_id=workspace.id,
        document_type=document_type,
        source_id=source_id,
    )

    return _build_status_response(job)


@router.get(
    "/jobs/{job_id}",
    response_model=DocumentGenerationStatusResponse,
)
async def get_document_generation_job(
    job_id: str,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the status of a specific document-generation job.

    A job ID is not an authorization credential. Workspace ownership
    is checked independently.
    """

    _user, workspace = auth

    job = await _get_job_by_id(
        db,
        workspace_id=workspace.id,
        job_id=job_id,
    )

    return _build_status_response(job)


@router.get(
    "/{document_type}/{source_id}/pdf",
    response_class=Response,
)
async def get_document_pdf(
    document_type: DocumentType,
    source_id: str,
    auth=Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve the immutable issued PDF for the latest generation.

    PDFs are returned from private object storage through the
    artifact service. Storage URLs and storage keys are never exposed.
    """

    _user, workspace = auth

    job = await _get_source_job(
        db,
        workspace_id=workspace.id,
        document_type=document_type,
        source_id=source_id,
    )

    if job.status != "succeeded":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "document_not_ready",
                "status": job.status,
                "message": (
                    "The PDF is not available yet. "
                    "Check the document generation status."
                ),
            },
        )

    if not job.artifact_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The generated document artifact is unavailable.",
        )

    artifact_service = DocumentArtifactService(db)

    result = await artifact_service.get_pdf(
        artifact_id=job.artifact_id,
        workspace_id=workspace.id,
    )

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The generated document artifact could not be retrieved.",
        )

    artifact, pdf_content = result

    # Defend against inconsistent or incorrectly associated artifact IDs.
    if (
        artifact.document_type != job.document_type
        or artifact.source_id != job.source_id
        or artifact.source_version != job.source_version
        or artifact.issuance_generation != job.issuance_generation
        or artifact.artifact_kind != job.artifact_kind
        or artifact.workspace_id != workspace.id
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The generated document artifact identity is invalid.",
        )

    filename = quote(
        f"{document_type}-{source_id}.pdf",
        safe="",
    )

    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (f"inline; filename*=UTF-8''{filename}"),
            "Content-Length": str(len(pdf_content)),
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )
