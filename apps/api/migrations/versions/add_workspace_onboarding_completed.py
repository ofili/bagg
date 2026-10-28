"""Add explicit workspace onboarding completion state."""

from alembic import op
import sqlalchemy as sa

revision = "ws_onboarding_001"
down_revision = "a1b2c3d4e5f6"

branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "workspaces",
        sa.Column(
            "onboarding_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    # Preserve existing workspaces that appear to have completed setup.
    op.execute("""
        UPDATE workspaces
        SET onboarding_completed = TRUE
        WHERE business_name IS NOT NULL
          AND TRIM(business_name) <> ''
          AND TRIM(business_name) <> 'My Business'
        """)


def downgrade() -> None:
    op.drop_column("workspaces", "onboarding_completed")
