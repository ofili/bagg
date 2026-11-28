from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.models import User
from app.domains.control_plane.dependencies import (
    require_control_plane_admin,
)
from app.domains.entitlements.governance_schemas import (
    EntitlementOverrideCreate,
    EntitlementOverrideRevoke,
    EntitlementOverrideResponse,
)
from app.domains.entitlements.service import (
    grant_entitlement_override,
    list_entitlement_overrides,
    revoke_entitlement_override,
)
from app.domains.control_plane import analytics_service


router = APIRouter(
    prefix="/control-plane",
    tags=["Control Plane"],
)


def analytics_filters(
    from_date: date | None,
    to_date: date | None,
    country: str | None,
    plan_code: str | None,
    acquisition_source: str | None,
):
    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=422,
            detail="from_date cannot be later than to_date.",
        )

    return {
        "from_date": from_date,
        "to_date": to_date,
        "country": country,
        "plan_code": plan_code,
        "acquisition_source": acquisition_source,
    }


@router.get("/me")
async def get_control_plane_identity(
    response: Response,
    admin: User = Depends(require_control_plane_admin),
):
    response.headers["Cache-Control"] = "no-store"

    return {
        "authenticated": True,
        "is_control_plane_admin": True,
        "user": {
            "id": admin.id,
            "email": admin.email,
            "full_name": admin.full_name,
        },
    }


@router.get("/analytics/overview")
async def analytics_overview(
    response: Response,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_control_plane_admin),
):
    response.headers["Cache-Control"] = "no-store"

    return await analytics_service.get_overview(
        db,
        **analytics_filters(
            from_date,
            to_date,
            country,
            plan_code,
            acquisition_source,
        ),
    )


@router.get("/analytics/funnel")
async def analytics_funnel(
    response: Response,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_control_plane_admin),
):
    response.headers["Cache-Control"] = "no-store"

    return await analytics_service.get_funnel(
        db,
        **analytics_filters(
            from_date,
            to_date,
            country,
            plan_code,
            acquisition_source,
        ),
    )


@router.get("/analytics/cohorts")
async def analytics_cohorts(
    response: Response,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_control_plane_admin),
):
    response.headers["Cache-Control"] = "no-store"

    return await analytics_service.get_cohorts(
        db,
        **analytics_filters(
            from_date,
            to_date,
            country,
            plan_code,
            acquisition_source,
        ),
    )


@router.get("/analytics/segments")
async def analytics_segments(
    response: Response,
    segment: str = Query(default="incomplete_setup", max_length=64),
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_control_plane_admin),
):
    response.headers["Cache-Control"] = "no-store"

    filters = analytics_filters(
        from_date,
        to_date,
        country,
        plan_code,
        acquisition_source,
    )

    try:
        return await analytics_service.get_segments(
            db,
            segment=segment,
            limit=limit,
            offset=offset,
            **filters,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc


@router.get("/analytics/billing")
async def analytics_billing(
    response: Response,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_control_plane_admin),
):
    response.headers["Cache-Control"] = "no-store"

    return await analytics_service.get_billing(
        db,
        **analytics_filters(
            from_date,
            to_date,
            country,
            plan_code,
            acquisition_source,
        ),
    )


@router.get("/analytics/events")
async def analytics_events(
    response: Response,
    from_date: date | None = None,
    to_date: date | None = None,
    country: str | None = None,
    plan_code: str | None = None,
    acquisition_source: str | None = None,
    event_name: str | None = Query(default=None, max_length=120),
    event_source: str | None = Query(default=None, max_length=32),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_control_plane_admin),
):
    response.headers["Cache-Control"] = "no-store"

    return await analytics_service.get_events(
        db,
        from_date=from_date,
        to_date=to_date,
        country=country,
        plan_code=plan_code,
        acquisition_source=acquisition_source,
        event_name=event_name,
        event_source=event_source,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/workspaces/{workspace_id}/entitlement-overrides",
    response_model=list[EntitlementOverrideResponse],
)
async def get_workspace_entitlement_overrides(
    workspace_id: str,
    response: Response,
    status_filter: str | None = Query(
        default=None,
        alias="status",
        pattern="^(active|revoked|expired)$",
    ),
    entitlement_key: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_control_plane_admin),
):
    response.headers["Cache-Control"] = "no-store"

    try:
        return await list_entitlement_overrides(
            db,
            workspace_id=workspace_id,
            status=status_filter,
            entitlement_key=entitlement_key,
            limit=limit,
            offset=offset,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post(
    "/workspaces/{workspace_id}/entitlement-overrides",
    response_model=EntitlementOverrideResponse,
    status_code=201,
)
async def create_workspace_entitlement_override(
    workspace_id: str,
    payload: EntitlementOverrideCreate,
    response: Response,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_control_plane_admin),
):
    response.headers["Cache-Control"] = "no-store"

    try:
        return await grant_entitlement_override(
            db,
            workspace_id=workspace_id,
            entitlement_key=payload.entitlement_key,
            override_value=payload.override_value,
            reason=payload.reason,
            admin_id=admin.id,
            effective_at=payload.effective_at,
            expires_at=payload.expires_at,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = (
            404
            if detail == "Workspace not found."
            else 409
            if detail.startswith("An active override already exists")
            else 422
        )
        raise HTTPException(
            status_code=status_code,
            detail=detail,
        ) from exc


@router.post(
    "/workspaces/{workspace_id}/entitlement-overrides/{override_id}/revoke",
    response_model=EntitlementOverrideResponse,
)
async def revoke_workspace_entitlement_override(
    workspace_id: str,
    override_id: str,
    payload: EntitlementOverrideRevoke,
    response: Response,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_control_plane_admin),
):
    response.headers["Cache-Control"] = "no-store"

    try:
        return await revoke_entitlement_override(
            db,
            workspace_id=workspace_id,
            override_id=override_id,
            admin_id=admin.id,
            reason=payload.reason,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = (
            404
            if detail
            in {
                "Workspace not found.",
                "Entitlement override not found.",
            }
            else 409 if detail.startswith("Only active overrides") else 422
        )
        raise HTTPException(
            status_code=status_code,
            detail=detail,
        ) from exc
