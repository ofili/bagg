from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.core.database import Base


class DocumentShareSecret(Base):
    __tablename__ = "document_share_secrets"

    id = Column(String, primary_key=True)

    document_type = Column(String(16), nullable=False)

    invoice_id = Column(
        String,
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=True,
    )
    quote_id = Column(
        String,
        ForeignKey("quotes.id", ondelete="CASCADE"),
        nullable=True,
    )
    receipt_id = Column(
        String,
        ForeignKey("receipts.id", ondelete="CASCADE"),
        nullable=True,
    )

    encrypted_token = Column(Text, nullable=False)
    key_version = Column(String(16), nullable=False, default="v1")

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

    __table_args__ = (
        UniqueConstraint("invoice_id", name="uq_share_secret_invoice"),
        UniqueConstraint("quote_id", name="uq_share_secret_quote"),
        UniqueConstraint("receipt_id", name="uq_share_secret_receipt"),
        CheckConstraint(
            """
            (
                document_type = 'invoice'
                AND invoice_id IS NOT NULL
                AND quote_id IS NULL
                AND receipt_id IS NULL
            )
            OR
            (
                document_type = 'quote'
                AND quote_id IS NOT NULL
                AND invoice_id IS NULL
                AND receipt_id IS NULL
            )
            OR
            (
                document_type = 'receipt'
                AND receipt_id IS NOT NULL
                AND invoice_id IS NULL
                AND quote_id IS NULL
            )
            """,
            name="ck_share_secret_document_reference",
        ),
    )
