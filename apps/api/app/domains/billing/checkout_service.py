"""Application workflow for creating provider-backed billing purchase intents."""

from __future__ import annotations
import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.billing.models import BillingCheckout
from app.domains.billing.repository import BillingRepository
from app.domains.billing.schemas import CheckoutResponse
from app.integrations.paystack import PaystackClient


async def create_billing_checkout(
    *,
    workspace,
    db: AsyncSession,
    purchase_type: str,
    currency: str,
    amount_minor: int,
    plan: str | None = None,
    pack: str | None = None,
    credits: int | None = None,
    callback_url: str | None = None,
) -> CheckoutResponse:
    reference = f"bagg_{'sub' if purchase_type == 'subscription' else 'pack'}_{uuid.uuid4().hex}"
    repo = BillingRepository(db)
    checkout = BillingCheckout(
        workspace_id=workspace.id,
        provider="paystack",
        provider_reference=reference,
        purchase_type=purchase_type,
        plan_code=plan,
        pack_code=pack,
        credits=credits,
        currency=currency,
        amount_minor=amount_minor,
        status="initializing",
    )
    repo.add(checkout)
    await db.commit()
    await db.refresh(checkout)
    try:
        owner_email = await repo.get_owner_email(workspace.id)
        if not owner_email:
            raise ValueError("Workspace owner email is unavailable.")
        metadata = {
            "type": "bagg_billing_checkout",
            "billing_checkout_id": checkout.id,
            "workspace_id": workspace.id,
            "purchase_type": purchase_type,
        }
        if plan:
            metadata["plan"] = plan
        if pack:
            metadata["pack"] = pack
        provider_result = await PaystackClient().initialize_payment(
            amount_minor=amount_minor,
            email=owner_email,
            reference=reference,
            currency=currency,
            callback_url=callback_url,
            metadata=metadata,
        )
        url = provider_result.get("authorization_url")
        if not url:
            raise RuntimeError("Payment provider did not return an authorization URL.")
        if (
            provider_result.get("reference")
            and provider_result["reference"] != reference
        ):
            raise RuntimeError(
                "Payment provider returned a different checkout reference."
            )
        checkout.status = "pending"
        await db.commit()
        return CheckoutResponse(
            authorization_url=url,
            reference=reference,
            plan=plan or pack or "",
            amount_minor=amount_minor,
            currency=currency,
        )
    except Exception as exc:
        await db.rollback()
        failed = await repo.get_checkout(reference, lock=True)
        if failed:
            failed.status = "failed"
            failed.failure_reason = str(exc)[:1000]
            await db.commit()
        raise HTTPException(
            status_code=502,
            detail="Payment gateway unavailable or unable to initialize checkout.",
        ) from exc
