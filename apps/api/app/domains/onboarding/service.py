from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.onboarding.repository import OnboardingRepository
from app.domains.onboarding.schemas import (
    BusinessProfileResponse,
    BusinessProfileUpdate,
    OnboardingNextAction,
    OnboardingProgressResponse,
)
from app.domains.workspaces.models import Workspace


BUSINESS_PROFILE_STEP = "business_profile"


class OnboardingService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = OnboardingRepository(db)

    async def get_progress(
            self,
            workspace: Workspace,
    ) -> OnboardingProgressResponse:

        progress = await self.repository.get_or_create(workspace)

        return self._build_response(progress, workspace)

    async def resume(
            self,
            workspace: Workspace,
    ) -> OnboardingProgressResponse:

        progress = await self.repository.get_or_create(workspace)

        if progress.status != "completed":
            now = datetime.now(UTC)

            progress.status = "in_progress"
            progress.current_step = BUSINESS_PROFILE_STEP

            if progress.started_at is None:
                progress.started_at = now

            progress.last_activity_at = now

        return self._build_response(progress, workspace)

    async def complete_business_profile(
            self,
            workspace: Workspace,
            payload: BusinessProfileUpdate,
    ) -> OnboardingProgressResponse:

        business_name = payload.business_name.strip()

        if not business_name:
            raise ValueError("Business name is required.")

        progress = await self.repository.get_or_create(workspace)

        now = datetime.now(UTC)

        # Update the existing workspace profile.
        workspace.business_name = business_name
        workspace.country = payload.country.upper()
        workspace.default_currency = payload.default_currency.upper()
        workspace.address = (
            payload.address.strip()
            if payload.address and payload.address.strip()
            else None
        )

        # Mark the business profile as completed.
        completed_steps = list(progress.completed_steps or [])

        if BUSINESS_PROFILE_STEP not in completed_steps:
            completed_steps.append(BUSINESS_PROFILE_STEP)

        progress.completed_steps = completed_steps

        progress.status = "completed"
        progress.current_step = None

        if progress.started_at is None:
            progress.started_at = now

        if progress.completed_at is None:
            progress.completed_at = now

        progress.last_activity_at = now

        # Compatibility with existing frontend and API consumers.
        workspace.onboarding_completed = True

        await self.db.flush()

        return self._build_response(progress, workspace)

    @staticmethod
    def _build_response(
            progress,
            workspace: Workspace,
    ) -> OnboardingProgressResponse:

        completed_steps = list(progress.completed_steps or [])
        skipped_steps = list(progress.skipped_steps or [])

        required_steps = [
            BUSINESS_PROFILE_STEP,
        ]

        required_remaining = [
            step
            for step in required_steps
            if step not in completed_steps
        ]

        is_completed = progress.status == "completed"

        if is_completed:
            next_action = OnboardingNextAction(
                type="create_first_document",
                href="/invoices/new",
            )
        else:
            next_action = OnboardingNextAction(
                type="complete_business_profile",
                href="/onboarding",
            )

        return OnboardingProgressResponse(
            status=progress.status,
            schema_version=progress.schema_version,
            current_step=progress.current_step,
            completed_steps=completed_steps,
            skipped_steps=skipped_steps,
            required_steps_remaining=required_remaining,
            onboarding_completed=is_completed,
            business_profile=BusinessProfileResponse(
                business_name=workspace.business_name,
                country=workspace.country,
                default_currency=workspace.default_currency,
                address=workspace.address,
            ),
            next_action=next_action,
            started_at=progress.started_at,
            completed_at=progress.completed_at,
            last_activity_at=progress.last_activity_at,
        )