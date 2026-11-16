from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def generate_artifact_id() -> str:
    return f"doc_{uuid4().hex}"


class DocumentArtifact(Base):
    """Metadata for an immutable generated document artifact.

    The source financial domain remains authoritative. This table records
    the generated representation and its immutable rendering snapshot.

    source_id is intentionally polymorphic: document_type identifies the
    owning domain, and source_id identifies its record.
    """

    __tablename__ = "document_artifacts"

    __table_args__ = (
        CheckConstraint(
            "document_type IN ('invoice', 'quote', 'receipt')",
            name="ck_document_artifacts_document_type",
        ),
        CheckConstraint(
            "artifact_kind IN ('preview', 'issued')",
            name="ck_document_artifacts_artifact_kind",
        ),
        CheckConstraint(
            "source_version >= 1",
            name="ck_document_artifacts_source_version_positive",
        ),
        CheckConstraint(
            "issuance_generation >= 1",
            name="ck_document_artifacts_generation_positive",
        ),
        CheckConstraint(
            "file_size_bytes >= 0",
            name="ck_document_artifacts_file_size_nonnegative",
        ),
        UniqueConstraint(
            "workspace_id",
            "document_type",
            "source_id",
            "source_version",
            "issuance_generation",
            "artifact_kind",
            name="uq_document_artifact_identity",
        ),
        Index(
            "ix_document_artifacts_workspace_created",
            "workspace_id",
            "created_at",
        ),
        Index(
            "ix_document_artifacts_source",
            "document_type",
            "source_id",
        ),
    )

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=generate_artifact_id,
    )

    workspace_id: Mapped[str] = mapped_column(
        String,
        nullable=False,
        index=True,
    )

    document_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    source_id: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    source_version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    issuance_generation: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    artifact_kind: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    storage_key: Mapped[str] = mapped_column(
        String(1024),
        nullable=False,
        unique=True,
    )

    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="application/pdf",
    )

    file_size_bytes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    snapshot: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )

    renderer: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="reportlab",
    )

    renderer_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    template_version: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="1",
    )

    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


def generate_document_job_id() -> str:
    return f"docjob_{uuid4().hex}"


class DocumentGenerationJob(Base):
    """Durable request to generate an immutable issued PDF artifact."""

    __tablename__ = "document_generation_jobs"

    __table_args__ = (
        CheckConstraint(
            "document_type IN ('invoice', 'quote', 'receipt')",
            name="ck_document_generation_jobs_document_type",
        ),
        CheckConstraint(
            "artifact_kind = 'issued'",
            name="ck_document_generation_jobs_artifact_kind",
        ),
        CheckConstraint(
            "status IN ('pending', 'processing', 'succeeded', 'failed')",
            name="ck_document_generation_jobs_status",
        ),
        CheckConstraint(
            "source_version >= 1",
            name="ck_document_generation_jobs_source_version",
        ),
        CheckConstraint(
            "issuance_generation >= 1",
            name="ck_document_generation_jobs_generation",
        ),
        CheckConstraint(
            "attempts >= 0",
            name="ck_document_generation_jobs_attempts",
        ),
        UniqueConstraint(
            "workspace_id",
            "document_type",
            "source_id",
            "source_version",
            "issuance_generation",
            "artifact_kind",
            name="uq_document_generation_job_identity",
        ),
        Index(
            "ix_document_generation_jobs_claim",
            "status",
            "available_at",
            "created_at",
        ),
        Index(
            "ix_document_generation_jobs_workspace_created",
            "workspace_id",
            "created_at",
        ),
    )

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=generate_document_job_id,
    )

    workspace_id: Mapped[str] = mapped_column(String, nullable=False)
    document_type: Mapped[str] = mapped_column(String(20), nullable=False)
    source_id: Mapped[str] = mapped_column(String, nullable=False)
    source_version: Mapped[int] = mapped_column(Integer, nullable=False)
    issuance_generation: Mapped[int] = mapped_column(Integer, nullable=False)
    artifact_kind: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="issued",
    )

    # The worker renders this immutable snapshot. It must not reload
    # the source invoice, quote or receipt.
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
    )

    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    locked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    locked_by: Mapped[str | None] = mapped_column(String, nullable=True)

    artifact_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("document_artifacts.id", ondelete="SET NULL"),
        nullable=True,
    )

    last_error_code: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
