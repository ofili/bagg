from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone
from typing import Optional

from app.core.database import get_db
from app.domains.sharing.schemas import PublicInvoiceView, CommentCreate, CommentResponse
from app.domains.invoices.models import Invoice
from app.domains.invoices.router import map_invoice_to_response
from app.domains.clients.models import Client
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
    No client account or login required (US-CLV-01).
    """
    stmt = (
        select(Invoice, Client.name.label("client_name"))
        .join(Client, Invoice.client_id == Client.id, isouter=True)
        .where(Invoice.share_token == token)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found or invalid link")

    invoice, client_name = row
    invoice_resp = map_invoice_to_response(invoice, client_name)

    # Query default payment profile for this invoice's currency and workspace
    stmt_prof = select(PaymentProfile).where(
        and_(
            PaymentProfile.workspace_id == invoice.workspace_id,
            PaymentProfile.currency == invoice.currency,
            PaymentProfile.is_default.is_(True)
        )
    ).limit(1)
    res_prof = await db.execute(stmt_prof)
    db_profile = res_prof.scalars().first()

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
        invoice=invoice_resp,
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
