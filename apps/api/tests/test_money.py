import json
from pathlib import Path
from app.core.money import calculate_invoice_totals, format_money

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
            tax_percent=case["tax_percent"]
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

        formatted = format_money(totals["total_minor"], case["currency"])
        assert formatted == expected["formatted_total"], (
            f"Formatted string mismatch on {case['description']}: got {formatted}, expected {expected['formatted_total']}"
        )
