from fastapi import APIRouter, Depends, Response

from app.domains.auth.models import User
from app.domains.control_plane.dependencies import (
    require_control_plane_admin,
)

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
