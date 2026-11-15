from urllib.parse import urlsplit


def _clean(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def payment_profile_methods(values: object) -> list[str]:
    """
    Return the usable payment methods represented by a profile.

    `values` may be a dictionary, Pydantic model or SQLAlchemy model.
    Incomplete structured methods are rejected rather than silently
    presenting partial payment instructions to clients.
    """
    if isinstance(values, dict):
        get_value = values.get
    else:
        get_value = lambda key, default=None: getattr(values, key, default)

    bank_name = _clean(get_value("bank_name"))
    account_name = _clean(get_value("account_name"))
    account_number = _clean(get_value("account_number"))
    payment_link = _clean(get_value("payment_link"))
    mobile_money_number = _clean(get_value("mobile_money_number"))
    instructions = _clean(get_value("instructions"))

    bank_started = any((bank_name, account_number))
    bank_complete = all((bank_name, account_name, account_number))

    if bank_started and not bank_complete:
        raise ValueError(
            "Bank transfer details require bank name, account name "
            "and account number."
        )

    mobile_started = bool(mobile_money_number)
    mobile_complete = bool(mobile_money_number and account_name)

    if mobile_started and not mobile_complete:
        raise ValueError(
            "Mobile money details require both account name " "and mobile money number."
        )

    methods: list[str] = []

    if bank_complete:
        methods.append("bank_transfer")

    if payment_link:
        parsed = urlsplit(payment_link)

        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or not parsed.hostname
        ):
            raise ValueError("Payment link must be a valid HTTP or HTTPS URL.")

        methods.append("payment_link")

    if mobile_complete:
        methods.append("mobile_money")

    if not methods and instructions:
        methods.append("instructions")

    if not methods:
        raise ValueError(
            "Add complete bank details, a payment link, mobile money "
            "details or payment instructions before saving."
        )

    return methods


def is_payment_profile_usable(values: object) -> bool:
    try:
        return bool(payment_profile_methods(values))
    except (TypeError, ValueError):
        return False
