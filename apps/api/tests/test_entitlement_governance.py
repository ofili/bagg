from datetime import datetime, timedelta, timezone
import uuid

import pytest

from app.domains.audit.repository import AuditRepository
from app.domains.entitlements.models import EntitlementOverride
from app.domains.entitlements.service import (
    get_workspace_entitlements,
    grant_entitlement_override,
    revoke_entitlement_override,
)
from app.domains.auth.models import User
from app.domains.workspaces.models import Workspace


async def create_test_workspace(db_session):
    suffix = uuid.uuid4().hex[:12]

    user = User(email=f"entitlement-{suffix}@example.com")
    db_session.add(user)
    await db_session.flush()

    workspace = Workspace(
        owner_id=user.id,
        name=f"Entitlement Test {suffix}",
    )
    db_session.add(workspace)
    await db_session.commit()
    await db_session.refresh(workspace)

    return workspace


@pytest.mark.asyncio
async def test_entitlement_override_grant_and_revoke_are_persisted_and_audited(
    db_session,
):
    workspace = await create_test_workspace(db_session)
    admin_id = "usr_control_plane_test"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    override = await grant_entitlement_override(
        db_session,
        workspace_id=workspace.id,
        entitlement_key="invoices.recurring.enabled",
        override_value=True,
        reason="Temporary product access for customer support.",
        admin_id=admin_id,
        expires_at=expires_at,
    )

    workspace_id = workspace.id
    override_id = override.id

    assert override.workspace_id == workspace.id
    assert override.entitlement_key == "invoices.recurring.enabled"
    assert override.override_value is True
    assert override.reason == "Temporary product access for customer support."
    assert override.created_by_admin_id == admin_id
    assert override.status == "active"

    snapshot = await get_workspace_entitlements(
        db=db_session,
        workspace=workspace,
    )
    assert snapshot["entitlements"]["invoices.recurring.enabled"] is True

    # A second active override for the same workspace/key must be rejected.
    with pytest.raises(
        ValueError,
        match="An active override already exists",
    ):
        await grant_entitlement_override(
            db_session,
            workspace_id=workspace.id,
            entitlement_key="invoices.recurring.enabled",
            override_value=False,
            reason="Duplicate override regression test.",
            admin_id=admin_id,
            expires_at=expires_at,
        )

    await db_session.refresh(workspace)

    await revoke_entitlement_override(
        db_session,
        workspace_id=workspace_id,
        override_id=override_id,
        admin_id=admin_id,
        reason="Temporary access is no longer required.",
    )

    snapshot = await get_workspace_entitlements(
        db=db_session,
        workspace=workspace,
    )
    assert snapshot["entitlements"]["invoices.recurring.enabled"] is False

    events = await AuditRepository(db_session).list_events(
        workspace_id=workspace.id,
        entity_type="entitlement_override",
        entity_id=override_id,
        limit=20,
    )

    events_by_action = {event.action: event for event in events}

    assert "entitlement_override.granted" in events_by_action
    assert "entitlement_override.revoked" in events_by_action

    grant_event = events_by_action["entitlement_override.granted"]
    assert grant_event.actor_type == "admin"
    assert grant_event.actor_id == admin_id
    assert grant_event.after_state["reason"] == (
        "Temporary product access for customer support."
    )

    revoke_event = events_by_action["entitlement_override.revoked"]
    assert revoke_event.actor_type == "admin"
    assert revoke_event.actor_id == admin_id
    assert revoke_event.after_state["status"] == "revoked"
    assert revoke_event.after_state["revocation_reason"] == (
        "Temporary access is no longer required."
    )


@pytest.mark.asyncio
async def test_entitlement_overrides_are_workspace_scoped_and_expiry_is_enforced(
    db_session,
):
    workspace_a = await create_test_workspace(db_session)
    workspace_b = await create_test_workspace(db_session)

    now = datetime.now(timezone.utc)

    # Workspace A receives a currently effective override.
    await grant_entitlement_override(
        db_session,
        workspace_id=workspace_a.id,
        entitlement_key="invoices.recurring.enabled",
        override_value=True,
        reason="Workspace A isolation test.",
        admin_id="usr_control_plane_test",
        expires_at=now + timedelta(days=7),
    )

    # Workspace B has a persisted override whose expiry has elapsed.
    expired_override = EntitlementOverride(
        workspace_id=workspace_b.id,
        entitlement_key="documents.send.monthly_limit",
        override_value=99,
        reason="Expired override regression test.",
        status="active",
        created_by_admin_id="usr_control_plane_test",
        effective_at=now - timedelta(days=2),
        expires_at=now - timedelta(seconds=1),
    )
    db_session.add(expired_override)
    await db_session.commit()

    snapshot_a = await get_workspace_entitlements(
        db=db_session,
        workspace=workspace_a,
    )
    snapshot_b = await get_workspace_entitlements(
        db=db_session,
        workspace=workspace_b,
    )

    # Workspace A's override must not affect Workspace B.
    assert snapshot_a["entitlements"]["invoices.recurring.enabled"] is True
    assert snapshot_b["entitlements"]["invoices.recurring.enabled"] is False

    # Workspace B's expired override must not affect its effective limit.
    assert snapshot_b["entitlements"]["documents.send.monthly_limit"] == 3

    # The administrative listing must also remain workspace-scoped.
    from app.domains.entitlements.service import list_entitlement_overrides

    overrides_a = await list_entitlement_overrides(
        db_session,
        workspace_id=workspace_a.id,
    )
    overrides_b = await list_entitlement_overrides(
        db_session,
        workspace_id=workspace_b.id,
    )

    assert all(item.workspace_id == workspace_a.id for item in overrides_a)
    assert all(item.workspace_id == workspace_b.id for item in overrides_b)
    assert expired_override.id in {item.id for item in overrides_b}
    assert expired_override.id not in {item.id for item in overrides_a}
