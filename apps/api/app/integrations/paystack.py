"""Paystack transaction initialization adapter."""

from __future__ import annotations
from typing import Any
import httpx
from app.core.config import settings


class PaystackError(RuntimeError):
    """Raised when Paystack cannot initialize a transaction."""


class PaystackClient:
    BASE_URL = "https://api.paystack.co"

    async def initialize_payment(
        self,
        amount_minor: int,
        email: str,
        reference: str,
        *,
        currency: str = "NGN",
        callback_url: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        secret = settings.PAYSTACK_SECRET_KEY
        if not secret:
            raise PaystackError("PAYSTACK_SECRET_KEY is not configured.")
        if amount_minor <= 0:
            raise ValueError("Payment amount must be positive.")
        if not email or not reference:
            raise ValueError("Email and reference are required.")
        payload: dict[str, Any] = {
            "email": email,
            "amount": int(amount_minor),
            "currency": currency.upper(),
            "reference": reference,
            "metadata": metadata or {},
        }
        if callback_url:
            payload["callback_url"] = callback_url
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(15.0, connect=5.0)
            ) as client:
                response = await client.post(
                    f"{self.BASE_URL}/transaction/initialize",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {secret}",
                        "Content-Type": "application/json",
                    },
                )
                response.raise_for_status()
                body = response.json()
        except httpx.HTTPError as exc:
            raise PaystackError(
                "Paystack transaction initialization request failed."
            ) from exc
        except ValueError as exc:
            raise PaystackError("Paystack returned an invalid response.") from exc
        if not isinstance(body, dict) or body.get("status") is not True:
            message = body.get("message") if isinstance(body, dict) else None
            raise PaystackError(
                message or "Paystack rejected transaction initialization."
            )
        data = body.get("data") or {}
        authorization_url = data.get("authorization_url")
        returned_reference = data.get("reference")
        if not authorization_url or returned_reference != reference:
            raise PaystackError(
                "Paystack returned an incomplete or mismatched checkout response."
            )
        return {
            "authorization_url": authorization_url,
            "reference": returned_reference,
            "access_code": data.get("access_code"),
        }

    async def verify_payment(self, reference: str) -> dict[str, Any]:
        secret = settings.PAYSTACK_SECRET_KEY
        if not secret:
            raise PaystackError("PAYSTACK_SECRET_KEY is not configured.")
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(15.0, connect=5.0)
            ) as client:
                response = await client.get(
                    f"{self.BASE_URL}/transaction/verify/{reference}",
                    headers={"Authorization": f"Bearer {secret}"},
                )
                response.raise_for_status()
                body = response.json()
        except httpx.HTTPError as exc:
            raise PaystackError(
                "Paystack transaction verification request failed."
            ) from exc
        except ValueError as exc:
            raise PaystackError(
                "Paystack returned an invalid verification response."
            ) from exc
        if not isinstance(body, dict) or body.get("status") is not True:
            message = body.get("message") if isinstance(body, dict) else None
            raise PaystackError(message or "Paystack could not verify the transaction.")
        return body.get("data") or {}
