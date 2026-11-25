"""Add engagement_id to invoices and unique quote_id on engagements.

Revision ID: b2c3d4e5f6a8
Revises: a1b2c3d4e5f7
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "b2c3d4e5f6a8"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add engagement_id to invoices
    op.add_column(
        "invoices",
        sa.Column(
            "engagement_id",
            sa.String(),
            sa.ForeignKey("engagements.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_invoices_engagement_id", "invoices", ["engagement_id"])

    # 2. Add policy_snapshot_at_approval to expenses
    op.add_column(
        "expenses",
        sa.Column("policy_snapshot_at_approval", sa.JSON(), nullable=True),
    )

    # 3. Add unique constraint on engagements(quote_id) to prevent duplicate acceptance
    op.create_unique_constraint("uq_engagements_quote_id", "engagements", ["quote_id"])


def downgrade() -> None:
    op.drop_constraint("uq_engagements_quote_id", "engagements", type_="unique")
    op.drop_column("expenses", "policy_snapshot_at_approval")
    op.drop_index("ix_invoices_engagement_id", table_name="invoices")
    op.drop_column("invoices", "engagement_id")
