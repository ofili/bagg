from __future__ import annotations

import asyncio
import logging
import os
import random
import socket
import uuid

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from pydantic import ValidationError
from sqlalchemy import and_, case, or_, select

import app.models  # noqa: F401

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.domains.documents.artifacts.identity import ArtifactIdentity
from app.domains.documents.artifacts.service import DocumentArtifactService
from app.domains.documents.models import DocumentGenerationJob
from app.domains.documents.schemas import (
    InvoiceDocument,
    QuoteDocument,
    ReceiptDocument,
)
from app.domains.documents.renderers.reportlab_pdf import (
    ReportLabDocumentRenderer,
)

logger = logging.getLogger("bagg.document-worker")

WORKER_ID = f"{socket.gethostname()}-{os.getpid()}-{uuid.uuid4().hex[:8]}"
RETRY_DELAYS = [30, 120, 600, 1800]


@dataclass(frozen=True, slots=True)
class ClaimedDocumentJob:
    job_id: str
    claim_token: str


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def claim_batch() -> list[ClaimedDocumentJob]:
    now = utcnow()
    lease_expiry = now - timedelta(seconds=settings.DOCUMENT_WORKER_LEASE_SECONDS)

    claimed: list[ClaimedDocumentJob] = []

    async with AsyncSessionLocal() as db:
        async with db.begin():
            statement = (
                select(DocumentGenerationJob)
                .where(
                    or_(
                        and_(
                            DocumentGenerationJob.status == "pending",
                            DocumentGenerationJob.available_at <= now,
                        ),
                        and_(
                            DocumentGenerationJob.status == "processing",
                            or_(
                                DocumentGenerationJob.locked_at.is_(None),
                                DocumentGenerationJob.locked_at < lease_expiry,
                            ),
                        ),
                    )
                )
                .order_by(
                    case(
                        (DocumentGenerationJob.status == "processing", 0),
                        else_=1,
                    ),
                    DocumentGenerationJob.available_at.asc(),
                    DocumentGenerationJob.created_at.asc(),
                )
                .limit(settings.DOCUMENT_WORKER_BATCH_SIZE)
                .with_for_update(skip_locked=True)
            )

            result = await db.execute(statement)
            jobs = result.scalars().all()

            for job in jobs:
                token = uuid.uuid4().hex

                job.status = "processing"
                job.locked_at = now
                job.locked_by = WORKER_ID
                job.claim_token = token
                job.attempts += 1
                job.updated_at = now

                claimed.append(
                    ClaimedDocumentJob(
                        job_id=job.id,
                        claim_token=token,
                    )
                )

    return claimed


def parse_document_snapshot(snapshot: dict):
    """Validate and reconstruct a renderer-ready immutable document snapshot."""

    if not isinstance(snapshot, dict):
        raise ValueError("invalid_snapshot")

    if snapshot.get("snapshot_schema_version") != 1:
        raise ValueError("unsupported_snapshot_version")

    document_type = snapshot.get("document_type")
    payload = snapshot.get("document")

    if not isinstance(payload, dict) or payload.get("document_type") != document_type:
        raise ValueError("snapshot_document_type_mismatch")

    schemas = {
        "invoice": InvoiceDocument,
        "quote": QuoteDocument,
        "receipt": ReceiptDocument,
    }

    schema = schemas.get(document_type)

    if schema is None:
        raise ValueError("invalid_snapshot_document")

    document = schema.model_validate(payload)

    if document.source_id != snapshot.get("source_id"):
        raise ValueError("snapshot_source_mismatch")

    if document.workspace_id != snapshot.get("workspace_id"):
        raise ValueError("snapshot_workspace_mismatch")

    expected_source_version = (
        document.version
        if isinstance(document, (InvoiceDocument, QuoteDocument))
        else 1
    )

    if snapshot.get("source_version") != expected_source_version:
        raise ValueError("snapshot_version_mismatch")

    return document


def validate_snapshot_job_identity(
    snapshot: dict,
    identity: ArtifactIdentity,
) -> None:
    """Ensure the persisted snapshot belongs to the job being processed."""

    if snapshot.get("document_type") != identity.document_type:
        raise ValueError("job_document_type_mismatch")

    if snapshot.get("source_id") != identity.source_id:
        raise ValueError("job_source_mismatch")

    if snapshot.get("workspace_id") != identity.workspace_id:
        raise ValueError("job_workspace_mismatch")

    if snapshot.get("source_version") != identity.source_version:
        raise ValueError("job_source_version_mismatch")


