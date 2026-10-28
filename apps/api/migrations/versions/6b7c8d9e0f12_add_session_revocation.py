"""Add server-side session revocation.

Revision ID: 6b7c8d9e0f12
Revises: 5191aa1b001b
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "6b7c8d9e0f12"
down_revision: Union[str, Sequence[str], None] = "5191aa1b001b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_sessions",
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_sessions", "revoked_at")
