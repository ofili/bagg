from app.domains.notifications.service import NotificationService
from app.domains.workspaces.models import Workspace
import uuid
import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import datetime, timezone, date
from typing import Optional, List

from app.core.config import settings
from app.core.database import get_db
from app.domains.sharing.schemas import (
    PublicInvoiceView,
    CommentCreate,
    CommentResponse,
    DirectCheckoutRequest,
    DirectCheckoutResponse,
    PaymentVerificationRequest,
    PaymentVerificationResponse,
)
from app.domains.sharing.models import InvoiceComment
from app.domains.invoices.models import Invoice
from app.domains.invoices.presenter import map_invoice_to_response
from app.domains.invoices.schemas import InvoiceReceiptSummary
from app.domains.clients.models import Client
from app.domains.payments.models import PaymentProfile, PaymentClaim
from app.domains.receipts.models import Receipt
from app.domains.payments.schemas import (
    PaymentProfileResponse,
    PaymentClaimResponse,
    PaymentClaimCreate,
)
from app.domains.reminders.service import cancel_invoice_reminders
from app.domains.lifecycle.service import (
    invoice_balance_minor,
    record_status_event,
)
from app.domains.compliance.models import AbuseReport
from app.domains.compliance.schemas import AbuseReportCreate, AbuseReportResponse
from app.core.proxy import get_client_ip
from app.core.rate_limit import enforce_rate_limit

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
    if invoice.status == "draft":
        raise HTTPException(status_code=404, detail="Invoice not found or invalid link")

    # Automatically transition from sent -> viewed (US-CLV-01)
    if invoice.status == "sent":
        invoice.status = "viewed"
        invoice.viewed_at = datetime.now(timezone.utc)
        record_status_event(
            db=db,
            workspace_id=invoice.workspace_id,
            document_type="invoice",
            document_id=invoice.id,
            from_status="sent",
            to_status="viewed",
            actor_type="client",
            source="client_view",
        )
        if workspace and workspace.owner_id:
            try:
                await NotificationService.create_notification(
                    db,
                    workspace_id=workspace.id,
                    recipient_user_id=workspace.owner_id,
                    type="invoice_viewed",
                    title=f"Invoice {invoice.invoice_number} was viewed",
                    body=f"{client_name or 'Client'} opened and viewed the invoice.",
                    document_type="invoice",
                    document_id=invoice.id,
                    document_number=invoice.invoice_number,
                    link_url=f"/invoices/{invoice.id}",
                )
            except Exception as e:
                logger.warning(f"Failed to create invoice viewed notification: {e}")
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

    # Query latest receipt (US-REC-01)
    rcp_stmt = select(Receipt).where(Receipt.invoice_id == invoice.id).order_by(Receipt.created_at.desc()).limit(1)
    rcp_res = await db.execute(rcp_stmt)
    latest_rcp = rcp_res.scalars().first()
    latest_receipt_resp = InvoiceReceiptSummary.model_validate(latest_rcp) if latest_rcp else None

    invoice_resp.latest_claim = latest_claim_resp
    invoice_resp.latest_receipt = latest_receipt_resp

    is_revised = invoice.version > 1
    banner = None
    if is_revised:
        date_str = invoice.last_revised_at.strftime("%B %d, %Y") if invoice.last_revised_at else "recently"
        banner = f"This invoice was revised on {date_str} (Revision {invoice.version}). You are viewing the latest active version."

    # Viral footer (US-CLV-04 / US-SUB-05)
    show_footer = (workspace.tier not in ["pro", "creator_pro", "professional"])

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
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    await enforce_rate_limit(
        action="client-claim",
        identity=get_client_ip(request),
        limit=5,
        window_seconds=3600,
    )
    """
    Client submits an 'I Have Paid' claim with reference and optional proof (US-CLM-01).
    Transitions invoice status to 'payment_claimed'.
    """
    stmt = select(Invoice).where(Invoice.share_token == token)
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice or invoice.status == "draft":
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status in {"cancelled", "paid"}:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot submit a payment claim for a {invoice.status} invoice",
        )

    if payload.amount_minor <= 0:
        raise HTTPException(
            status_code=400,
            detail="Payment claim amount must be greater than zero",
        )

    outstanding_balance = invoice_balance_minor(invoice)
    if payload.amount_minor > outstanding_balance:
        raise HTTPException(
            status_code=400,
            detail="Payment claim amount exceeds the outstanding invoice balance",
        )

    # Cancel or supersede any existing pending claims for this invoice to prevent duplicates
    prev_stmt = select(PaymentClaim).where(
        and_(
            PaymentClaim.invoice_id == invoice.id,
            PaymentClaim.status == "pending",
        )
    )
    prev_res = await db.execute(prev_stmt)
    for prev_claim in prev_res.scalars().all():
        prev_claim.status = "superseded"

    claim = PaymentClaim(
        invoice_id=invoice.id,
        amount_minor=payload.amount_minor,
        payment_date=payload.payment_date or date.today(),
        reference=payload.reference,
        proof_file_url=payload.proof_file_url,
        status="pending",
    )
    db.add(claim)

    old_status = invoice.status
    invoice.status = "payment_claimed"
    record_status_event(
        db=db,
        workspace_id=invoice.workspace_id,
        document_type="invoice",
        document_id=invoice.id,
        from_status=old_status,
        to_status="payment_claimed",
        actor_type="client",
        source="client_payment_claim",
        metadata={"amount_minor": payload.amount_minor, "reference": payload.reference},
    )
    await cancel_invoice_reminders(invoice.id, db, commit=False)
    await db.commit()
    await db.refresh(claim)

    # Dispatch in-app notification to workspace owner
    ws_stmt = select(Workspace).where(Workspace.id == invoice.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()
    if workspace and workspace.owner_id:
        try:
            formatted_amt = format_money(payload.amount_minor, invoice.currency)
            ref_info = f" (Ref: {payload.reference})" if payload.reference else ""
            await NotificationService.create_notification(
                db,
                workspace_id=workspace.id,
                recipient_user_id=workspace.owner_id,
                type="payment_claimed",
                title=f"Payment claimed on invoice {invoice.invoice_number}",
                body=f"Client submitted payment claim of {formatted_amt}{ref_info}.",
                document_type="invoice",
                document_id=invoice.id,
                document_number=invoice.invoice_number,
                link_url=f"/invoices/{invoice.id}",
            )
        except Exception as e:
            logger.warning(f"Failed to create payment claim notification: {e}")

    return PaymentClaimResponse.model_validate(claim)


@router.post("/{token}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def post_comment(
    token: str,
    payload: CommentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    await enforce_rate_limit(
        action="client-comment",
        identity=get_client_ip(request),
        limit=20,
        window_seconds=3600,
    )
    """
    Client or payer leaves a question/comment on a line item or overall invoice (US-CLV-03).
    """
    stmt = select(Invoice).where(Invoice.share_token == token)
    res = await db.execute(stmt)
    invoice = res.scalar_one_or_none()
    if not invoice or invoice.status == "draft":
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

    # Dispatch in-app notification
    ws_stmt = select(Workspace).where(Workspace.id == invoice.workspace_id)
    ws_res = await db.execute(ws_stmt)
    workspace = ws_res.scalar_one_or_none()
    if workspace and workspace.owner_id:
        await NotificationService.create_notification(
            db,
            workspace_id=workspace.id,
            recipient_user_id=workspace.owner_id,
            type="client_comment",
            title=f"New question on invoice {invoice.invoice_number}",
            body=f"{comment.author_name}: {comment.message[:150]}",
            document_type="invoice",
            document_id=invoice.id,
            document_number=invoice.invoice_number,
            link_url=f"/invoices/{invoice.id}#comments",
            comment_id=comment.id,
        )

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
    if not invoice or invoice.status == "draft":
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


@router.post("/{token}/checkout", response_model=DirectCheckoutResponse, status_code=status.HTTP_201_CREATED)
async def initiate_direct_checkout(
    token: str,
    payload: DirectCheckoutRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Integrated Direct Payer Checkout (US-INT-01).
    Client initiates Paystack payment directly from the invoice page.
    Funds settle to the freelancer's verified merchant subaccount — Bagg never holds funds.
    Supports partial payments for milestone deposits.
    """
    stmt = (
        select(Invoice, Client, Workspace)
        .join(Client, Invoice.client_id == Client.id, isouter=True)
        .join(Workspace, Invoice.workspace_id == Workspace.id)
        .where(Invoice.share_token == token)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice, client, workspace = row
    if invoice.status == "draft":
        raise HTTPException(status_code=404, detail="Invoice not found")

    if not invoice.direct_checkout_enabled:
        raise HTTPException(status_code=403, detail="Direct checkout is disabled for this invoice")

    if invoice.status == "paid":
        raise HTTPException(status_code=400, detail="Invoice is already fully paid")

    if invoice.status in ["draft", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot pay a {invoice.status} invoice")

    # Determine charge amount
    net_payable = invoice.net_payable_minor if (invoice.net_payable_minor and invoice.net_payable_minor > 0) else invoice.total_minor
    balance_due = max(0, net_payable - (invoice.amount_paid_minor or 0))

    if payload.amount_minor and payload.amount_minor > 0:
        charge_amount = min(payload.amount_minor, balance_due)
    elif invoice.deposit_amount_minor and (invoice.amount_paid_minor or 0) == 0:
        # First payment on a milestone invoice — charge deposit
        charge_amount = invoice.deposit_amount_minor
    else:
        charge_amount = balance_due

    if charge_amount <= 0:
        raise HTTPException(status_code=400, detail="No outstanding balance to pay")

    reference = f"bagg_pay_{uuid.uuid4().hex[:16]}"
    invoice.direct_payment_reference = reference
    invoice.payment_processing_at = datetime.now(timezone.utc)
    invoice.payment_processing_reference = reference

    await db.commit()

    # Initialize Paystack transaction
    callback = payload.callback_url or f"http://localhost:3000/i/{token}?payment=success"
    paystack_payload = {
        "email": client.email if client and client.email else "client@invoice.bagg",
        "amount": charge_amount,  # Paystack expects kobo/cents
        "currency": invoice.currency,
        "reference": reference,
        "callback_url": callback,
        "metadata": {
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "workspace_id": workspace.id,
            "type": "direct_invoice_payment",
        },
    }

    try:
        async with httpx.AsyncClient() as http:
            resp = await http.post(
                "https://api.paystack.co/transaction/initialize",
                json=paystack_payload,
                headers={
                    "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=15.0,
            )
            resp_data = resp.json()

        if not resp_data.get("status"):
            raise HTTPException(status_code=502, detail="Payment gateway error")

        return DirectCheckoutResponse(
            checkout_url=resp_data["data"]["authorization_url"],
            reference=reference,
            amount_minor=charge_amount,
            currency=invoice.currency,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Payment gateway unavailable")


@router.post("/{token}/verify-payment", response_model=PaymentVerificationResponse)
async def verify_direct_payment(
    token: str,
    payload: PaymentVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Verifies a Paystack transaction and reconciles the invoice (US-INT-01).
    Called by frontend after Paystack redirect. Also handled by webhooks for reliability.
    """
    stmt = select(Invoice).where(Invoice.share_token == token)
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    if not invoice or invoice.status == "draft":
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Verify with Paystack
    try:
        async with httpx.AsyncClient() as http:
            resp = await http.get(
                f"https://api.paystack.co/transaction/verify/{payload.reference}",
                headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
                timeout=15.0,
            )
            resp_data = resp.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Payment gateway unavailable")

    if not resp_data.get("status") or resp_data.get("data", {}).get("status") != "success":
        return PaymentVerificationResponse(
            status="failed",
            message="Payment not confirmed by gateway",
            invoice_status=invoice.status,
            amount_paid_minor=invoice.amount_paid_minor or 0,
            balance_due_minor=invoice_balance_minor(invoice),
        )

    metadata = resp_data.get("data", {}).get("metadata") or {}
    if metadata.get("invoice_id") and metadata["invoice_id"] != invoice.id:
        raise HTTPException(status_code=400, detail="Payment reference does not belong to this invoice")

    if invoice.status == "paid":
        return PaymentVerificationResponse(
            status="success",
            message="Payment already confirmed",
            invoice_status=invoice.status,
            amount_paid_minor=invoice.amount_paid_minor or 0,
            balance_due_minor=0,
        )

    # The browser redirect is not proof of settlement. Mark the attempt as
    # processing and wait for the signed gateway webhook to confirm funds.
    invoice.payment_processing_at = datetime.now(timezone.utc)
    invoice.payment_processing_reference = payload.reference
    invoice.direct_payment_reference = payload.reference
    await db.commit()
    await db.refresh(invoice)

    return PaymentVerificationResponse(
        status="processing",
        message="Payment received by gateway; awaiting webhook confirmation",
        invoice_status=invoice.status,
        amount_paid_minor=invoice.amount_paid_minor or 0,
        balance_due_minor=invoice_balance_minor(invoice),
    )


@router.post("/{token}/report-abuse", response_model=AbuseReportResponse, status_code=status.HTTP_201_CREATED)
async def report_abuse(
    token: str,
    payload: AbuseReportCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Public abuse reporting endpoint (US-SEC-02).
    Any invoice recipient can report a suspicious or fraudulent invoice.
    - Flags the workspace for admin review.
    - Restricts outbound automated emails pending inspection.
    """
    stmt = (
        select(Invoice, Workspace)
        .join(Workspace, Invoice.workspace_id == Workspace.id)
        .where(Invoice.share_token == token)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice, workspace = row
    if invoice.status == "draft":
        raise HTTPException(status_code=404, detail="Invoice not found")

    report = AbuseReport(
        invoice_id=invoice.id,
        workspace_id=workspace.id,
        reporter_email=payload.reporter_email,
        reporter_name=payload.reporter_name,
        reason=payload.reason,
        share_token=token,
        status="pending",
        workspace_restricted=True,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return AbuseReportResponse(
        id=report.id,
        invoice_id=report.invoice_id,
        workspace_id=report.workspace_id,
        reporter_email=report.reporter_email,
        reason=report.reason,
        status=report.status,
        created_at=report.created_at,
    )
