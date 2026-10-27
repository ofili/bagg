"""add quote email delivery, review requests, and comments

Revision ID: f1a2b3c4d5e6
Revises: e7f8a9b0c1d2
Create Date: 2026-10-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("quotes", sa.Column("email_delivery_status", sa.String(), nullable=True))
    op.add_column(
        "quotes",
        sa.Column("review_requested_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("quotes", sa.Column("review_reason", sa.Text(), nullable=True))

    op.create_table(
        "quote_comments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "quote_id",
            sa.String(),
            sa.ForeignKey("quotes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "line_item_id",
            sa.String(),
            sa.ForeignKey("quote_line_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("author_name", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "is_from_client",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_quote_comments_quote_id", "quote_comments", ["quote_id"])


def downgrade() -> None:
    op.drop_index("ix_quote_comments_quote_id", table_name="quote_comments")
    op.drop_table("quote_comments")
    op.drop_column("quotes", "review_reason")
    op.drop_column("quotes", "review_requested_at")
    op.drop_column("quotes", "email_delivery_status")
