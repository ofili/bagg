from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List

CURRENCY_SPECS: Dict[str, Dict[str, Any]] = {
    "NGN": {"name": "Nigerian Naira", "symbol": "₦", "decimals": 2, "factor": 100, "locale": "en-NG"},
    "USD": {"name": "US Dollar", "symbol": "$", "decimals": 2, "factor": 100, "locale": "en-US"},
    "GBP": {"name": "British Pound", "symbol": "£", "decimals": 2, "factor": 100, "locale": "en-GB"},
    "EUR": {"name": "Euro", "symbol": "€", "decimals": 2, "factor": 100, "locale": "de-DE"},
    "GHS": {"name": "Ghanaian Cedi", "symbol": "GH₵", "decimals": 2, "factor": 100, "locale": "en-GH"},
    "KES": {"name": "Kenyan Shilling", "symbol": "KSh", "decimals": 2, "factor": 100, "locale": "en-KE"},
    "ZAR": {"name": "South African Rand", "symbol": "R", "decimals": 2, "factor": 100, "locale": "en-ZA"},
}


def validate_currency(currency_code: str) -> bool:
    return currency_code.upper() in CURRENCY_SPECS


def get_currency_spec(currency_code: str) -> Dict[str, Any]:
    code = currency_code.upper()
    if code not in CURRENCY_SPECS:
        raise ValueError(f"Unsupported currency: {currency_code}")
    return CURRENCY_SPECS[code]


def calculate_tax_minor(taxable_amount_minor: int, tax_percent: float) -> int:
    """
    Computes tax in minor units using Decimal with ROUND_HALF_UP.
    taxable_amount_minor * (tax_percent / 100)
    """
    if taxable_amount_minor <= 0 or tax_percent <= 0:
        return 0
    amount = Decimal(taxable_amount_minor)
    rate = Decimal(str(tax_percent)) / Decimal("100")
    tax = amount * rate
    return int(tax.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def calculate_invoice_totals(
    items: List[Dict[str, Any]],
    discount_minor: int = 0,
    tax_percent: float = 0.0,
    wht_percent: float = 0.0,
    deposit_percent: float = 0.0,
    deposit_amount_minor: int | None = None,
) -> Dict[str, Any]:
    """
    Calculates subtotal, discounted subtotal, tax, gross total,
    withholding tax (WHT), net payable, and milestone deposit in minor units.
    Each item must have: quantity (int), unit_price_minor (int).
    """
    subtotal_minor = 0
    for item in items:
        qty = int(item.get("quantity", 1))
        unit_price = int(item.get("unit_price_minor", 0))
        subtotal_minor += qty * unit_price

    discounted_subtotal_minor = max(0, subtotal_minor - discount_minor)
    tax_minor = calculate_tax_minor(discounted_subtotal_minor, tax_percent)
    total_minor = discounted_subtotal_minor + tax_minor  # Gross Total

    # Withholding tax (WHT) is calculated on discounted taxable subtotal (US-INT-03)
    wht_minor = calculate_tax_minor(discounted_subtotal_minor, wht_percent)
    net_payable_minor = max(0, total_minor - wht_minor)

    # Deposit calculation (US-INT-02)
    resolved_deposit_minor = None
    if deposit_amount_minor is not None and deposit_amount_minor > 0:
        resolved_deposit_minor = min(deposit_amount_minor, net_payable_minor)
    elif deposit_percent is not None and deposit_percent > 0:
        resolved_deposit_minor = calculate_tax_minor(net_payable_minor, deposit_percent)

    return {
        "subtotal_minor": subtotal_minor,
        "discounted_subtotal_minor": discounted_subtotal_minor,
        "tax_minor": tax_minor,
        "total_minor": total_minor,
        "wht_minor": wht_minor,
        "net_payable_minor": net_payable_minor,
        "deposit_amount_minor": resolved_deposit_minor,
    }


def format_money(amount_minor: int, currency_code: str) -> str:
    """Formats an amount in minor units to its display string with symbol."""
    spec = get_currency_spec(currency_code)
    major = Decimal(amount_minor) / Decimal(spec["factor"])
    formatted_number = f"{major:,.{spec['decimals']}f}"
    return f"{spec['symbol']}{formatted_number}"
