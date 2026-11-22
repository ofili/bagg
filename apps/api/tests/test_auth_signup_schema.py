import pytest
from pydantic import ValidationError

from app.domains.auth.schemas import VerifyCodeRequest


def test_signup_requires_full_name():
    with pytest.raises(ValidationError):
        VerifyCodeRequest(
            email="new@example.com",
            code="123456",
            intent="signup",
        )


def test_signup_rejects_blank_full_name():
    with pytest.raises(ValidationError):
        VerifyCodeRequest(
            email="new@example.com",
            code="123456",
            full_name="   ",
            intent="signup",
        )


def test_signup_accepts_and_normalizes_full_name():
    payload = VerifyCodeRequest(
        email="new@example.com",
        code="123456",
        full_name="  Alex Okafor  ",
        intent="signup",
    )

    assert payload.full_name == "Alex Okafor"


def test_login_does_not_require_full_name():
    payload = VerifyCodeRequest(
        email="existing@example.com",
        code="123456",
        intent="login",
    )

    assert payload.full_name is None
    assert payload.intent == "login"


def test_login_does_not_require_signup_intent():
    payload = VerifyCodeRequest(
        email="existing@example.com",
        code="123456",
    )

    assert payload.intent == "login"


def test_invalid_intent_is_rejected():
    with pytest.raises(ValidationError):
        VerifyCodeRequest(
            email="existing@example.com",
            code="123456",
            intent="register",
        )
