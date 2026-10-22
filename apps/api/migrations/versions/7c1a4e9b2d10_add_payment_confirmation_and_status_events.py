"""add payment confirmation provenance and document status events

Revision ID: 7c1a4e9b2d10
Revises: 20f07609a795
Create Date: 2026-10-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7c1a4e9b2d10"
down_revision: Union[str, None] = "20f07609a795"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "invoices",
        sa.Column("payment_processing_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "invoices",
        sa.Column("payment_processing_reference", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_invoices_payment_processing_reference",
        "invoices",
        ["payment_processing_reference"],
        unique=False,
    )

    op.add_column(
        "receipts",
        sa.Column(
            "confirmation_source",
            sa.String(),
            nullable=False,
            server_default="legacy",
        ),
    )
    op.add_column(
        "receipts",
        sa.Column("confirmed_by_user_id", sa.String(), nullable=True),
    )
    op.add_column("receipts", sa.Column("provider", sa.String(), nullable=True))
    op.add_column(
        "receipts",
        sa.Column("provider_reference", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_receipts_confirmed_by_user_id_users",
        "receipts",
        "users",
        ["confirmed_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_receipts_provider_reference",
        "receipts",
        ["provider_reference"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_workspace_receipt_provider_reference",
        "receipts",
        ["workspace_id", "provider_reference"],
    )

    op.create_table(
        "document_status_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("document_type", sa.String(), nullable=False),
        sa.Column("document_id", sa.String(), nullable=False),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("actor_type", sa.String(), nullable=False),
        sa.Column("actor_id", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_document_status_events_workspace_id",
        "document_status_events",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        "ix_document_status_events_document_type",
        "document_status_events",
        ["document_type"],
        unique=False,
    )
    op.create_index(
        "ix_document_status_events_document_id",
        "document_status_events",
        ["document_id"],
        unique=False,
    )
    op.create_index(
        "ix_document_status_events_document",
        "document_status_events",
        ["document_type", "document_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_document_status_events_document",
        table_name="document_status_events",
    )
    op.drop_index(
        "ix_document_status_events_document_id",
        table_name="document_status_events",
    )
    op.drop_index(
        "ix_document_status_events_document_type",
        table_name="document_status_events",
    )
    op.drop_index(
        "ix_document_status_events_workspace_id",
        table_name="document_status_events",
    )
    op.drop_table("document_status_events")

    op.drop_constraint(
        "uq_workspace_receipt_provider_reference",
        "receipts",
        type_="unique",
    )
    op.drop_index("ix_receipts_provider_reference", table_name="receipts")
    op.drop_constraint(
        "fk_receipts_confirmed_by_user_id_users",
        "receipts",
        type_="foreignkey",
    )
    op.drop_column("receipts", "provider_reference")
    op.drop_column("receipts", "provider")
    op.drop_column("receipts", "confirmed_by_user_id")
    op.drop_column("receipts", "confirmation_source")

    op.drop_index("ix_invoices_payment_processing_reference", table_name="invoices")
    op.drop_column("invoices", "payment_processing_reference")
    op.drop_column("invoices", "payment_processing_at")
