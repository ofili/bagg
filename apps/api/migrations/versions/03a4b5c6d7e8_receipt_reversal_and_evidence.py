
"""Receipt reversal ledger and evidence classification.

Revision ID: 03a4b5c6d7e8
Revises: bc02f1a6d4e8
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "03a4b5c6d7e8"
down_revision: Union[str, Sequence[str], None] = "bc02f1a6d4e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "receipts",
        sa.Column(
            "evidence_classification",
            sa.String(32),
            nullable=False,
            server_default="legacy_unclassified",
        ),
    )

    op.create_table(
        "receipt_reversals",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "receipt_id",
            sa.String(),
            sa.ForeignKey("receipts.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "workspace_id",
            sa.String(),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "invoice_id",
            sa.String(),
            sa.ForeignKey("invoices.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("amount_minor", sa.BigInteger(), nullable=False),
        sa.Column("reversal_type", sa.String(24), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column(
            "reversed_by_user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("evidence_reference", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("amount_minor > 0", name="ck_receipt_reversals_amount_positive"),
        sa.CheckConstraint(
            "reversal_type IN ('correction', 'refund', 'chargeback')",
            name="ck_receipt_reversals_type",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'posted', 'failed')",
            name="ck_receipt_reversals_status",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "idempotency_key",
            name="uq_receipt_reversals_workspace_idempotency",
        ),
    )

    op.create_index(
        "ix_receipt_reversals_receipt",
        "receipt_reversals",
        ["receipt_id"],
    )
    op.create_index(
        "ix_receipt_reversals_invoice",
        "receipt_reversals",
        ["invoice_id"],
    )
    op.create_index(
        "ix_receipt_reversals_workspace_status",
        "receipt_reversals",
        ["workspace_id", "status"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_receipt_reversals_workspace_status",
        table_name="receipt_reversals",
    )
    op.drop_index(
        "ix_receipt_reversals_invoice",
        table_name="receipt_reversals",
    )
    op.drop_index(
        "ix_receipt_reversals_receipt",
        table_name="receipt_reversals",
    )
    op.drop_table("receipt_reversals")
    op.drop_column("receipts", "evidence_classification")
