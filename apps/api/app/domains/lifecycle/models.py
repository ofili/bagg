from sqlalchemy import Column, String, DateTime, ForeignKey, Index, JSON
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class DocumentStatusEvent(Base):
    __tablename__ = "document_status_events"

    id = Column(String, primary_key=True, default=lambda: generate_uuid("evt_"))
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_type = Column(String, nullable=False, index=True)  # invoice, quote
    document_id = Column(String, nullable=False, index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    actor_type = Column(String, nullable=False, default="system")  # issuer, client, system, webhook
    actor_id = Column(String, nullable=True)
    source = Column(String, nullable=False, default="system")
    event_metadata = Column("metadata", JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index(
            "ix_document_status_events_document",
            "document_type",
            "document_id",
            "created_at",
        ),
    )
