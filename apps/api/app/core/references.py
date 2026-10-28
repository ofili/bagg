"""Generate stable-format, human-readable Bagg references."""

import secrets
import string

REFERENCE_ALPHABET = string.ascii_uppercase + string.digits


def generate_bagg_reference(document_type: str) -> str:
    """Return a reference such as BG-INV-7K4M9X2P.

    The database unique constraint remains the final collision guard.
    """
    prefixes = {
        "invoice": "BG-INV",
        "quote": "BG-QOT",
        "receipt": "BG-RCP",
        "client": "BG-CLI",
    }

    try:
        prefix = prefixes[document_type]
    except KeyError as exc:
        raise ValueError(f"Unsupported Bagg reference type: {document_type}") from exc

    suffix = "".join(secrets.choice(REFERENCE_ALPHABET) for _ in range(12))
    return f"{prefix}-{suffix}"
