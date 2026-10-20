from fastapi import APIRouter
from app.domains.billing.schemas import CreditBalanceResponse

router = APIRouter(prefix="/billing", tags=["Billing & Credits"])

@router.get("/credits", response_model=CreditBalanceResponse)
async def get_credit_balance():
    """Returns current credits balance and subscription tier."""
    return CreditBalanceResponse(
        workspace_id="ws_demo_01",
        balance=40,
        tier="free"
    )
