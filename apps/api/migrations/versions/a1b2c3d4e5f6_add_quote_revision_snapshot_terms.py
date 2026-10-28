"""add commercial snapshot terms to quote revisions

Revision ID: a1b2c3d4e5f6
Revises: e7f8a9b0c1d2
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "quote_revisions",
        sa.Column("client_id", sa.String(), nullable=True),
    )
    op.add_column(
        "quote_revisions",
        sa.Column("client_name", sa.String(), nullable=True),
    )
    op.add_column(
        "quote_revisions",
        sa.Column("currency", sa.String(), nullable=True),
    )
    op.add_column(
        "quote_revisions",
        sa.Column("issue_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "quote_revisions",
        sa.Column("expires_at", sa.Date(), nullable=True),
    )
    op.add_column(
        "quote_revisions",
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.add_column(
        "quote_revisions",
        sa.Column("deposit_percentage", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("quote_revisions", "deposit_percentage")
    op.drop_column("quote_revisions", "notes")
    op.drop_column("quote_revisions", "expires_at")
    op.drop_column("quote_revisions", "issue_date")
    op.drop_column("quote_revisions", "currency")
    op.drop_column("quote_revisions", "client_name")
    op.drop_column("quote_revisions", "client_id")
