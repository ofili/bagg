"""Plan-to-entitlement mappings.

This module defines application feature access, not subscription state.
Commercial subscription records remain owned by the billing domain.
"""

from __future__ import annotations

from typing import Final

FREE_PLAN: Final[str] = "free"
PAID_PLANS: Final[frozenset[str]] = frozenset({"creator_pro", "professional"})

PLAN_ENTITLEMENTS: Final[dict[str, dict[str, bool | int | None]]] = {
    "free": {
        "documents.invoice.create": True,
        "documents.quote.create": True,
        "documents.send.monthly_limit": 3,
        "invoices.recurring.enabled": False,
        "payments.profiles.enabled": True,
    },
    "creator_pro": {
        "documents.invoice.create": True,
        "documents.quote.create": True,
        "documents.send.monthly_limit": None,
        "invoices.recurring.enabled": True,
        "payments.profiles.enabled": True,
    },
    "professional": {
        "documents.invoice.create": True,
        "documents.quote.create": True,
        "documents.send.monthly_limit": None,
        "invoices.recurring.enabled": True,
        "payments.profiles.enabled": True,
    },
}

ENTITLEMENT_KEYS: Final[frozenset[str]] = frozenset(
    key for entitlements in PLAN_ENTITLEMENTS.values() for key in entitlements
)
