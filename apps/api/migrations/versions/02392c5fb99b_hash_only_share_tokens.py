"""Persist only hashes for invoice, quote and receipt share tokens.

Revision ID: 02392c5fb99b
Revises: a1b2c3d4e5f8
"""

from __future__ import annotations

import hashlib
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "02392c5fb99b"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TOKEN_TABLES = ("invoices", "quotes", "receipts")


def _backfill_share_token_hashes() -> None:
    """Hash existing plaintext tokens before removing their columns."""
    connection = op.get_bind()

    for table in TOKEN_TABLES:
        rows = connection.execute(sa.text(f"""
                SELECT id, share_token
                FROM {table}
                WHERE share_token IS NOT NULL
                """)).mappings().all()

        for row in rows:
            token_hash = hashlib.sha256(row["share_token"].encode("utf-8")).hexdigest()

            # Recalculate from the original token to ensure consistency.
            connection.execute(
                sa.text(f"""
                    UPDATE {table}
                    SET share_token_hash = :token_hash
                    WHERE id = :record_id
                    """),
                {
                    "token_hash": token_hash,
                    "record_id": row["id"],
                },
            )


def upgrade() -> None:
    # Preserve existing public links wherever the original token exists.
    _backfill_share_token_hashes()

    # Remove only plaintext share-token storage.
    for table in TOKEN_TABLES:
        op.drop_index(
            f"ix_{table}_share_token",
            table_name=table,
            if_exists=True,
        )
        op.drop_column(table, "share_token")


def downgrade() -> None:
    # Original plaintext tokens cannot be reconstructed from SHA-256.
    # Restored columns will therefore be empty.
    for table in TOKEN_TABLES:
        op.add_column(
            table,
            sa.Column("share_token", sa.String(), nullable=True),
        )

        op.create_index(
            f"ix_{table}_share_token",
            table,
            ["share_token"],
            unique=True,
        )
