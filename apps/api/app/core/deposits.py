from typing import AbstractSet, Any

from app.core.money import calculate_tax_minor

DEPOSIT_MODES = frozenset({"none", "percentage", "fixed", "legacy"})
DEPOSIT_INPUT_MODES = frozenset({"none", "percentage", "fixed"})

DEPOSIT_FIELDS = frozenset(
    {
        "deposit_mode",
        "deposit_percentage",
        "deposit_amount_minor",
    }
)


def _validate_net_payable(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError("net_payable_minor must be an integer.")

    if value < 0:
        raise ValueError("net_payable_minor cannot be negative.")

    return value


def _validate_deposit_amount(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError("deposit_amount_minor must be an integer.")

    if value < 0:
        raise ValueError("deposit_amount_minor cannot be negative.")

    return value


def _validate_deposit_percentage(value: Any) -> float:
    # calculate_tax_minor performs the canonical percentage validation.
    calculate_tax_minor(0, value)
    return float(value)


def resolve_deposit_configuration(
    *,
    net_payable_minor: int,
    supplied_fields: AbstractSet[str] | None = None,
    deposit_mode: str | None = None,
    deposit_percentage: float | None = None,
    deposit_amount_minor: int | None = None,
    existing_mode: str | None = None,
    existing_percentage: float | None = None,
    existing_amount_minor: int | None = None,
    is_create: bool = False,
) -> dict[str, Any]:
    """
    Resolve deposit configuration and calculate its amount.

    supplied_fields must contain the names of fields explicitly supplied
    by the request, normally payload.model_fields_set.

    Modes:
        none:
            No deposit is configured.

        percentage:
            Calculate the deposit from the current net payable.

        fixed:
            Preserve the explicit amount, capped at net payable.

        legacy:
            Preserve the historical amount, capped at net payable.
            Historical percentage values are retained as metadata but
            are not used to recalculate the amount.

    When no mode is explicitly supplied:
        - A supplied non-null amount selects fixed mode.
        - Otherwise, a supplied non-null percentage selects percentage mode.
        - Explicitly clearing both deposit values selects none.
        - No deposit fields supplied on update preserves the existing mode.
        - A new record without deposit configuration defaults to none.

    An explicit mode takes precedence over inferred mode.
    """

    net_payable = _validate_net_payable(net_payable_minor)
    fields = set(supplied_fields or set())

    # Ignore unrelated fields if the caller passes the complete
    # model_fields_set from a larger request schema.
    fields.intersection_update(DEPOSIT_FIELDS)

    mode_was_supplied = "deposit_mode" in fields and deposit_mode is not None
    percentage_was_supplied = "deposit_percentage" in fields
    amount_was_supplied = "deposit_amount_minor" in fields

    if mode_was_supplied:
        if deposit_mode not in DEPOSIT_INPUT_MODES:
            raise ValueError("Unsupported deposit mode.")
        mode = deposit_mode

    elif amount_was_supplied or percentage_was_supplied:
        if deposit_amount_minor is not None:
            mode = "fixed"
        elif deposit_percentage is not None:
            mode = "percentage"
        else:
            mode = "none"

    elif is_create:
        mode = "none"

    else:
        mode = existing_mode or "legacy"

        if mode not in DEPOSIT_MODES:
            raise ValueError(f"Unsupported existing deposit mode: {mode}")

    if mode == "none":
        return {
            "deposit_mode": "none",
            "deposit_percentage": None,
            "deposit_amount_minor": None,
        }

    if mode == "percentage":
        percentage = (
            deposit_percentage if percentage_was_supplied else existing_percentage
        )

        if percentage is None:
            raise ValueError("A percentage is required for percentage deposit mode.")

        percentage = _validate_deposit_percentage(percentage)

        amount = (
            calculate_tax_minor(net_payable, percentage) if percentage > 0 else None
        )

        return {
            "deposit_mode": "percentage",
            "deposit_percentage": percentage,
            "deposit_amount_minor": amount,
        }

    if mode == "fixed":
        amount = deposit_amount_minor if amount_was_supplied else existing_amount_minor

        if amount is None:
            raise ValueError("An amount is required for fixed deposit mode.")

        amount = _validate_deposit_amount(amount)

        percentage = (
            deposit_percentage if percentage_was_supplied else existing_percentage
        )

        if percentage is not None:
            percentage = _validate_deposit_percentage(percentage)

        return {
            "deposit_mode": "fixed",
            "deposit_percentage": percentage,
            "deposit_amount_minor": (min(amount, net_payable) if amount > 0 else None),
        }

    # Legacy records retain their original amount. The stored percentage
    # is metadata only because its original calculation intent is unknown.
    if mode == "legacy":
        amount = existing_amount_minor

        if amount is not None:
            amount = _validate_deposit_amount(amount)
            amount = min(amount, net_payable) if amount > 0 else None

        percentage = existing_percentage

        if percentage is not None:
            percentage = _validate_deposit_percentage(percentage)

        return {
            "deposit_mode": "legacy",
            "deposit_percentage": percentage,
            "deposit_amount_minor": amount,
        }

    raise ValueError(f"Unsupported deposit mode: {mode}")
