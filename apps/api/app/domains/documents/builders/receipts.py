from app.core.money import format_money
from app.domains.documents.schemas import ReceiptDocument
from app.domains.receipts.models import Receipt


def _format_date(value) -> str:
    return value.strftime("%B %d, %Y") if value else "—"


def _confirmation_details(source: str | None) -> tuple[str, str, str]:
    """Preserve the existing receipt confirmation classifications."""
    if source == "webhook_paystack":
        return (
            "Payment verified by Paystack",
            "PAYSTACK-VERIFIED",
            "This receipt records a transaction verified through Paystack "
            "and recorded by Bagg.",
        )

    if (source or "").startswith("issuer"):
        return (
            "Payment confirmed by business",
            "BUSINESS-CONFIRMED",
            "This receipt records the business's confirmation that funds "
            "were received. Bagg has not independently verified bank settlement.",
        )

    return (
        "Payment confirmation recorded",
        "RECORD-STAMPED",
        "Refer to the confirmation source shown on this receipt "
        "for how the payment was recorded.",
    )


def build_receipt_document(
    receipt: Receipt,
    *,
    business_name: str,
    client_name: str | None,
    invoice_number: str | None,
) -> ReceiptDocument:
    """Map an authorized, loaded receipt to presentation data.

    Does not query the database, mutate business state, or recalculate money.
    """
    heading, stamp, disclaimer = _confirmation_details(receipt.confirmation_source)
    currency = receipt.currency

    return ReceiptDocument(
        source_id=receipt.id,
        workspace_id=receipt.workspace_id,
        receipt_number=receipt.receipt_number,
        invoice_number=invoice_number or "INV",
        currency=currency,
        payment_date=receipt.payment_date,
        payment_method=(receipt.payment_method or "bank_transfer")
        .replace("_", " ")
        .title(),
        reference=receipt.reference or "N/A",
        payer_name=client_name or receipt.payer_name or "Client",
        business_name=business_name,
        amount_paid_minor=receipt.amount_paid_minor,
        balance_remaining_minor=receipt.balance_remaining_minor,
        verification_code=receipt.verification_code or "N/A",
        confirmation_source=receipt.confirmation_source or "legacy",
        confirmation_heading=heading,
        confirmation_stamp=stamp,
        confirmation_disclaimer=disclaimer,
        formatted_payment_date=_format_date(receipt.payment_date),
        formatted_amount_paid=format_money(receipt.amount_paid_minor, currency),
        formatted_balance_remaining=format_money(
            receipt.balance_remaining_minor, currency
        ),
    )
