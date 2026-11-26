"""Add workspaces.timezone.

The Workspace model gained a ``timezone`` column (used for central date
handling) without a matching migration, so any query that loaded a workspace
failed on a migrated database.

The upgrade is idempotent: databases that already received the column by hand
or from a local migration are left untouched.

Revision ID: e5f6a7b8c9d0
Revises: c3d4e5f6a7b9
Create Date: 2026-11-26 09:00:00

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    columns = {col["name"] for col in sa.inspect(op.get_bind()).get_columns("workspaces")}
    if "timezone" in columns:
        return
    op.add_column(
        "workspaces",
        sa.Column(
            "timezone",
            sa.String(length=64),
            nullable=False,
            server_default="Africa/Lagos",
        ),
    )


def downgrade() -> None:
    op.drop_column("workspaces", "timezone")
