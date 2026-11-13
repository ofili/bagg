from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.onboarding.models import OnboardingProgress
from app.domains.workspaces.models import Workspace


BASE_COMPLETED_STEPS = [
    "account_created",
    "workspace_created",
]


class OnboardingRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_workspace(
            self,
            workspace_id: str,
    ) -> OnboardingProgress | None:

        result = await self.db.execute(
            select(OnboardingProgress).where(
                OnboardingProgress.workspace_id == workspace_id
            )
        )

        return result.scalars().first()

    async def get_or_create(
            self,
            workspace: Workspace,
    ) -> OnboardingProgress:

        # Lock the parent workspace row before creating progress.
        # This serializes concurrent initialization requests.
        await self.db.execute(
            select(Workspace.id)
            .where(Workspace.id == workspace.id)
            .with_for_update()
        )

        progress = await self.get_by_workspace(workspace.id)

        if progress:
            return progress

        now = datetime.now(UTC)

        is_completed = bool(workspace.onboarding_completed)

        completed_steps = list(BASE_COMPLETED_STEPS)

        if is_completed:
            completed_steps.append("business_profile")

        progress = OnboardingProgress(
            workspace_id=workspace.id,
            schema_version=1,
            status="completed" if is_completed else "not_started",
            current_step=None if is_completed else "business_profile",
            completed_steps=completed_steps,
            skipped_steps=[],
            started_at=(
                workspace.created_at or now
                if is_completed
                else None
            ),
            completed_at=(
                workspace.updated_at or now
                if is_completed
                else None
            ),
            last_activity_at=workspace.updated_at or now,
        )

        self.db.add(progress)

        await self.db.flush()

        return progress