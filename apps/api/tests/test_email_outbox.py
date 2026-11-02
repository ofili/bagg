import pytest

from app.integrations.email_outbox import (
    encrypt_email_payload,
    decrypt_email_payload,
)


def test_payload_round_trip():
    payload = {
        "to_email": "test@example.com",
        "subject": "Your sign-in code",
        "html": "<p>123456</p>",
    }

    encrypted = encrypt_email_payload(
        "eml_test",
        "login_otp",
        payload,
    )

    assert "123456" not in encrypted
    assert "test@example.com" not in encrypted

    decrypted = decrypt_email_payload(
        "eml_test",
        "login_otp",
        encrypted,
    )

    assert decrypted == payload


def test_payload_cannot_be_decrypted_for_another_message():
    encrypted = encrypt_email_payload(
        "eml_test",
        "login_otp",
        {"subject": "Test"},
    )

    with pytest.raises(ValueError):
        decrypt_email_payload(
            "eml_another",
            "login_otp",
            encrypted,
        )


def test_payload_cannot_be_decrypted_for_another_type():
    encrypted = encrypt_email_payload(
        "eml_test",
        "login_otp",
        {"subject": "Test"},
    )

    with pytest.raises(ValueError):
        decrypt_email_payload(
            "eml_test",
            "invoice",
            encrypted,
        )
