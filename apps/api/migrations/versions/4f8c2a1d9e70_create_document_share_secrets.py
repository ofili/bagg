"""Create encrypted document share-secret storage.

Revision ID: 4f8c2a1d9e70
Revises: 02392c5fb99b
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "4f8c2a1d9e70"
down_revision: Union[str, Sequence[str], None] = "02392c5fb99b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_share_secrets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("document_type", sa.String(length=16), nullable=False),
        sa.Column("invoice_id", sa.String(), nullable=True),
        sa.Column("quote_id", sa.String(), nullable=True),
        sa.Column("receipt_id", sa.String(), nullable=True),
        sa.Column("encrypted_token", sa.Text(), nullable=False),
        sa.Column(
            "key_version",
            sa.String(length=16),
            nullable=False,
            server_default="v1",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["invoice_id"],
            ["invoices.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["quotes.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["receipt_id"],
            ["receipts.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "invoice_id",
            name="uq_share_secret_invoice",
        ),
        sa.UniqueConstraint(
            "quote_id",
            name="uq_share_secret_quote",
        ),
        sa.UniqueConstraint(
            "receipt_id",
            name="uq_share_secret_receipt",
        ),
        sa.CheckConstraint(
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


def downgrade() -> None:
    op.drop_table("document_share_secrets")
