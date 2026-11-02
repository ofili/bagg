"""Add transactional email outbox and delivery attempts."""

from alembic import op
import sqlalchemy as sa

revision = "email_outbox_001"

# Set this to the verified migration head after inspecting
# `uv run alembic heads`. If multiple heads remain, use a
# deliberate merge revision before applying this migration.
down_revision = None

branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_outbox",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("message_type", sa.String(50), nullable=False),
        sa.Column("aggregate_id", sa.String(100), nullable=False),
        sa.Column("encrypted_payload", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "available_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("locked_at", sa.DateTime(timezone=True)),
        sa.Column("locked_by", sa.String(100)),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("failed_at", sa.DateTime(timezone=True)),
        sa.Column("provider", sa.String(50)),
        sa.Column("last_provider", sa.String(50)),
        sa.Column("last_error_code", sa.String(100)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_email_outbox_status_available",
        "email_outbox",
        ["status", "available_at"],
    )

    op.create_index(
        "ix_email_outbox_aggregate_type",
        "email_outbox",
        ["aggregate_id", "message_type"],
    )

    op.create_index(
        "ix_email_outbox_created_at",
        "email_outbox",
        ["created_at"],
    )

    op.create_index(
        "ix_email_outbox_processing_lease",
        "email_outbox",
        ["status", "locked_at"],
    )

    op.create_table(
        "email_delivery_attempts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "outbox_id",
            sa.String(),
            sa.ForeignKey(
                "email_outbox.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("outcome", sa.String(30), nullable=False),
        sa.Column("error_code", sa.String(100)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "outbox_id",
            "attempt_number",
            name="uq_email_attempt_outbox_number",
        ),
    )

    op.create_index(
        "ix_email_delivery_attempts_outbox_id",
        "email_delivery_attempts",
        ["outbox_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_email_delivery_attempts_outbox_id",
        table_name="email_delivery_attempts",
    )

    op.drop_table("email_delivery_attempts")

    op.drop_index(
        "ix_email_outbox_processing_lease",
        table_name="email_outbox",
    )

    op.drop_index(
        "ix_email_outbox_created_at",
        table_name="email_outbox",
    )

    op.drop_index(
        "ix_email_outbox_aggregate_type",
        table_name="email_outbox",
    )

    op.drop_index(
        "ix_email_outbox_status_available",
        table_name="email_outbox",
    )

    op.drop_table("email_outbox")
