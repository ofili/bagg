from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import BadRequestException, NotFoundException

from app.domains.invoices.models import Invoice
from app.domains.invoices.recall_models import InvoiceDocumentVersion
from app.domains.invoices.repository import InvoiceRepository
from app.integrations.email_outbox import supersede_active_document_emails

from app.domains.reminders.service import cancel_invoice_reminders
from app.domains.lifecycle.service import record_status_event


class InvoiceRecallService:

    @staticmethod
    async def get_locked_invoice(
        db: AsyncSession, workspace_id: str, invoice_id: str
    ) -> Invoice:
        invoice = await InvoiceRepository(db).get_for_update(workspace_id, invoice_id)
        if invoice is None:
            raise NotFoundException(f"Invoice '{invoice_id}' not found")
        return invoice

    @staticmethod
    async def validate_recall_eligibility(
        db: AsyncSession,
        invoice: Invoice,
    ) -> None:
        """
        Enforces the non-configurable financial recall invariant.

        Recall is blocked by:
        - Any confirmed payment.
        - Any pending payment claim.
        - Any unresolved provider transaction.

        This checks receipts as well as the invoice payment aggregate.
        """

        if invoice.status == "draft":
            raise BadRequestException(
                "Draft invoices do not require recall. " "Edit or discard the draft."
            )

        if invoice.status == "paid":
            raise BadRequestException(
                "A fully paid invoice cannot be recalled. "
                "Use the credit note or refund workflow."
            )

        if invoice.status == "cancelled":
            raise BadRequestException("This invoice is already cancelled.")

        if invoice.status == "void":
            raise BadRequestException("A voided invoice cannot be recalled.")

        if invoice.voided_at is not None:
            raise BadRequestException(
                "A permanently voided invoice cannot be recalled."
            )

        # The aggregate is a fast check, but not the sole source
        # of truth for whether a confirmed payment exists.
        if (invoice.amount_paid_minor or 0) > 0:
            raise BadRequestException(
                "This invoice has received a confirmed payment. "
                "Recall is prohibited, including partial payments."
            )

        repository = InvoiceRepository(db)
        if await repository.has_confirmed_receipt(invoice.id):
            raise BadRequestException(
                "A confirmed payment receipt exists. Recall is prohibited."
            )

        if await repository.has_pending_claim(invoice.id):
            raise BadRequestException(
                "An unresolved payment claim exists. Resolve the claim before recalling."
            )

        if (
            invoice.payment_processing_at is not None
            or invoice.payment_processing_reference is not None
        ):
            raise BadRequestException(
                "A payment transaction is still processing. "
                "Resolve its provider status before recalling."
            )

    @staticmethod
    async def create_issued_snapshot(
        db: AsyncSession,
        invoice: Invoice,
    ) -> InvoiceDocumentVersion:

        repository = InvoiceRepository(db)
        existing = await repository.get_document_version(
            invoice.id, invoice.version, for_update=True
        )

        if existing:
            return existing

        items = await repository.list_items(invoice.id)

        snapshot = {
            "invoice_id": invoice.id,
            "document_number": invoice.invoice_number,
            "revision_number": invoice.version,
            "workspace_id": invoice.workspace_id,
            "client_id": invoice.client_id,
            "currency": invoice.currency,
            "status_at_issue": invoice.status,
            "issue_date": (
                invoice.issue_date.isoformat() if invoice.issue_date else None
            ),
            "due_date": (invoice.due_date.isoformat() if invoice.due_date else None),
            "subtotal_minor": invoice.subtotal_minor,
            "discount_minor": invoice.discount_minor,
            "tax_rate_percent": invoice.tax_rate_percent,
            "tax_minor": invoice.tax_minor,
            "total_minor": invoice.total_minor,
            "wht_rate_percent": invoice.wht_rate_percent,
            "wht_minor": invoice.wht_minor,
            "net_payable_minor": invoice.net_payable_minor,
            "deposit_percentage": invoice.deposit_percentage,
            "deposit_amount_minor": invoice.deposit_amount_minor,
            "deposit_due_date": (
                invoice.deposit_due_date.isoformat()
                if invoice.deposit_due_date
                else None
            ),
            "direct_checkout_enabled": invoice.direct_checkout_enabled,
            "notes": invoice.notes,
            "items": [
                {
                    "position": item.position,
                    "description": item.description,
                    "quantity": item.quantity,
                    "unit_price_minor": item.unit_price_minor,
                    "total_minor": item.total_minor,
                }
                for item in items
            ],
        }

        version = InvoiceDocumentVersion(
            invoice_id=invoice.id,
            document_number=invoice.invoice_number,
            revision_number=invoice.version,
            snapshot=snapshot,
            share_token_hash=invoice.share_token_hash,
            issued_at=datetime.now(timezone.utc),
        )

        repository.add_document_version(version)
        await repository.flush()

        return version

    @classmethod
    async def recall(
        cls,
        db: AsyncSession,
        workspace_id: str,
        invoice_id: str,
        *,
        actor_user_id: str,
        reason: Optional[str] = None,
        commit: bool = True,
    ) -> Invoice:

        invoice = await cls.get_locked_invoice(
            db,
            workspace_id,
            invoice_id,
        )

        await cls.validate_recall_eligibility(
            db,
            invoice,
        )

        now = datetime.now(timezone.utc)
        old_status = invoice.status

        # Find and mark the current issued snapshot as recalled.
        version = await InvoiceRepository(db).get_document_version(
            invoice.id, invoice.version, for_update=True
        )
        if version is None:
            # Backfill the immutable snapshot for invoices issued before the
            # snapshot hook was added to finalisation. Never revoke the live
            # token before preserving the document that was actually issued.
            version = await cls.create_issued_snapshot(db, invoice)

        if version is not None:
            version.recalled_at = now
            version.recalled_by_user_id = actor_user_id
            version.recall_reason = reason

        from app.domains.payments.invoice_attempts import (
            invalidate_open_invoice_attempts,
        )

        invalidate_attempt_count = await invalidate_open_invoice_attempts(db, invoice)

        # Revoke public access to the current document.
        # The historical hash remains in the immutable snapshot record.
        invoice.share_token = None
        invoice.share_token_hash = None

        invoice.sent_at = None
        invoice.viewed_at = None
        invoice.email_delivery_status = None

        # Cancel an in-flight email before it can deliver a link that is no
        # longer valid. SKIP LOCKED inside the helper avoids waiting on the
        # email worker while this request holds the invoice row lock.
        await supersede_active_document_emails(
            db,
            message_type="invoice_email",
            aggregate_id=invoice.id,
        )

        invoice.last_recalled_at = now
        invoice.last_recalled_by_user_id = actor_user_id
        invoice.last_recall_reason = reason

        # The invoice becomes an editable working draft.
        # Its permanent invoice number is retained.
        invoice.status = "draft"

        record_status_event(
            db=db,
            workspace_id=workspace_id,
            document_type="invoice",
            document_id=invoice.id,
            from_status=old_status,
            to_status="draft",
            actor_type="issuer",
            actor_id=actor_user_id,
            source="issuer_invoice_recall",
            metadata={
                "revision_number": invoice.version,
                "reason": reason,
                "recalled_at": now.isoformat(),
                "document_version_id": (version.id if version else None),
                "invalidated_payment_attempts": invalidate_attempt_count,
            },
        )

        await cancel_invoice_reminders(
            invoice.id,
            db,
            commit=False,
        )

        repository = InvoiceRepository(db)
        if commit:
            await db.commit()
            await repository.refresh(invoice)
        else:
            await repository.flush()

        return invoice
