"""Coordinate payment claim resolution with invoice reminders.

Revision ID: bc02f1a6d4e8
Revises: 587de7d93ae5
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "bc02f1a6d4e8"
down_revision: Union[str, Sequence[str], None] = "587de7d93ae5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "payment_claims",
        sa.Column("previous_invoice_status", sa.String(length=32), nullable=True),
    )

    op.add_column(
        "reminder_jobs",
        sa.Column(
            "cycle",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("reminder_jobs", "cycle")
    op.drop_column("payment_claims", "previous_invoice_status")
