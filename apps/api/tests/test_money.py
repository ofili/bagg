import json
from pathlib import Path

import pytest

from app.core.money import (
    calculate_invoice_totals,
    calculate_tax_minor,
    format_money,
    get_currency_spec,
    validate_currency,
)

FIXTURES_PATH = Path(__file__).resolve().parents[3] / "fixtures" / "money-vectors.json"


def test_fixtures_file_exists():
    assert FIXTURES_PATH.exists(), f"Fixtures not found at {FIXTURES_PATH}"


def test_money_calculations_against_fixtures():
    with open(FIXTURES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    for case in data["test_cases"]:
        totals = calculate_invoice_totals(
            items=case["items"],
            discount_minor=case["discount_minor"],
            tax_percent=case["tax_percent"],
            wht_percent=case.get("wht_percent", 0.0),
            deposit_percent=case.get("deposit_percent", 0.0),
            deposit_amount_minor=case.get("deposit_amount_minor"),
        )

        expected = case["expected"]
        assert totals["subtotal_minor"] == expected["subtotal_minor"], (
            f"Failed on {case['description']}: subtotal mismatch"
        )
        assert totals["discounted_subtotal_minor"] == expected["discounted_subtotal_minor"], (
            f"Failed on {case['description']}: discounted subtotal mismatch"
        )
        assert totals["tax_minor"] == expected["tax_minor"], (
            f"Failed on {case['description']}: tax mismatch"
        )
        assert totals["total_minor"] == expected["total_minor"], (
            f"Failed on {case['description']}: total mismatch"
        )
        assert totals["wht_minor"] == expected.get("wht_minor", 0), (
            f"Failed on {case['description']}: WHT mismatch"
        )
        assert totals["net_payable_minor"] == expected.get(
            "net_payable_minor", expected["total_minor"]
        ), f"Failed on {case['description']}: net payable mismatch"
        assert totals["deposit_amount_minor"] == expected.get("deposit_amount_minor"), (
            f"Failed on {case['description']}: deposit mismatch"
        )

        formatted = format_money(totals["total_minor"], case["currency"])
        assert formatted == expected["formatted_total"], (
            f"Formatted string mismatch on {case['description']}: got {formatted}, expected {expected['formatted_total']}"
        )


@pytest.mark.parametrize(
    ("taxable_minor", "tax_percent", "expected"),
    [
        (0, 7.5, 0),
        (100, 0, 0),
        (1, 7.5, 0),
        (6, 7.5, 0),
        (20, 7.5, 2),
        (100, 7.5, 8),
        (333, 7.5, 25),
    ],
)
def test_tax_rounds_half_up_at_minor_boundaries(taxable_minor, tax_percent, expected):
    assert calculate_tax_minor(taxable_minor, tax_percent) == expected


def test_withholding_tax_reduces_net_payable():
    totals = calculate_invoice_totals(
        items=[{"quantity": 1, "unit_price_minor": 100_000}],
        discount_minor=10_000,
        tax_percent=7.5,
        wht_percent=5.0,
    )

    assert totals == {
        "subtotal_minor": 100_000,
        "discounted_subtotal_minor": 90_000,
        "tax_minor": 6_750,
        "total_minor": 96_750,
        "wht_minor": 4_500,
        "net_payable_minor": 92_250,
        "deposit_amount_minor": None,
    }


def test_deposit_percent_is_calculated_from_net_payable():
    totals = calculate_invoice_totals(
        items=[{"quantity": 1, "unit_price_minor": 100_000}],
        wht_percent=5.0,
        deposit_percent=50.0,
    )

    assert totals["net_payable_minor"] == 95_000
    assert totals["deposit_amount_minor"] == 47_500


def test_explicit_deposit_is_capped_at_net_payable():
    capped = calculate_invoice_totals(
        items=[{"quantity": 1, "unit_price_minor": 10_000}],
        deposit_amount_minor=50_000,
    )
    partial = calculate_invoice_totals(
        items=[{"quantity": 1, "unit_price_minor": 10_000}],
        deposit_amount_minor=4_000,
    )

    assert capped["deposit_amount_minor"] == 10_000
    assert partial["deposit_amount_minor"] == 4_000


def test_discount_above_subtotal_clamps_to_zero():
    totals = calculate_invoice_totals(
        items=[{"quantity": 1, "unit_price_minor": 5_000}],
        discount_minor=50_000,
        tax_percent=7.5,
        wht_percent=5.0,
    )

    assert totals["subtotal_minor"] == 5_000
    assert totals["discounted_subtotal_minor"] == 0
    assert totals["total_minor"] == 0
    assert totals["net_payable_minor"] == 0


def test_zero_valued_items_are_supported():
    totals = calculate_invoice_totals(
        items=[
            {"quantity": 0, "unit_price_minor": 25_000},
            {"quantity": 3, "unit_price_minor": 0},
        ],
        tax_percent=7.5,
        wht_percent=5.0,
        deposit_percent=50.0,
    )

    assert totals["subtotal_minor"] == 0
    assert totals["tax_minor"] == 0
    assert totals["net_payable_minor"] == 0
    assert totals["deposit_amount_minor"] == 0


@pytest.mark.parametrize(
    ("currency", "expected"),
    [
        ("NGN", "₦1,234.56"),
        ("USD", "$1,234.56"),
        ("GBP", "£1,234.56"),
        ("EUR", "€1,234.56"),
        ("GHS", "GH₵1,234.56"),
        ("KES", "KSh1,234.56"),
        ("ZAR", "R1,234.56"),
    ],
)
def test_format_money_for_every_supported_currency(currency, expected):
    assert format_money(123_456, currency) == expected


def test_currency_helpers_reject_unknown_codes():
    assert validate_currency("ngn") is True
    assert validate_currency("ABC") is False

    with pytest.raises(ValueError):
        get_currency_spec("ABC")

    with pytest.raises(ValueError):
        format_money(100, "ABC")
