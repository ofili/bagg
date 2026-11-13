
"""Paystack transaction and recurring subscription adapter."""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


class PaystackError(RuntimeError):
    """Raised when Paystack cannot complete an operation."""


class PaystackClient:
    BASE_URL = "https://api.paystack.co"

    def _headers(self) -> dict[str, str]:
        secret = settings.PAYSTACK_SECRET_KEY
        if not secret:
            raise PaystackError("PAYSTACK_SECRET_KEY is not configured.")

        return {
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
        }

    async def initialize_payment(
            self,
            amount_minor: int | None,
            email: str,
            reference: str,
            *,
            currency: str = "NGN",
            callback_url: str | None = None,
            metadata: dict[str, Any] | None = None,
            plan_code: str | None = None,
    ) -> dict[str, Any]:
        secret = settings.PAYSTACK_SECRET_KEY
        if not secret:
            raise PaystackError("PAYSTACK_SECRET_KEY is not configured.")

        if not email or not reference:
            raise ValueError("Email and reference are required.")

        if plan_code:
            if amount_minor is not None and amount_minor <= 0:
                raise ValueError("Payment amount must be positive.")
        elif amount_minor is None or amount_minor <= 0:
            raise ValueError("A positive payment amount is required.")

        payload: dict[str, Any] = {
            "email": email,
            "currency": currency.upper(),
            "reference": reference,
            "metadata": metadata or {},
        }

        if plan_code:
            payload["plan"] = plan_code
        else:
            payload["amount"] = int(amount_minor)

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
        if not reference:
            raise ValueError("Payment reference is required.")

        try:
            async with httpx.AsyncClient(
                    timeout=httpx.Timeout(15.0, connect=5.0)
            ) as client:
                response = await client.get(
                    f"{self.BASE_URL}/transaction/verify/{reference}",
                    headers=self._headers(),
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
            raise PaystackError(
                message or "Paystack could not verify the transaction."
            )

        return body.get("data") or {}

    async def get_subscription_manage_link(
            self,
            subscription_code: str,
    ) -> str:
        secret = settings.PAYSTACK_SECRET_KEY
        if not secret:
            raise PaystackError("PAYSTACK_SECRET_KEY is not configured.")

        if not subscription_code:
            raise ValueError("Subscription code is required.")

        try:
            async with httpx.AsyncClient(
                    timeout=httpx.Timeout(15.0, connect=5.0)
            ) as client:
                response = await client.get(
                    f"{self.BASE_URL}/subscription/{subscription_code}/manage/link",
                    headers={"Authorization": f"Bearer {secret}"},
                )
                response.raise_for_status()
                body = response.json()
        except httpx.HTTPError as exc:
            raise PaystackError(
                "Could not retrieve the Paystack subscription management link."
            ) from exc
        except ValueError as exc:
            raise PaystackError(
                "Paystack returned an invalid subscription-management response."
            ) from exc

        if not isinstance(body, dict) or body.get("status") is not True:
            raise PaystackError(
                "Paystack could not create a subscription-management link."
            )

        link = (body.get("data") or {}).get("link")
        if not isinstance(link, str) or not link.startswith("https://"):
            raise PaystackError(
                "Paystack returned an invalid subscription-management link."
            )

        return link
