"""Add explicit workspace onboarding completion state."""

from alembic import op
import sqlalchemy as sa

# Replace with a unique revision ID for this migration.
revision = "add_workspace_onboarding_completed"

# Replace with the actual current Alembic head revision.
down_revision = "f1a2b3c4d5e6_add_quote_delivery_review_and_comments"

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
