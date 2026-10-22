"""add quote versioning and quote-invoice link

Revision ID: d4e5f6a7b8c9
Revises: 7c1a4e9b2d10
Create Date: 2026-10-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "7c1a4e9b2d10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- quotes: version tracking ---
    op.add_column(
        "quotes",
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "quotes",
        sa.Column("last_revised_at", sa.DateTime(timezone=True), nullable=True),
    )

    # --- quote_revisions table ---
    op.create_table(
        "quote_revisions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("quote_id", sa.String(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("subtotal_minor", sa.BigInteger(), nullable=False),
        sa.Column("discount_minor", sa.BigInteger(), nullable=False),
        sa.Column("tax_rate_percent", sa.Float(), nullable=False),
        sa.Column("tax_minor", sa.BigInteger(), nullable=False),
        sa.Column("total_minor", sa.BigInteger(), nullable=False),
        sa.Column("wht_rate_percent", sa.Float(), nullable=False),
        sa.Column("wht_minor", sa.BigInteger(), nullable=False),
        sa.Column("net_payable_minor", sa.BigInteger(), nullable=False),
        sa.Column("deposit_amount_minor", sa.BigInteger(), nullable=True),
        sa.Column("items_snapshot", sa.JSON(), nullable=False),
        sa.Column("revised_reason", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["quote_id"],
            ["quotes.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("quote_id", "version", name="uq_quote_version"),
    )
    op.create_index(
        "ix_quote_revisions_quote_id",
        "quote_revisions",
        ["quote_id"],
        unique=False,
    )

    # --- invoices: quote_id link (source of truth) ---
    op.add_column(
        "invoices",
        sa.Column("quote_id", sa.String(), nullable=True),
    )
    op.create_foreign_key(
        "fk_invoices_quote_id_quotes",
        "invoices",
        "quotes",
        ["quote_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_invoices_quote_id",
        "invoices",
        ["quote_id"],
        unique=True,
    )

    # --- backfill quote_id from existing quotes.invoice_id ---
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            UPDATE invoices
            SET quote_id = quotes.id
            FROM quotes
            WHERE quotes.invoice_id IS NOT NULL
              AND invoices.id = quotes.invoice_id
            """
        )
    )


def downgrade() -> None:
    # reverse backfill is not possible (quote_id may be null again)
    op.drop_index("ix_invoices_quote_id", table_name="invoices")
    op.drop_constraint("fk_invoices_quote_id_quotes", table_name="invoices", type_="foreignkey")
    op.drop_column("invoices", "quote_id")

    op.drop_index("ix_quote_revisions_quote_id", table_name="quote_revisions")
    op.drop_constraint("uq_quote_version", table_name="quote_revisions", type_="unique")
    op.drop_table("quote_revisions")

    op.drop_column("quotes", "last_revised_at")
    op.drop_column("quotes", "version")
