"""Drop plaintext approval_token columns from expenses and scope_change_requests.

Only the SHA-256 hash is kept. The raw token is returned once in the share URL
and must never be persisted (prevents leaks through DB backups / query logs).

Revision ID: c3d4e5f6a7b9
Revises: b2c3d4e5f6a8
Create Date: 2026-11-26 01:52:00

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b9"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # expenses.approval_token
    op.drop_index("ix_expenses_approval_token", table_name="expenses", if_exists=True)
    op.drop_column("expenses", "approval_token")

    # scope_change_requests.approval_token
    op.drop_index(
        "ix_scope_changes_approval_token",
        table_name="scope_change_requests",
        if_exists=True,
    )
    op.drop_column("scope_change_requests", "approval_token")


def downgrade() -> None:
    import sqlalchemy as sa

    # Restore scope_change_requests.approval_token (nullable — no data recovery)
    op.add_column(
        "scope_change_requests",
        sa.Column("approval_token", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_scope_changes_approval_token",
        "scope_change_requests",
        ["approval_token"],
        unique=True,
    )

    # Restore expenses.approval_token (nullable — no data recovery)
    op.add_column(
        "expenses",
        sa.Column("approval_token", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_expenses_approval_token",
        "expenses",
        ["approval_token"],
        unique=True,
    )
