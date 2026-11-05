"""Add step-up challenges, recovery codes, and append-only security audit events."""

from alembic import op
import sqlalchemy as sa

revision = "security_001"

# Follows the transactional email outbox head.
down_revision = "email_outbox_001"

branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "security_challenges",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "workspace_id",
            sa.String(),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("operation_id", sa.String(), nullable=False),
        sa.Column("purpose", sa.String(80), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("destination", sa.String(320), nullable=False),
        sa.Column(
            "attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "max_attempts",
            sa.Integer(),
            nullable=False,
            server_default="5",
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_security_challenges_user_id",
        "security_challenges",
        ["user_id"],
    )
    op.create_index(
        "ix_security_challenges_workspace_id",
        "security_challenges",
        ["workspace_id"],
    )
    op.create_index(
        "ix_security_challenges_operation_id",
        "security_challenges",
        ["operation_id"],
    )
    op.create_index(
        "ix_security_challenges_purpose",
        "security_challenges",
        ["purpose"],
    )
    op.create_index(
        "ix_security_challenge_user_purpose",
        "security_challenges",
        ["user_id", "purpose", "created_at"],
    )
    op.create_index(
        "ix_security_challenge_operation",
        "security_challenges",
        ["operation_id", "purpose"],
    )

    op.create_table(
        "account_recovery_codes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_account_recovery_codes_user_id",
        "account_recovery_codes",
        ["user_id"],
    )
    op.create_index(
        "ix_recovery_codes_user_used",
        "account_recovery_codes",
        ["user_id", "used_at"],
    )

    op.create_table(
        "security_audit_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "workspace_id",
            sa.String(),
            sa.ForeignKey("workspaces.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("outcome", sa.String(30), nullable=False),
        sa.Column("resource_type", sa.String(80), nullable=True),
        sa.Column("resource_id", sa.String(160), nullable=True),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("correlation_id", sa.String(120), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_index(
        "ix_security_audit_events_user_id",
        "security_audit_events",
        ["user_id"],
    )
    op.create_index(
        "ix_security_audit_events_workspace_id",
        "security_audit_events",
        ["workspace_id"],
    )
    op.create_index(
        "ix_security_audit_events_event_type",
        "security_audit_events",
        ["event_type"],
    )
    op.create_index(
        "ix_security_audit_events_correlation_id",
        "security_audit_events",
        ["correlation_id"],
    )
    op.create_index(
        "ix_security_audit_events_created_at",
        "security_audit_events",
        ["created_at"],
    )
    op.create_index(
        "ix_security_audit_user_created",
        "security_audit_events",
        ["user_id", "created_at"],
    )
    op.create_index(
        "ix_security_audit_type_created",
        "security_audit_events",
        ["event_type", "created_at"],
    )

    # Audit records are append-only: corrections are new events, never edits.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION prevent_security_audit_mutation()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'security_audit_events is append-only';
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE TRIGGER security_audit_immutable
        BEFORE UPDATE OR DELETE ON security_audit_events
        FOR EACH ROW
        EXECUTE FUNCTION prevent_security_audit_mutation();
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TRIGGER IF EXISTS security_audit_immutable
        ON security_audit_events;
        """
    )

    op.execute(
        """
        DROP FUNCTION IF EXISTS prevent_security_audit_mutation();
        """
    )

    op.drop_index(
        "ix_security_audit_type_created",
        table_name="security_audit_events",
    )
    op.drop_index(
        "ix_security_audit_user_created",
        table_name="security_audit_events",
    )
    op.drop_index(
        "ix_security_audit_events_created_at",
        table_name="security_audit_events",
    )
    op.drop_index(
        "ix_security_audit_events_correlation_id",
        table_name="security_audit_events",
    )
    op.drop_index(
        "ix_security_audit_events_event_type",
        table_name="security_audit_events",
    )
    op.drop_index(
        "ix_security_audit_events_workspace_id",
        table_name="security_audit_events",
    )
    op.drop_index(
        "ix_security_audit_events_user_id",
        table_name="security_audit_events",
    )
    op.drop_table("security_audit_events")

    op.drop_index(
        "ix_recovery_codes_user_used",
        table_name="account_recovery_codes",
    )
    op.drop_index(
        "ix_account_recovery_codes_user_id",
        table_name="account_recovery_codes",
    )
    op.drop_table("account_recovery_codes")

    op.drop_index(
        "ix_security_challenge_operation",
        table_name="security_challenges",
    )
    op.drop_index(
        "ix_security_challenge_user_purpose",
        table_name="security_challenges",
    )
    op.drop_index(
        "ix_security_challenges_purpose",
        table_name="security_challenges",
    )
    op.drop_index(
        "ix_security_challenges_operation_id",
        table_name="security_challenges",
    )
    op.drop_index(
        "ix_security_challenges_workspace_id",
        table_name="security_challenges",
    )
    op.drop_index(
        "ix_security_challenges_user_id",
        table_name="security_challenges",
    )
    op.drop_table("security_challenges")
