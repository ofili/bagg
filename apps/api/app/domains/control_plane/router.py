from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domains.auth.models import User
from app.domains.control_plane.dependencies import (
    require_control_plane_admin,
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
