"""Add quote acceptance evidence columns.

Records what a client accepted and how: consent statement, IP address, user
agent, and a canonical snapshot of the accepted terms with its SHA-256 hash.
Existing accepted quotes keep NULLs (their evidence was never captured).

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-11-27 09:00:00

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = (
    ("accepted_ip", sa.String(length=64)),
    ("accepted_user_agent", sa.String(length=512)),
    ("accepted_consent_text", sa.Text()),
    ("accepted_consent_version", sa.String(length=64)),
    ("accepted_terms_snapshot", sa.JSON()),
    ("accepted_terms_hash", sa.String(length=64)),
)


def upgrade() -> None:
    existing = {col["name"] for col in sa.inspect(op.get_bind()).get_columns("quotes")}
    for name, column_type in _COLUMNS:
        if name not in existing:
            op.add_column("quotes", sa.Column(name, column_type, nullable=True))


def downgrade() -> None:
    for name, _ in reversed(_COLUMNS):
        op.drop_column("quotes", name)
