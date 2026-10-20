from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import datetime, timezone, date
from typing import Optional, List

from app.core.database import get_db
from app.domains.sharing.schemas import PublicInvoiceView, CommentCreate, CommentResponse
from app.domains.sharing.models import InvoiceComment
from app.domains.invoices.models import Invoice
from app.domains.invoices.router import map_invoice_to_response
from app.domains.clients.models import Client
from app.domains.workspaces.models import Workspace
from app.domains.payments.models import PaymentProfile, PaymentClaim
from app.domains.payments.schemas import (
    PaymentProfileResponse,
    PaymentClaimResponse,
    PaymentClaimCreate,
)
from app.domains.reminders.service import cancel_invoice_reminders

router = APIRouter(prefix="/share", tags=["Sharing"])


@router.get("/{token}", response_model=PublicInvoiceView)
async def get_public_invoice(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Public zero-account payer endpoint (US-CLV-01, US-CLV-02, US-CLV-04).
    - Automatically marks 'sent' invoices as 'viewed' with timestamp.
    - Resolves multi-currency payout instructions.
    - Conditionally shows viral acquisition footer on free tier.
    - Returns latest payment claim if present (US-CLM-01).
    """
    stmt = (
        select(Invoice, Client.name.label("client_name"), Workspace)
        .join(Client, Invoice.client_id == Client.id, isouter=True)
        .join(Workspace, Invoice.workspace_id == Workspace.id)
        .where(Invoice.share_token == token)
    )
    res = await db.execute(stmt)
    row = res.first()

    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found or invalid link")

    invoice, client_name, workspace = row

    # Automatically transition from sent -> viewed (US-CLV-01)
    if invoice.status == "sent":
        invoice.status = "viewed"
        invoice.viewed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(invoice)

    invoice_resp = map_invoice_to_response(
        invoice,
        client_name=client_name,
        business_name=workspace.business_name,
    )

    # Query default payment profile for this invoice's currency and workspace (US-CLV-02)
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

    # Query comments (US-CLV-03)
    cmt_stmt = select(InvoiceComment).where(InvoiceComment.invoice_id == invoice.id).order_by(InvoiceComment.created_at.asc())
    cmt_res = await db.execute(cmt_stmt)
    comments = cmt_res.scalars().all()
    comments_resp = [
        CommentResponse(
            id=c.id,
            invoice_id=c.invoice_id,
            line_item_id=c.line_item_id,
            author_name=c.author_name,
            message=c.message,
            is_from_client=c.is_from_client,
            created_at=c.created_at,
        )
        for c in comments
    ]

    # Query latest claim (US-CLM-01)
    claim_stmt = select(PaymentClaim).where(PaymentClaim.invoice_id == invoice.id).order_by(PaymentClaim.created_at.desc()).limit(1)
    claim_res = await db.execute(claim_stmt)
    latest_claim = claim_res.scalars().first()
    latest_claim_resp = PaymentClaimResponse.model_validate(latest_claim) if latest_claim else None

    is_revised = invoice.version > 1
    banner = None
    if is_revised:
        date_str = invoice.last_revised_at.strftime("%B %d, %Y") if invoice.last_revised_at else "recently"
        banner = f"This invoice was revised on {date_str} (Revision {invoice.version}). You are viewing the latest active version."

    # Viral footer (US-CLV-04)
    show_footer = (workspace.tier != "pro")

    return PublicInvoiceView(
        invoice=invoice_resp,
        payment_profile=profile_resp,
        comments=comments_resp,
        is_revised=is_revised,
        revision_banner=banner,
        revisions_count=max(0, invoice.version - 1),
        show_viral_footer=show_footer,
        latest_claim=latest_claim_resp,
    )


@router.post("/{token}/claim", response_model=PaymentClaimResponse, status_code=status.HTTP_201_CREATED)
async def submit_payment_claim(
    token: str,
    payload: PaymentClaimCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Client submits an 'I Have Paid' claim with reference and optional proof (US-CLM-01).
    Transitions invoice status to 'payment_claimed'.
    """
    stmt = select(Invoice).where(Invoice.share_token == token)
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    claim = PaymentClaim(
        invoice_id=invoice.id,
        amount_minor=payload.amount_minor,
        payment_date=payload.payment_date or date.today(),
        reference=payload.reference,
        proof_file_url=payload.proof_file_url,
        status="pending",
    )
    db.add(claim)

    invoice.status = "payment_claimed"
    await cancel_invoice_reminders(invoice.id, db)
    await db.commit()
    await db.refresh(claim)

    return PaymentClaimResponse.model_validate(claim)


@router.post("/{token}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def post_comment(
    token: str,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Client or payer leaves a question/comment on a line item or overall invoice (US-CLV-03).
    """
    stmt = select(Invoice).where(Invoice.share_token == token)
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    comment = InvoiceComment(
        invoice_id=invoice.id,
        line_item_id=payload.line_item_id,
        author_name=payload.author_name.strip(),
        message=payload.message.strip(),
        is_from_client=True,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return CommentResponse(
        id=comment.id,
        invoice_id=comment.invoice_id,
        line_item_id=comment.line_item_id,
        author_name=comment.author_name,
        message=comment.message,
        is_from_client=comment.is_from_client,
        created_at=comment.created_at,
    )


@router.get("/{token}/comments", response_model=List[CommentResponse])
async def list_comments(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Returns all comments for the invoice (US-CLV-03)."""
    stmt = select(Invoice).where(Invoice.share_token == token)
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    cmt_stmt = select(InvoiceComment).where(InvoiceComment.invoice_id == invoice.id).order_by(InvoiceComment.created_at.asc())
    cmt_res = await db.execute(cmt_stmt)
    comments = cmt_res.scalars().all()

    return [
        CommentResponse(
            id=c.id,
            invoice_id=c.invoice_id,
            line_item_id=c.line_item_id,
            author_name=c.author_name,
            message=c.message,
            is_from_client=c.is_from_client,
            created_at=c.created_at,
        )
        for c in comments
    ]
