from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.core.database import Base


def generate_document_version_id() -> str:
    return f"invdoc_{uuid.uuid4().hex}"


class InvoiceDocumentVersion(Base):
    """
    Immutable issued invoice snapshot.

    Each issued revision is preserved independently of the mutable
    Invoice aggregate.

    Never update the commercial snapshot after insertion.
    Recall metadata is maintained separately.
    """

    __tablename__ = "invoice_document_versions"

    id = Column(
        String,
        primary_key=True,
        default=generate_document_version_id,
    )

    invoice_id = Column(
        String,
        ForeignKey("invoices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    document_number = Column(String, nullable=False)
    revision_number = Column(Integer, nullable=False)

    # Complete serialized representation at the time of issue.
    snapshot = Column(JSON, nullable=False)

    # Store only the hash, never the raw public token.
    share_token_hash = Column(
        String,
        nullable=True,
        unique=True,
        index=True,
    )

    issued_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    recalled_at = Column(DateTime(timezone=True), nullable=True)
    recalled_by_user_id = Column(String, nullable=True)
    recall_reason = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "invoice_id",
            "revision_number",
            name="uq_invoice_document_versions_revision",
        ),
    )