"""Add receipt evidence classification and append-only reversals.

Revision ID: c9d8e7f6a5b4
Revises: bc02f1a6d4e8
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c9d8e7f6a5b4"
down_revision: Union[str, Sequence[str], None] = "bc02f1a6d4e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "receipts",
        sa.Column(
            "evidence_classification",
            sa.String(length=32),
            nullable=False,
            server_default="legacy_unclassified",
        ),
    )

    op.create_table(
        "receipt_reversals",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("invoice_id", sa.String(), nullable=False),
        sa.Column("receipt_id", sa.String(), nullable=False),
        sa.Column("amount_minor", sa.BigInteger(), nullable=False),
        sa.Column("reversal_type", sa.String(length=24), nullable=False),
        sa.Column(
            "status", sa.String(length=16), nullable=False, server_default="posted"
        ),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("evidence_reference", sa.String(length=512), nullable=True),
        sa.Column("reversed_by_user_id", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["workspace_id"], ["workspaces.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["receipt_id"], ["receipts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["reversed_by_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "workspace_id",
            "idempotency_key",
            name="uq_receipt_reversals_workspace_idempotency",
        ),
        sa.CheckConstraint(
            "amount_minor > 0", name="ck_receipt_reversals_amount_positive"
        ),
        sa.CheckConstraint(
            "reversal_type IN ('correction', 'refund', 'chargeback')",
            name="ck_receipt_reversals_type",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'posted', 'failed')",
            name="ck_receipt_reversals_status",
        ),
    )

    op.create_index(
        "ix_receipt_reversals_receipt_status",
        "receipt_reversals",
        ["receipt_id", "status"],
    )
    op.create_index(
        "ix_receipt_reversals_invoice_created",
        "receipt_reversals",
        ["invoice_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_receipt_reversals_invoice_created",
        table_name="receipt_reversals",
    )
    op.drop_index(
        "ix_receipt_reversals_receipt_status",
        table_name="receipt_reversals",
    )
    op.drop_table("receipt_reversals")
    op.drop_column("receipts", "evidence_classification")
