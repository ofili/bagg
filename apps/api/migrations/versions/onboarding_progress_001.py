"""Create workspace-scoped onboarding progress.

Revision ID: onboarding_progress_001
Revises: 3b63b0a17143
"""

from alembic import op
import sqlalchemy as sa


revision = "onboarding_progress_001"
down_revision = "3b63b0a17143"

branch_labels = None
depends_on = None


def upgrade() -> None:

    op.create_table(
        "onboarding_progress",

        sa.Column(
            "id",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "workspace_id",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "schema_version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),

        sa.Column(
            "status",
            sa.String(length=24),
            nullable=False,
            server_default="not_started",
        ),

        sa.Column(
            "current_step",
            sa.String(length=64),
            nullable=True,
        ),

        sa.Column(
            "completed_steps",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'::json"),
        ),

        sa.Column(
            "skipped_steps",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[]'::json"),
        ),

        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "last_activity_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),

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

        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint("id"),

        sa.UniqueConstraint(
            "workspace_id",
            name="uq_onboarding_progress_workspace_id",
        ),

        sa.CheckConstraint(
            "status IN ('not_started', 'in_progress', 'completed')",
            name="ck_onboarding_progress_status",
        ),
    )

    op.create_index(
        "ix_onboarding_progress_status",
        "onboarding_progress",
        ["status"],
        unique=False,
    )

    # Backfill every existing workspace.
    # Existing completion state remains authoritative.
    op.execute(
        """
        INSERT INTO onboarding_progress (
            id,
            workspace_id,
            schema_version,
            status,
            current_step,
            completed_steps,
            skipped_steps,
            started_at,
            completed_at,
            last_activity_at,
            created_at,
            updated_at
        )
        SELECT
            'onb_' || w.id,
            w.id,
            1,

            CASE
                WHEN w.onboarding_completed = TRUE
                    THEN 'completed'
                ELSE 'not_started'
                END,

            CASE
                WHEN w.onboarding_completed = TRUE
                    THEN NULL
                ELSE 'business_profile'
                END,

            CASE
                WHEN w.onboarding_completed = TRUE
                    THEN
                    '[
                        "account_created",
                        "workspace_created",
                        "business_profile"
                    ]'::json
                ELSE
                    '[
                        "account_created",
                        "workspace_created"
                    ]'::json
                END,

            '[]'::json,

            '[]'::json,

            CASE
                WHEN w.onboarding_completed = TRUE
                    THEN COALESCE(w.created_at, w.updated_at, NOW())
                ELSE NULL
                END,

            CASE
                WHEN w.onboarding_completed = TRUE
                    THEN COALESCE(w.updated_at, w.created_at, NOW())
                ELSE NULL
                END,

            CASE
                WHEN w.onboarding_completed = TRUE
                    THEN COALESCE(w.updated_at, w.created_at, NOW())
                ELSE NULL
                END,

            COALESCE(w.updated_at, w.created_at, NOW()),

            COALESCE(w.created_at, NOW()),

            COALESCE(w.updated_at, NOW())

        FROM workspaces w
        """
    )


def downgrade() -> None:

    op.drop_index(
        "ix_onboarding_progress_status",
        table_name="onboarding_progress",
    )

    op.drop_table("onboarding_progress")