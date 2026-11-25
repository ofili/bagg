"""Add scope_change_requests table for expense cap exceedance.

Revision ID: a1b2c3d4e5f7
Revises: f2a3b4c5d6e7
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, Sequence[str], None] = "f2a3b4c5d6e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scope_change_requests",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("workspace_id", sa.String(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("engagement_id", sa.String(), sa.ForeignKey("engagements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.String(), sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("expense_id", sa.String(), sa.ForeignKey("expenses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("change_type", sa.String(length=32), nullable=False, server_default="expense_cap_increase"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("delta_amount_minor", sa.BigInteger(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("approval_token", sa.String(), unique=True, nullable=True),
        sa.Column("approval_token_hash", sa.String(), unique=True, nullable=True),
        sa.Column("approval_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_by_name", sa.String(length=255), nullable=True),
        sa.Column("declined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decline_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index(
        "ix_scope_changes_workspace_engagement",
        "scope_change_requests",
        ["workspace_id", "engagement_id"],
    )
    op.create_index(
        "ix_scope_changes_approval_token",
        "scope_change_requests",
        ["approval_token"],
    )


def downgrade() -> None:
    op.drop_index("ix_scope_changes_approval_token", table_name="scope_change_requests")
    op.drop_index("ix_scope_changes_workspace_engagement", table_name="scope_change_requests")
    op.drop_table("scope_change_requests")
