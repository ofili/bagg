import pytest

from app.core.deposits import resolve_deposit_configuration


def test_new_record_without_deposit_defaults_to_none():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        is_create=True,
    )

    assert result == {
        "deposit_mode": "none",
        "deposit_percentage": None,
        "deposit_amount_minor": None,
    }


def test_new_percentage_deposit_is_calculated_from_net_payable():
    result = resolve_deposit_configuration(
        net_payable_minor=95_000,
        supplied_fields={"deposit_percentage"},
        deposit_percentage=50,
        is_create=True,
    )

    assert result == {
        "deposit_mode": "percentage",
        "deposit_percentage": 50.0,
        "deposit_amount_minor": 47_500,
    }


def test_new_fixed_deposit_is_capped_at_net_payable():
    result = resolve_deposit_configuration(
        net_payable_minor=10_000,
        supplied_fields={"deposit_amount_minor"},
        deposit_amount_minor=50_000,
        is_create=True,
    )

    assert result == {
        "deposit_mode": "fixed",
        "deposit_percentage": None,
        "deposit_amount_minor": 10_000,
    }


def test_fixed_amount_wins_when_both_values_are_supplied_without_mode():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={
            "deposit_percentage",
            "deposit_amount_minor",
        },
        deposit_percentage=50,
        deposit_amount_minor=30_000,
        is_create=True,
    )

    assert result == {
        "deposit_mode": "fixed",
        "deposit_percentage": 50.0,
        "deposit_amount_minor": 30_000,
    }


def test_explicit_percentage_mode_overrides_supplied_fixed_amount():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={
            "deposit_mode",
            "deposit_percentage",
            "deposit_amount_minor",
        },
        deposit_mode="percentage",
        deposit_percentage=25,
        deposit_amount_minor=80_000,
        is_create=True,
    )

    assert result == {
        "deposit_mode": "percentage",
        "deposit_percentage": 25.0,
        "deposit_amount_minor": 25_000,
    }


def test_explicit_fixed_mode_overrides_supplied_percentage():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={
            "deposit_mode",
            "deposit_percentage",
            "deposit_amount_minor",
        },
        deposit_mode="fixed",
        deposit_percentage=25,
        deposit_amount_minor=40_000,
        is_create=True,
    )

    assert result == {
        "deposit_mode": "fixed",
        "deposit_percentage": 25.0,
        "deposit_amount_minor": 40_000,
    }


def test_percentage_deposit_recalculates_when_net_payable_changes():
    result = resolve_deposit_configuration(
        net_payable_minor=150_000,
        existing_mode="percentage",
        existing_percentage=40,
        existing_amount_minor=40_000,
    )

    assert result == {
        "deposit_mode": "percentage",
        "deposit_percentage": 40.0,
        "deposit_amount_minor": 60_000,
    }


def test_fixed_deposit_is_preserved_when_net_payable_changes():
    result = resolve_deposit_configuration(
        net_payable_minor=150_000,
        existing_mode="fixed",
        existing_percentage=None,
        existing_amount_minor=40_000,
    )

    assert result == {
        "deposit_mode": "fixed",
        "deposit_percentage": None,
        "deposit_amount_minor": 40_000,
    }


def test_fixed_deposit_is_capped_when_net_payable_decreases():
    result = resolve_deposit_configuration(
        net_payable_minor=20_000,
        existing_mode="fixed",
        existing_amount_minor=40_000,
    )

    assert result["deposit_amount_minor"] == 20_000


def test_legacy_deposit_preserves_historical_amount():
    result = resolve_deposit_configuration(
        net_payable_minor=150_000,
        existing_mode="legacy",
        existing_percentage=50,
        existing_amount_minor=40_000,
    )

    assert result == {
        "deposit_mode": "legacy",
        "deposit_percentage": 50.0,
        "deposit_amount_minor": 40_000,
    }


def test_legacy_deposit_is_capped_when_net_payable_decreases():
    result = resolve_deposit_configuration(
        net_payable_minor=20_000,
        existing_mode="legacy",
        existing_amount_minor=40_000,
    )

    assert result["deposit_amount_minor"] == 20_000


