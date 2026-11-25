"""Create expenses table with independent states.

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expenses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("bagg_reference", sa.String(length=48), nullable=False, unique=True),
        sa.Column("workspace_id", sa.String(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("engagement_id", sa.String(), sa.ForeignKey("engagements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.String(), sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("amount_minor", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("billable", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("milestone_id", sa.String(length=100), nullable=True),
        sa.Column("retainer_period", sa.String(length=32), nullable=True),
        sa.Column("receipt_filename", sa.String(length=255), nullable=True),
        sa.Column("receipt_storage_path", sa.String(length=500), nullable=True),
        sa.Column("receipt_content_type", sa.String(length=100), nullable=True),
        sa.Column("approval_status", sa.String(length=32), nullable=False, server_default="not_required"),
        sa.Column("approval_requested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by_name", sa.String(length=255), nullable=True),
        sa.Column("declined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decline_reason", sa.Text(), nullable=True),
        sa.Column("invoicing_status", sa.String(length=32), nullable=False, server_default="uninvoiced"),
        sa.Column("invoice_id", sa.String(), sa.ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True),
        sa.Column("invoice_item_id", sa.String(), sa.ForeignKey("invoice_line_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("invoiced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reimbursement_status", sa.String(length=32), nullable=False, server_default="unreimbursed"),
        sa.Column("reimbursed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approval_token", sa.String(), unique=True, nullable=True),
        sa.Column("approval_token_hash", sa.String(), unique=True, nullable=True),
        sa.Column("approval_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
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
    )

    op.create_index(
        "ix_expenses_workspace_engagement",
        "expenses",
        ["workspace_id", "engagement_id"],
    )
    op.create_index(
        "ix_expenses_workspace_billable",
        "expenses",
        ["workspace_id", "billable"],
    )
    op.create_index(
        "ix_expenses_workspace_approval",
        "expenses",
        ["workspace_id", "approval_status"],
    )
    op.create_index(
        "ix_expenses_workspace_invoicing",
        "expenses",
        ["workspace_id", "invoicing_status"],
    )
    op.create_index(
        "ix_expenses_approval_token",
        "expenses",
        ["approval_token"],
    )


def downgrade() -> None:
    op.drop_index("ix_expenses_approval_token", table_name="expenses")
    op.drop_index("ix_expenses_workspace_invoicing", table_name="expenses")
    op.drop_index("ix_expenses_workspace_approval", table_name="expenses")
    op.drop_index("ix_expenses_workspace_billable", table_name="expenses")
    op.drop_index("ix_expenses_workspace_engagement", table_name="expenses")
    op.drop_table("expenses")