async def record_failure(
    job_id: str,
    claim_token: str,
    *,
    error_code: str,
    permanent: bool = False,
) -> None:
    now = utcnow()

    async with AsyncSessionLocal() as db:
        async with db.begin():
            job = await db.get(
                DocumentGenerationJob,
                job_id,
                with_for_update=True,
            )

            if (
                job is None
                or job.status != "processing"
                or job.claim_token != claim_token
            ):
                return

            job.last_error_code = error_code[:100]
            job.locked_at = None
            job.locked_by = None
            job.claim_token = None
            job.updated_at = now

            if permanent or job.attempts >= settings.DOCUMENT_WORKER_MAX_ATTEMPTS:
                job.status = "failed"
                job.completed_at = now
                return

            delay_index = min(
                max(job.attempts - 1, 0),
                len(RETRY_DELAYS) - 1,
            )
            base_delay = RETRY_DELAYS[delay_index]
            jitter = random.uniform(0, base_delay * 0.2)

            job.status = "pending"
            job.available_at = now + timedelta(seconds=base_delay + jitter)


async def record_success(
    job_id: str,
    claim_token: str,
    artifact_id: str,
) -> None:
    now = utcnow()

    async with AsyncSessionLocal() as db:
        async with db.begin():
            job = await db.get(
                DocumentGenerationJob,
                job_id,
                with_for_update=True,
            )

            if (
                job is None
                or job.status != "processing"
                or job.claim_token != claim_token
            ):
                return

            job.status = "succeeded"
            job.artifact_id = artifact_id
            job.last_error_code = None
            job.locked_at = None
            job.locked_by = None
            job.claim_token = None
            job.completed_at = now
            job.updated_at = now


async def process_job(claim: ClaimedDocumentJob) -> None:
    job_id = claim.job_id
    claim_token = claim.claim_token

    async with AsyncSessionLocal() as db:
        job = await db.get(DocumentGenerationJob, job_id)

        if job is None or job.status != "processing" or job.claim_token != claim_token:
            return

        snapshot = job.snapshot

        identity = ArtifactIdentity(
            workspace_id=job.workspace_id,
            document_type=job.document_type,
            source_id=job.source_id,
            source_version=job.source_version,
            issuance_generation=job.issuance_generation,
            artifact_kind=job.artifact_kind,
        )

    try:
        document = parse_document_snapshot(snapshot)
        validate_snapshot_job_identity(snapshot, identity)

    except (ValueError, ValidationError):
        await record_failure(
            job_id,
            claim_token,
            error_code="invalid_document_snapshot",
            permanent=True,
        )
        return

    try:
        renderer = ReportLabDocumentRenderer()

        pdf_bytes = await asyncio.to_thread(
            renderer.render,
            document,
        )

        async with AsyncSessionLocal() as artifact_db:
            artifact_service = DocumentArtifactService(artifact_db)

            artifact = await artifact_service.create_issued_artifact(
                identity=identity,
                snapshot=snapshot,
                pdf_bytes=pdf_bytes,
                renderer_name=renderer.renderer_name,
                renderer_version=renderer.renderer_version,
                template_version="1",
            )

        await record_success(
            job_id,
            claim_token,
            artifact.id,
        )

        logger.info(
            "Document artifact generated",
            extra={
                "job_id": job_id,
                "artifact_id": artifact.id,
                "document_type": identity.document_type,
            },
        )

    except Exception as exc:
        error_code = type(exc).__name__[:100] or "document_generation_error"

        logger.error(
            "Document generation attempt failed",
            extra={
                "job_id": job_id,
                "document_type": identity.document_type,
                "error_code": error_code,
            },
        )

        await record_failure(
            job_id,
            claim_token,
            error_code=error_code,
        )


async def main() -> None:
    logger.info(
        "Bagg document worker started",
        extra={"worker_id": WORKER_ID},
    )

    while True:
        try:
            claims = await claim_batch()

            if not claims:
                await asyncio.sleep(settings.DOCUMENT_WORKER_POLL_SECONDS)
                continue

            for claim in claims:
                await process_job(claim)

        except asyncio.CancelledError:
            raise

        except Exception:
            logger.error("Document worker loop failed")
            await asyncio.sleep(5)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
