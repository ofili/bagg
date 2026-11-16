from fastapi import APIRouter, Depends, Query, Response
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


@router.get("/me")
async def get_control_plane_identity(
    response: Response,
    admin: User = Depends(require_control_plane_admin),
):
    """
    Return the authenticated staff identity.

    This endpoint is useful to the control-plane frontend when deciding
    whether to render its internal application shell. It is not a substitute
    for authorization on individual control-plane endpoints.
    """
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


def analytics_filters(
    from_date: date | None,
    to_date: date | None,
    country: str | None,
    plan_code: str | None,
    acquisition_source: str | None,
):
    if from_date and to_date and from_date > to_date:
        from fastapi import HTTPException
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

    filters = analytics_filters(
        from_date, to_date, country, plan_code, acquisition_source
    )

    return await analytics_service.get_overview(db, **filters)


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

    filters = analytics_filters(
        from_date, to_date, country, plan_code, acquisition_source
    )

    return await analytics_service.get_funnel(db, **filters)


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

    filters = analytics_filters(
        from_date, to_date, country, plan_code, acquisition_source
    )

    return await analytics_service.get_billing(db, **filters)


@router.get("/analytics/events")
async def analytics_events(
    response: Response,
    from_date: date | None = None,
    to_date: date | None = None,
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
        event_name=event_name,
        event_source=event_source,
        limit=limit,
        offset=offset,
    )
