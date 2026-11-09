"""Use cases for public invoice access, comments and payer-submitted claims."""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.money import format_money
from app.domains.compliance.models import AbuseReport
from app.domains.compliance.schemas import (
    AbuseReportCreate,
    AbuseReportResponse,
)
from app.domains.invoices.presenter import map_invoice_to_response
from app.domains.invoices.schemas import InvoiceReceiptSummary
from app.domains.lifecycle.service import (
    invoice_balance_minor,
    record_status_event,
)
from app.domains.payments.models import PaymentClaim
from app.domains.payments.schemas import (
    PaymentClaimResponse,
    PaymentProfileResponse,
)
from app.domains.reminders.service import cancel_invoice_reminders
from app.domains.sharing.models import InvoiceComment
from app.domains.sharing.repository import SharingRepository
from app.domains.sharing.schemas import (
    CommentCreate,
    CommentResponse,
    PublicInvoiceView,
)

logger = logging.getLogger(__name__)


class SharingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SharingRepository(db)

    @staticmethod
    def _require_public_invoice(invoice):
        if not invoice or invoice.status == "draft":
            raise HTTPException(
                status_code=404,
                detail="Invoice not found or invalid link",
            )

    async def get_public_invoice(self, token: str) -> PublicInvoiceView:
        context = await self.repo.get_public_invoice_context(
            token,
            for_update=True,
        )

        if not context:
            raise HTTPException(
                status_code=404,
                detail="Invoice not found or invalid link",
            )

        invoice, client_name, workspace = context
        self._require_public_invoice(invoice)

        # An issued invoice already has a live public link. Sending an email
        # or WhatsApp message is a separate action and is not a prerequisite
        # for recording that the client viewed it.
        if invoice.status in {"issued", "sent"}:
            old_status = invoice.status
            invoice.status = "viewed"
            invoice.viewed_at = datetime.now(timezone.utc)

            record_status_event(
                db=self.db,
                workspace_id=invoice.workspace_id,
                document_type="invoice",
                document_id=invoice.id,
                from_status=old_status,
                to_status="viewed",
                actor_type="client",
                source="client_view",
            )

            if workspace.owner_id:
                await self.repo.add_notification(
                    workspace_id=workspace.id,
                    recipient_user_id=workspace.owner_id,
                    type="invoice_viewed",
                    title=f"Invoice {invoice.invoice_number} was viewed",
                    body=(
                        f"{client_name or 'Client'} opened and viewed "
                        "the invoice."
                    ),
                    document_type="invoice",
                    document_id=invoice.id,
                    document_number=invoice.invoice_number or "",
                    link_url=f"/invoices/{invoice.id}",
                )

            await self.repo.commit()
            await self.repo.refresh(invoice)

        invoice_response = map_invoice_to_response(
            invoice,
            client_name=client_name,
            client_phone=invoice.client.phone if invoice.client else None,
            client_email=invoice.client.email if invoice.client else None,
            business_name=workspace.business_name,
            base_url=settings.WEB_BASE_URL,
        )

        profile = await self.repo.get_default_payment_profile(
            invoice.workspace_id,
            invoice.currency,
        )

        profile_response = (
            PaymentProfileResponse.model_validate(profile)
            if profile
            else None
        )

        comments = [
            CommentResponse.model_validate(item)
            for item in await self.repo.list_comments(invoice.id)
        ]

        latest_claim = await self.repo.get_latest_claim(invoice.id)
        latest_claim_response = (
            PaymentClaimResponse.model_validate(latest_claim)
            if latest_claim
            else None
        )

        latest_receipt = await self.repo.get_latest_receipt(invoice.id)
        latest_receipt_response = (
            InvoiceReceiptSummary.model_validate(latest_receipt)
            if latest_receipt
            else None
        )

        invoice_response.latest_claim = latest_claim_response
        invoice_response.latest_receipt = latest_receipt_response

        is_revised = invoice.version > 1
        revision_banner = None

        if is_revised:
            revised_date = (
                invoice.last_revised_at.strftime("%B %d, %Y")
                if invoice.last_revised_at
                else "recently"
            )
            revision_banner = (
                f"This invoice was revised on {revised_date} "
                f"(Revision {invoice.version}). "
                "You are viewing the latest active version."
            )

        return PublicInvoiceView(
            invoice=invoice_response,
            payment_profile=profile_response,
            comments=comments,
            is_revised=is_revised,
            revision_banner=revision_banner,
            revisions_count=max(0, invoice.version - 1),
            show_viral_footer=workspace.tier not in {
                "pro",
                "creator_pro",
                "professional",
            },
            latest_claim=latest_claim_response,
        )

    async def submit_payment_claim(
        self,
        token: str,
        payload,
    ) -> PaymentClaimResponse:
        # Lock the invoice to prevent concurrent claim submissions from
        # independently superseding the same pending claim.
        invoice = await self.repo.get_invoice_by_token(
            token,
            for_update=True,
        )

        self._require_public_invoice(invoice)

        if invoice.status in {"cancelled", "void", "voided", "paid"}:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot submit a payment claim for a "
                    f"{invoice.status} invoice"
                ),
            )

        if payload.amount_minor <= 0:
            raise HTTPException(
                status_code=400,
                detail="Payment claim amount must be greater than zero",
            )

        if payload.amount_minor > invoice_balance_minor(invoice):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Payment claim amount exceeds the outstanding " "invoice balance"
                ),
            )

        try:
            # Supersede earlier pending claims before creating the new one.
            pending_claims = await self.repo.get_pending_claims(invoice.id)

            for previous_claim in pending_claims:
                previous_claim.status = "superseded"

            claim = PaymentClaim(
                invoice_id=invoice.id,
                amount_minor=payload.amount_minor,
                payment_date=payload.payment_date or date.today(),
                reference=payload.reference,
                proof_file_url=payload.proof_file_url,
                status="pending",
            )

            await self.repo.add_claim(claim)

            old_status = invoice.status
            invoice.status = "payment_claimed"

            record_status_event(
                db=self.db,
                workspace_id=invoice.workspace_id,
                document_type="invoice",
                document_id=invoice.id,
                from_status=old_status,
                to_status="payment_claimed",
                actor_type="client",
                source="client_payment_claim",
                metadata={
                    "amount_minor": payload.amount_minor,
                    "reference": payload.reference,
                },
            )

            # Preserve the caller's transaction. Do not commit from the
            # reminder subsystem while processing this claim.
            await cancel_invoice_reminders(
                invoice.id,
                self.db,
                commit=False,
            )

            workspace = await self.repo.get_workspace(invoice.workspace_id)

            if workspace and workspace.owner_id:
                reference_info = (
                    f" (Ref: {payload.reference})" if payload.reference else ""
                )

                await self.repo.add_notification(
                    workspace_id=workspace.id,
                    recipient_user_id=workspace.owner_id,
                    type="payment_claimed",
                    title=("Payment claimed on invoice " f"{invoice.invoice_number}"),
                    body=(
                        "Client submitted payment claim of "
                        f"{format_money(payload.amount_minor, invoice.currency)}"
                        f"{reference_info}."
                    ),
                    document_type="invoice",
                    document_id=invoice.id,
                    document_number=invoice.invoice_number or "",
                    link_url=f"/invoices/{invoice.id}",
                )

            # Claim, superseded claims, invoice status, event, reminders
            # and notification are committed together.
            await self.repo.commit()
            await self.repo.refresh(claim)

            return PaymentClaimResponse.model_validate(claim)

        except Exception:
            await self.repo.rollback()
            raise

    async def post_comment(
        self,
        token: str,
        payload: CommentCreate,
    ) -> CommentResponse:
        invoice = await self.repo.get_invoice_by_token(token)
        self._require_public_invoice(invoice)

        author_name = payload.author_name.strip()
        message = payload.message.strip()

        if not author_name:
            raise HTTPException(
                status_code=422,
                detail="Author name is required",
            )

        if len(author_name) > 120:
            raise HTTPException(
                status_code=422,
                detail="Author name must be 120 characters or fewer",
            )

        if not message:
            raise HTTPException(
                status_code=422,
                detail="Comment message is required",
            )

        if len(message) > 5000:
            raise HTTPException(
                status_code=422,
                detail="Comment must be 5,000 characters or fewer",
            )

        if payload.line_item_id:
            belongs_to_invoice = await self.repo.line_item_belongs_to_invoice(
                payload.line_item_id,
                invoice.id,
            )

            if not belongs_to_invoice:
                raise HTTPException(
                    status_code=422,
                    detail="Line item does not belong to this invoice",
                )

        comment = InvoiceComment(
            invoice_id=invoice.id,
            line_item_id=payload.line_item_id,
            author_name=author_name,
            message=message,
            is_from_client=True,
        )

        try:
            await self.repo.add_comment(comment)

            # The database-generated comment ID is needed by the
            # notification's comment_id field.
            await self.repo.flush()

            workspace = await self.repo.get_workspace(invoice.workspace_id)

            if workspace and workspace.owner_id:
                await self.repo.add_notification(
                    workspace_id=workspace.id,
                    recipient_user_id=workspace.owner_id,
                    type="client_comment",
                    title=f"New question on invoice {invoice.invoice_number}",
                    body=f"{author_name}: {message[:150]}",
                    document_type="invoice",
                    document_id=invoice.id,
                    document_number=invoice.invoice_number or "",
                    link_url=f"/invoices/{invoice.id}#comments",
                    comment_id=comment.id,
                )

            await self.repo.commit()
            await self.repo.refresh(comment)

            return CommentResponse.model_validate(comment)

        except Exception:
            await self.repo.rollback()
            raise

    async def list_comments(
        self,
        token: str,
    ) -> list[CommentResponse]:
        invoice = await self.repo.get_invoice_by_token(token)
        self._require_public_invoice(invoice)

        comments = await self.repo.list_comments(invoice.id)

        return [CommentResponse.model_validate(item) for item in comments]

    async def report_abuse(
        self,
        token: str,
        payload: AbuseReportCreate,
    ) -> AbuseReportResponse:
        context = await self.repo.get_public_invoice_context(token)

        if not context:
            raise HTTPException(
                status_code=404,
                detail="Invoice not found",
            )

        invoice, _, workspace = context
        self._require_public_invoice(invoice)

        reason = payload.reason.strip()

        if len(reason) < 10:
            raise HTTPException(
                status_code=422,
                detail="Reason must be at least 10 characters",
            )

        report = AbuseReport(
            invoice_id=invoice.id,
            workspace_id=workspace.id,
            reporter_email=(
                payload.reporter_email.strip().lower()
                if payload.reporter_email
                else None
            ),
            reporter_name=(
                payload.reporter_name.strip()
                if payload.reporter_name
                else None
            ),
            reason=reason,
            # Do not persist the raw public bearer token in the report.
            share_token=None,
            status="pending",
            # A report is not a moderation decision.
            workspace_restricted=False,
        )

        await self.repo.add_abuse_report(report)
        await self.repo.commit()
        await self.repo.refresh(report)

        return AbuseReportResponse.model_validate(report)
