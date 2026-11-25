"""Add engagements aggregate and quote expense policy.

Revision ID: e1f2a3b4c5d6
Revises: 04a1b2c3d4e5
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "04a1b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add expense policy columns to quotes and quote revisions
    op.add_column(
        "quotes",
        sa.Column(
            "has_expense_policy",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "quotes",
        sa.Column("expense_policy", sa.JSON(), nullable=True),
    )
    op.add_column(
        "quote_revisions",
        sa.Column("has_expense_policy", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "quote_revisions",
        sa.Column("expense_policy", sa.JSON(), nullable=True),
    )

    # 2. Create engagements table
    op.create_table(
        "engagements",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("bagg_reference", sa.String(length=48), nullable=False, unique=True),
        sa.Column("workspace_id", sa.String(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", sa.String(), sa.ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quote_id", sa.String(), sa.ForeignKey("quotes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("engagement_type", sa.String(length=32), nullable=False, server_default="one_off"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("target_completion_date", sa.Date(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("commercial_baseline", sa.JSON(), nullable=True),
        sa.Column("baseline_expense_cap_minor", sa.BigInteger(), nullable=True),
        sa.Column("effective_expense_cap_minor", sa.BigInteger(), nullable=True),
        sa.Column("per_expense_threshold_minor", sa.BigInteger(), nullable=True),
        sa.Column("expense_policy_snapshot", sa.JSON(), nullable=True),
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
        "ix_engagements_workspace_status",
        "engagements",
        ["workspace_id", "status"],
    )
    op.create_index(
        "ix_engagements_workspace_client",
        "engagements",
        ["workspace_id", "client_id"],
    )
    op.create_index(
        "ix_engagements_quote_id",
        "engagements",
        ["quote_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_engagements_quote_id", table_name="engagements")
    op.drop_index("ix_engagements_workspace_client", table_name="engagements")
    op.drop_index("ix_engagements_workspace_status", table_name="engagements")
    op.drop_table("engagements")

    op.drop_column("quote_revisions", "expense_policy")
    op.drop_column("quote_revisions", "has_expense_policy")
    op.drop_column("quotes", "expense_policy")
    op.drop_column("quotes", "has_expense_policy")
