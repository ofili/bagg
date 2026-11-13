
"""Authoritative Bagg billing catalogue.

All monetary values are stored in minor currency units (kobo).
The catalogue is the sole source of truth for subscription checkout prices.
"""

from typing import Final

CURRENCY = "NGN"

PLAN_PRICING: Final[dict[str, dict[str, int]]] = {
    "creator_pro": {
        "monthly": 350_000,
        "annual": 3_500_000,
    },
    "professional": {
        "monthly": 850_000,
        "annual": 8_500_000,
    },
}

# Studio is intentionally not purchasable.
COMING_SOON_PLANS: Final[set[str]] = {"studio"}

CREDIT_PACK_PRICING: Final[dict[str, dict[str, int]]] = {
    "200_credits": {
        "NGN": 200_000,
        "credits": 200,
    },
}

FREE_TIER_MONTHLY_SENDS_LIMIT: Final[int] = 3
GRACE_PERIOD_DAYS: Final[int] = 3

BILLING_INTERVALS: Final[set[str]] = {"monthly", "annual"}


def get_plan_price(plan: str, interval: str) -> int:
    """Return the authoritative NGN price or raise for an invalid purchase."""
    normalized_plan = plan.strip().lower()
    normalized_interval = interval.strip().lower()

    if normalized_plan in COMING_SOON_PLANS:
        raise ValueError("This plan is not currently available.")

    if normalized_interval not in BILLING_INTERVALS:
        raise ValueError("Unsupported billing interval.")

    plan_prices = PLAN_PRICING.get(normalized_plan)
    if not plan_prices:
        raise ValueError("Unsupported subscription plan.")

    return plan_prices[normalized_interval]


def get_credit_pack(pack: str) -> dict[str, int]:
    """Return a copy of the configured credit pack."""
    config = CREDIT_PACK_PRICING.get(pack.strip().lower())
    if config is None:
        raise ValueError("Unsupported credit pack.")
    return dict(config)
