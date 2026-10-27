"""Seed deterministic public demo documents for local development and e2e tests."""

import argparse
import asyncio
import sys
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import AsyncSessionLocal
from app.domains.auth.models import User
from app.domains.clients.models import Client
from app.domains.invoices.models import Invoice, InvoiceLineItem
from app.domains.payments.models import PaymentClaim, PaymentProfile
from app.domains.quotes.models import Quote, QuoteLineItem
from app.domains.receipts.models import Receipt
from app.domains.reminders.models import ReminderJob
from app.domains.sharing.models import InvoiceComment
from app.domains.workspaces.models import Workspace

DEMO_EMAIL = "demo@bagg.app"
DEMO_WORKSPACE_ID = "ws_demo_sample"
DEMO_CLIENT_ID = "cl_demo_sample"
DEMO_PROFILE_ID = "pp_demo_sample"
DEMO_INVOICE_ID = "inv_demo_sample_ngn"
DEMO_PAID_INVOICE_ID = "inv_demo_sample_paid"
DEMO_QUOTE_ID = "qot_demo_sample"
DEMO_CLAIM_ID = "claim_demo_sample"
DEMO_RECEIPT_ID = "rcp_demo_sample"

INVOICE_TOKEN = "token_demo_sample_ngn"
PAID_INVOICE_TOKEN = "token_demo_sample_paid"
QUOTE_TOKEN = "token_demo_sample_qot"
RECEIPT_TOKEN = "token_demo_sample_rcp"

DEMO_LINKS = {
    "invoice": f"/i/{INVOICE_TOKEN}",
    "paid_invoice": f"/i/{PAID_INVOICE_TOKEN}",
    "quote": f"/q/{QUOTE_TOKEN}",
    "receipt": f"/r/{RECEIPT_TOKEN}",
}


async def remove_existing(session) -> None:
    user = (
        await session.execute(select(User).where(User.email == DEMO_EMAIL))
    ).scalar_one_or_none()
    if not user:
        return

    workspace_ids = (
        await session.execute(
            select(Workspace.id).where(Workspace.owner_id == user.id)
        )
    ).scalars().all()
    if workspace_ids:
        invoice_ids = (
            await session.execute(
                select(Invoice.id).where(Invoice.workspace_id.in_(workspace_ids))
            )
        ).scalars().all()

        await session.execute(
            delete(Receipt).where(Receipt.workspace_id.in_(workspace_ids))
        )
        if invoice_ids:
            await session.execute(
                delete(PaymentClaim).where(PaymentClaim.invoice_id.in_(invoice_ids))
            )
            await session.execute(
                delete(ReminderJob).where(ReminderJob.invoice_id.in_(invoice_ids))
            )
            await session.execute(
                delete(InvoiceComment).where(InvoiceComment.invoice_id.in_(invoice_ids))
            )
        await session.execute(
            delete(Quote).where(Quote.workspace_id.in_(workspace_ids))
        )
        await session.execute(
            delete(Invoice).where(Invoice.workspace_id.in_(workspace_ids))
        )
        await session.execute(
            delete(Client).where(Client.workspace_id.in_(workspace_ids))
        )
        await session.execute(
            delete(PaymentProfile).where(PaymentProfile.workspace_id.in_(workspace_ids))
        )
        await session.execute(
            delete(Workspace).where(Workspace.id.in_(workspace_ids))
        )

    await session.execute(delete(User).where(User.id == user.id))
    await session.commit()