def test_explicit_percentage_change_transitions_legacy_to_percentage():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={"deposit_percentage"},
        deposit_percentage=30,
        existing_mode="legacy",
        existing_percentage=50,
        existing_amount_minor=40_000,
    )

    assert result == {
        "deposit_mode": "percentage",
        "deposit_percentage": 30.0,
        "deposit_amount_minor": 30_000,
    }


def test_explicit_amount_change_transitions_legacy_to_fixed():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={"deposit_amount_minor"},
        deposit_amount_minor=25_000,
        existing_mode="legacy",
        existing_percentage=50,
        existing_amount_minor=40_000,
    )

    assert result == {
        "deposit_mode": "fixed",
        "deposit_percentage": 50.0,
        "deposit_amount_minor": 25_000,
    }


def test_explicit_none_clears_existing_configuration():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={"deposit_mode"},
        deposit_mode="none",
        existing_mode="percentage",
        existing_percentage=50,
        existing_amount_minor=50_000,
    )

    assert result == {
        "deposit_mode": "none",
        "deposit_percentage": None,
        "deposit_amount_minor": None,
    }


def test_omitted_deposit_fields_preserve_existing_configuration():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        existing_mode="fixed",
        existing_amount_minor=30_000,
    )

    assert result["deposit_mode"] == "fixed"
    assert result["deposit_amount_minor"] == 30_000


def test_explicitly_clearing_deposit_values_selects_none():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={
            "deposit_percentage",
            "deposit_amount_minor",
        },
        deposit_percentage=None,
        deposit_amount_minor=None,
        existing_mode="fixed",
        existing_amount_minor=30_000,
    )

    assert result == {
        "deposit_mode": "none",
        "deposit_percentage": None,
        "deposit_amount_minor": None,
    }


def test_explicit_percentage_mode_can_reuse_existing_percentage():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={"deposit_mode"},
        deposit_mode="percentage",
        existing_mode="fixed",
        existing_percentage=35,
        existing_amount_minor=20_000,
    )

    assert result["deposit_mode"] == "percentage"
    assert result["deposit_percentage"] == 35.0
    assert result["deposit_amount_minor"] == 35_000


def test_explicit_fixed_mode_can_reuse_existing_amount():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={"deposit_mode"},
        deposit_mode="fixed",
        existing_mode="percentage",
        existing_percentage=35,
        existing_amount_minor=20_000,
    )

    assert result["deposit_mode"] == "fixed"
    assert result["deposit_amount_minor"] == 20_000


@pytest.mark.parametrize(
    ("mode", "fields", "percentage", "amount"),
    [
        ("percentage", {"deposit_mode"}, None, None),
        ("fixed", {"deposit_mode"}, None, None),
        ("unsupported", {"deposit_mode"}, 50, 10_000),
    ],
)
def test_invalid_or_incomplete_explicit_modes_are_rejected(
    mode,
    fields,
    percentage,
    amount,
):
    with pytest.raises(ValueError):
        resolve_deposit_configuration(
            net_payable_minor=100_000,
            supplied_fields=fields,
            deposit_mode=mode,
            deposit_percentage=percentage,
            deposit_amount_minor=amount,
            is_create=True,
        )


@pytest.mark.parametrize(
    "net_payable",
    [-1, True, 100.5],
)
def test_invalid_net_payable_is_rejected(net_payable):
    with pytest.raises(ValueError):
        resolve_deposit_configuration(
            net_payable_minor=net_payable,
            is_create=True,
        )


def test_zero_percentage_has_no_deposit_amount():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={"deposit_percentage"},
        deposit_percentage=0,
        is_create=True,
    )

    assert result["deposit_mode"] == "percentage"
    assert result["deposit_percentage"] == 0
    assert result["deposit_amount_minor"] is None


def test_zero_fixed_amount_has_no_deposit_amount():
    result = resolve_deposit_configuration(
        net_payable_minor=100_000,
        supplied_fields={"deposit_amount_minor"},
        deposit_amount_minor=0,
        is_create=True,
    )

    assert result["deposit_mode"] == "fixed"
    assert result["deposit_amount_minor"] is None
