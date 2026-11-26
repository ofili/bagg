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


from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, List


def _require_nonnegative_integer(value: Any, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field_name} must be an integer.")

    if value < 0:
        raise ValueError(f"{field_name} cannot be negative.")

    return value


def _require_percentage(value: Any, field_name: str) -> Decimal:
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be a valid percentage.")

    try:
        percentage = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as e:
        raise ValueError(f"{field_name} must be a valid percentage.") from e

    if not percentage.is_finite() or not Decimal("0") <= percentage <= Decimal("100"):
        raise ValueError(f"{field_name} must be between 0 and 100.")

    return percentage


def calculate_tax_minor(
    taxable_amount_minor: int,
    tax_percent: float,
) -> int:
    """
    Calculate tax in minor units using ROUND_HALF_UP.
    """
    amount = _require_nonnegative_integer(
        taxable_amount_minor,
        "taxable_amount_minor",
    )
    rate = _require_percentage(tax_percent, "tax_percent")

    if amount == 0 or rate == 0:
        return 0

    tax = Decimal(amount) * rate / Decimal("100")

    return int(
        tax.quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )
    )


def calculate_invoice_totals(
    items: List[Dict[str, Any]],
    discount_minor: int = 0,
    tax_percent: float = 0.0,
    wht_percent: float = 0.0,
    deposit_percent: float = 0.0,
    deposit_amount_minor: int | None = None,
) -> Dict[str, Any]:
    """
    Calculate invoice totals using integer minor units.

    Each item must contain:
        quantity: nonnegative integer
        unit_price_minor: nonnegative integer

    Zero-valued quantities and prices remain supported.
    """
    if not isinstance(items, list):
        raise ValueError("items must be a list.")

    discount = _require_nonnegative_integer(
        discount_minor,
        "discount_minor",
    )
    tax_rate = _require_percentage(tax_percent, "tax_percent")
    wht_rate = _require_percentage(wht_percent, "wht_percent")
    deposit_rate = _require_percentage(
        deposit_percent,
        "deposit_percent",
    )

    if deposit_amount_minor is not None:
        explicit_deposit = _require_nonnegative_integer(
            deposit_amount_minor,
            "deposit_amount_minor",
        )
    else:
        explicit_deposit = None

    subtotal_minor = 0

    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"items[{index}] must be a dictionary.")

        quantity = _require_nonnegative_integer(
            item.get("quantity", 1),
            f"items[{index}].quantity",
        )
        unit_price_minor = _require_nonnegative_integer(
            item.get("unit_price_minor", 0),
            f"items[{index}].unit_price_minor",
        )

        subtotal_minor += quantity * unit_price_minor

    discounted_subtotal_minor = max(
        0,
        subtotal_minor - discount,
    )

    tax_minor = calculate_tax_minor(
        discounted_subtotal_minor,
        tax_rate,
    )

    total_minor = discounted_subtotal_minor + tax_minor

    wht_minor = calculate_tax_minor(
        discounted_subtotal_minor,
        wht_rate,
    )

    net_payable_minor = max(
        0,
        total_minor - wht_minor,
    )

    resolved_deposit_minor = None

    if explicit_deposit is not None and explicit_deposit > 0:
        resolved_deposit_minor = min(
            explicit_deposit,
            net_payable_minor,
        )
    elif deposit_rate > 0:
        resolved_deposit_minor = calculate_tax_minor(
            net_payable_minor,
            deposit_rate,
        )

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
