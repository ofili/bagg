"""Authoritative server-side billing catalogue. Values are minor currency units."""

PLAN_PRICING = {
    "creator_pro": {"NGN": 1_400_000, "USD": 1_400},
    "professional": {"NGN": 2_800_000, "USD": 2_800},
}
CREDIT_PACK_PRICING = {
    "200_credits": {"NGN": 200_000, "USD": 200, "credits": 200},
}
FREE_TIER_MONTHLY_SENDS_LIMIT = 3
ANNUAL_PERIOD_DAYS = 365
GRACE_PERIOD_DAYS = 3
