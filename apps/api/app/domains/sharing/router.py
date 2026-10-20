from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_db
from app.domains.sharing.schemas import PublicInvoiceView, CommentCreate, CommentResponse
from app.domains.invoices.router import DEMO_INVOICES
from app.domains.payments.models import PaymentProfile
from app.domains.payments.schemas import PaymentProfileResponse

router = APIRouter(prefix="/share", tags=["Sharing"])


@router.get("/{token}", response_model=PublicInvoiceView)
async def get_public_invoice(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Public endpoint for client view via share token.
    No client account or login required.
    """
    invoice = next((inv for inv in DEMO_INVOICES if inv.share_token == token), None)
    if not invoice:
        invoice = DEMO_INVOICES[0]

    # Query default payment profile for this invoice's currency
    stmt = select(PaymentProfile).where(
        and_(
            PaymentProfile.currency == invoice.currency,
            PaymentProfile.is_default.is_(True)
        )
    ).limit(1)
    res = await db.execute(stmt)
    db_profile = res.scalars().first()

    profile_resp = None
    if db_profile:
        profile_resp = PaymentProfileResponse(
            id=db_profile.id,
            workspace_id=db_profile.workspace_id,
            currency=db_profile.currency,
            bank_name=db_profile.bank_name,
            account_name=db_profile.account_name,
            account_number=db_profile.account_number,
            routing_number=db_profile.routing_number,
            payment_link=db_profile.payment_link,
            mobile_money_number=db_profile.mobile_money_number,
            instructions=db_profile.instructions,
            is_default=db_profile.is_default,
            created_at=db_profile.created_at,
        )

    return PublicInvoiceView(
        invoice=invoice,
        payment_profile=profile_resp,
        comments=[]
    )


@router.post("/{token}/comments", response_model=CommentResponse)
async def post_comment(token: str, payload: CommentCreate):
    """Allows client to comment on an invoice line item or the overall invoice."""
    return CommentResponse(
        id="cmt_demo_01",
        invoice_id="inv_demo_01",
        line_item_id=payload.line_item_id,
        author_name=payload.author_name,
        message=payload.message,
        created_at=datetime.now(timezone.utc)
    )
