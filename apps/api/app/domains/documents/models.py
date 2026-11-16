from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
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
        default="weasyprint",
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
