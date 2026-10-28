from datetime import datetime
import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.core.references import generate_bagg_reference


def generate_uuid(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex}"


class Client(Base):
    __tablename__ = "clients"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_uuid("cl_"),
    )
    bagg_reference = Column(
        String(48),
        nullable=False,
        unique=True,
        default=lambda: generate_bagg_reference("client"),
    )
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Existing clients are migrated as PERSON to preserve compatibility.
    client_type = Column(
        String(16),
        nullable=False,
        default="PERSON",
        server_default="PERSON",
    )

    name = Column(String, nullable=False, index=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    country = Column(String, nullable=True)
    preferred_currency = Column(
        String,
        nullable=False,
        default="NGN",
        server_default="NGN",
    )
    default_payment_terms_days = Column(
        Integer,
        nullable=False,
        default=14,
        server_default="14",
    )
    tax_id = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    workspace = relationship("Workspace", back_populates="clients")
    contacts = relationship(
        "Contact",
        back_populates="client",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Contact.name",
    )

    __table_args__ = (
        Index("ix_clients_workspace_name", "workspace_id", "name"),
        Index("ix_clients_workspace_type", "workspace_id", "client_type"),
    )


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(
        String,
        primary_key=True,
        default=lambda: generate_uuid("ct_"),
    )
    workspace_id = Column(
        String,
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id = Column(
        String,
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(64), nullable=True)
    is_primary = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    client = relationship("Client", back_populates="contacts")

    __table_args__ = (
        Index("ix_contacts_workspace_client", "workspace_id", "client_id"),
    )