async def seed() -> None:
    today = date.today()
    now = datetime.now(UTC)

    async with AsyncSessionLocal() as session:
        existing = (
            await session.execute(select(User).where(User.email == DEMO_EMAIL))
        ).scalar_one_or_none()
        if existing:
            print("Demo data already seeded.")
            for label, path in DEMO_LINKS.items():
                print(f"  {label}: http://localhost:3000{path}")
            return

        user = User(email=DEMO_EMAIL)
        session.add(user)
        await session.flush()

        workspace = Workspace(
            id=DEMO_WORKSPACE_ID,
            owner_id=user.id,
            name="Ada Okafor Design",
            business_name="Ada Okafor Design",
            brand_color="#FF7A1A",
            country="NG",
            default_currency="NGN",
            address="14 Admiralty Way, Lekki Phase 1, Lagos",
            tax_id="TIN-10948273-0001",
            tier="free",
            next_invoice_number=3,
            next_quote_number=2,
            next_receipt_number=2,
        )
        session.add(workspace)
        await session.flush()

        client = Client(
            id=DEMO_CLIENT_ID,
            workspace_id=workspace.id,
            name="Kofi Mensah",
            email="kofi@lagoscreative.studio",
            phone="+2348033445566",
            address="8 Adeola Odeku Street, Victoria Island, Lagos",
            country="NG",
            preferred_currency="NGN",
            default_payment_terms_days=14,
        )
        session.add(client)

        profile = PaymentProfile(
            id=DEMO_PROFILE_ID,
            workspace_id=workspace.id,
            currency="NGN",
            bank_name="Guaranty Trust Bank (GTBank)",
            account_name="Ada Okafor Design",
            account_number="0123456789",
            instructions="Use your invoice number as the transfer reference.",
            is_default=True,
        )
        session.add(profile)
        await session.flush()

        invoice = Invoice(
            id=DEMO_INVOICE_ID,
            workspace_id=workspace.id,
            client_id=client.id,
            invoice_number="INV-0001",
            sequence_number=1,
            currency="NGN",
            status="sent",
            issue_date=today,
            due_date=today + timedelta(days=14),
            subtotal_minor=63000000,
            discount_minor=0,
            tax_rate_percent=7.5,
            tax_minor=4725000,
            total_minor=67725000,
            wht_rate_percent=0.0,
            wht_minor=0,
            net_payable_minor=67725000,
            amount_paid_minor=0,
            payment_profile_id=profile.id,
            notes=(
                "Payment is due within 14 days. Please include INV-0001 in the "
                "transfer reference."
            ),
            share_token=INVOICE_TOKEN,
            sent_at=now - timedelta(days=1),
            email_delivery_status="delivered",
            version=1,
        )
        invoice.items = [
            InvoiceLineItem(
                position=0,
                description="Brand identity system",
                quantity=1,
                unit_price_minor=45000000,
                total_minor=45000000,
            ),
            InvoiceLineItem(
                position=1,
                description="Website design sprint",
                quantity=1,
                unit_price_minor=18000000,
                total_minor=18000000,
            ),
        ]
        session.add(invoice)
        await session.flush()

        quote = Quote(
            id=DEMO_QUOTE_ID,
            workspace_id=workspace.id,
            client_id=client.id,
            quote_number="QOT-0001",
            sequence_number=1,
            currency="NGN",
            status="sent",
            issue_date=today,
            expires_at=today + timedelta(days=14),
            version=1,
            subtotal_minor=47000000,
            discount_minor=0,
            tax_rate_percent=7.5,
            tax_minor=3525000,
            total_minor=50525000,
            wht_rate_percent=0.0,
            wht_minor=0,
            net_payable_minor=50525000,
            notes="This quote is valid for 14 days. Kickoff starts within one week of acceptance.",
            share_token=QUOTE_TOKEN,
            sent_at=now - timedelta(hours=6),
        )
        quote.items = [
            QuoteLineItem(
                position=0,
                description="Brand strategy workshop",
                quantity=1,
                unit_price_minor=35000000,
                total_minor=35000000,
            ),
            QuoteLineItem(
                position=1,
                description="Visual identity exploration",
                quantity=1,
                unit_price_minor=12000000,
                total_minor=12000000,
            ),
        ]
        session.add(quote)
        await session.flush()

        paid_invoice = Invoice(
            id=DEMO_PAID_INVOICE_ID,
            workspace_id=workspace.id,
            client_id=client.id,
            invoice_number="INV-0002",
            sequence_number=2,
            currency="NGN",
            status="paid",
            issue_date=today - timedelta(days=14),
            due_date=today - timedelta(days=2),
            subtotal_minor=50000000,
            discount_minor=0,
            tax_rate_percent=7.5,
            tax_minor=3750000,
            total_minor=53750000,
            wht_rate_percent=0.0,
            wht_minor=0,
            net_payable_minor=53750000,
            amount_paid_minor=53750000,
            paid_at=now - timedelta(days=2),
            payment_profile_id=profile.id,
            notes="Thank you for your business.",
            share_token=PAID_INVOICE_TOKEN,
            sent_at=now - timedelta(days=13),
            email_delivery_status="delivered",
            version=1,
        )
        paid_invoice.items = [
            InvoiceLineItem(
                position=0,
                description="Social media campaign Q4",
                quantity=1,
                unit_price_minor=50000000,
                total_minor=50000000,
            )
        ]
        session.add(paid_invoice)
        await session.flush()

        claim = PaymentClaim(
            id=DEMO_CLAIM_ID,
            invoice_id=paid_invoice.id,
            amount_minor=53750000,
            payment_date=today - timedelta(days=2),
            reference="GTB-DEMO-4821",
            status="confirmed",
            confirmed_at=now - timedelta(days=2),
        )
        session.add(claim)
        await session.flush()

        receipt = Receipt(
            id=DEMO_RECEIPT_ID,
            workspace_id=workspace.id,
            client_id=client.id,
            invoice_id=paid_invoice.id,
            payment_claim_id=claim.id,
            receipt_number="REC-0001",
            sequence_number=1,
            currency="NGN",
            amount_paid_minor=53750000,
            balance_remaining_minor=0,
            payment_date=today - timedelta(days=2),
            payment_method="bank_transfer",
            reference="GTB-DEMO-4821",
            payer_name="Kofi Mensah",
            confirmation_source="issuer_claim_review",
            confirmed_by_user_id=user.id,
            provider="bank",
            is_verified=True,
            verified_at=now - timedelta(days=2),
            verification_code="BAGG-DEMO2026",
            share_token=RECEIPT_TOKEN,
        )
        session.add(receipt)

        await session.commit()

    print("Demo data seeded.")
    for label, path in DEMO_LINKS.items():
        print(f"  {label}: http://localhost:3000{path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete and recreate the demo user's data before seeding.",
    )
    args = parser.parse_args()

    async def run() -> None:
        if args.reset:
            async with AsyncSessionLocal() as session:
                await remove_existing(session)
        await seed()

    asyncio.run(run())


if __name__ == "__main__":
    main()
