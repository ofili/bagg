"""Invoice payment-attempt lifecycle; SQL is encapsulated by PaymentRepository."""

from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import BadRequestException, NotFoundException
from app.domains.invoices.models import Invoice
from app.domains.payments.models import InvoicePaymentAttempt
from app.domains.payments.repository import PaymentRepository

ACTIVE_ATTEMPT_STATUSES = {"initializing", "pending", "processing"}
TERMINAL_ATTEMPT_STATUSES = {
    "succeeded",
    "failed",
    "invalidated",
    "reconciliation_required",
}


def new_paystack_reference() -> str:
    return f"bagg_pay_{uuid.uuid4().hex}"


async def get_attempt_by_reference(
    db: AsyncSession, provider: str, reference: str, *, lock: bool = False
) -> Optional[InvoicePaymentAttempt]:
    return await PaymentRepository(db).get_attempt_by_reference(
        provider, reference, lock=lock
    )


async def create_invoice_payment_attempt(
    db: AsyncSession, invoice: Invoice, *, amount_minor: int, provider: str = "paystack"
) -> InvoicePaymentAttempt:
    if amount_minor <= 0:
        raise BadRequestException("Payment amount must be greater than zero.")
    if invoice.status in {"draft", "paid", "cancelled", "void"}:
        raise BadRequestException(
            f"Cannot initiate payment for a {invoice.status} invoice."
        )
    if invoice.reconciliation_required:
        raise BadRequestException(
            "This invoice has a payment requiring reconciliation. Resolve it before initiating another checkout."
        )
    attempt = InvoicePaymentAttempt(
        invoice_id=invoice.id,
        workspace_id=invoice.workspace_id,
        provider=provider,
        provider_reference=new_paystack_reference(),
        status="initializing",
        amount_minor=amount_minor,
        currency=invoice.currency,
        invoice_version=invoice.version,
    )
    PaymentRepository(db).add(attempt)
    await PaymentRepository(db).flush()
    return attempt


async def mark_attempt_initialized(
    db: AsyncSession, attempt: InvoicePaymentAttempt, *, checkout_url: str
) -> None:
    attempt.checkout_url = checkout_url
    attempt.status = "pending"
    attempt.initialized_at = datetime.now(timezone.utc)


async def mark_attempt_initialization_failed(
    db: AsyncSession, attempt: InvoicePaymentAttempt, *, reason: str
) -> None:
    attempt.status = "failed"
    attempt.failed_at = datetime.now(timezone.utc)
    attempt.reconciliation_reason = reason[:2000]


async def mark_attempt_processing(
    db: AsyncSession, attempt: InvoicePaymentAttempt
) -> None:
    if attempt.status not in {
        "succeeded",
        "failed",
        "invalidated",
        "reconciliation_required",
    }:
        attempt.status = "processing"
        attempt.processing_at = datetime.now(timezone.utc)


async def invalidate_open_invoice_attempts(db: AsyncSession, invoice: Invoice) -> int:
    repo = PaymentRepository(db)
    if await repo.has_processing_attempt(invoice.id):
        raise BadRequestException(
            "A payment transaction is processing. Resolve its provider status before recalling this invoice."
        )
    attempts = await repo.list_open_attempts(invoice.id)
    now = datetime.now(timezone.utc)
    for attempt in attempts:
        attempt.status = "invalidated"
        attempt.invalidated_at = now
        attempt.reconciliation_reason = (
            "Checkout invalidated because the invoice was recalled."
        )
    invoice.direct_payment_reference = None
    invoice.payment_processing_reference = None
    invoice.payment_processing_at = None
    return len(attempts)


async def require_attempt_for_invoice(
    db: AsyncSession,
    *,
    provider: str,
    reference: str,
    invoice_id: str,
    workspace_id: str,
    lock: bool = False,
) -> InvoicePaymentAttempt:
    attempt = await PaymentRepository(db).get_attempt_by_reference(
        provider, reference, lock=lock
    )
    if attempt is None:
        raise NotFoundException(
            f"Payment attempt for reference '{reference}' was not found."
        )
    if attempt.invoice_id != invoice_id or attempt.workspace_id != workspace_id:
        raise BadRequestException("Payment reference does not belong to this invoice.")
    return attempt
