"""Create product activation event store.

Revision ID: activation_events_001
Revises: onboarding_progress_001
"""

from alembic import op
import sqlalchemy as sa

revision = "activation_events_001"
down_revision = "onboarding_progress_001"

branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(length=128), nullable=False),
        sa.Column("workspace_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("event_name", sa.String(length=120), nullable=False),
        sa.Column(
            "event_version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.Column(
            "source",
            sa.String(length=32),
            nullable=False,
            server_default="api",
        ),
        sa.Column(
            "properties",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{}'::json"),
        ),
        sa.Column(
            "milestone_key",
            sa.String(length=100),
            nullable=True,
        ),
        sa.Column(
            "occurred_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "event_id",
            name="uq_product_events_event_id",
        ),
        sa.UniqueConstraint(
            "workspace_id",
            "milestone_key",
            name="uq_product_events_workspace_milestone",
        ),
    )

    op.create_index(
        "ix_product_events_workspace_id",
        "product_events",
        ["workspace_id"],
    )

    op.create_index(
        "ix_product_events_user_id",
        "product_events",
        ["user_id"],
    )

    op.create_index(
        "ix_product_events_event_name",
        "product_events",
        ["event_name"],
    )

    op.create_index(
        "ix_product_events_workspace_name_occurred",
        "product_events",
        ["workspace_id", "event_name", "occurred_at"],
    )

    op.create_index(
        "ix_product_events_workspace_occurred",
        "product_events",
        ["workspace_id", "occurred_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_product_events_workspace_occurred",
        table_name="product_events",
    )

    op.drop_index(
        "ix_product_events_workspace_name_occurred",
        table_name="product_events",
    )

    op.drop_index(
        "ix_product_events_event_name",
        table_name="product_events",
    )

    op.drop_index(
        "ix_product_events_user_id",
        table_name="product_events",
    )

    op.drop_index(
        "ix_product_events_workspace_id",
        table_name="product_events",
    )

    op.drop_table("product_events")
