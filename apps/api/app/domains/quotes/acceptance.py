"""Evidence captured when a client accepts a quote.

A click on "Accept" is only useful in a dispute if it can be shown *what* was
accepted, *by whom*, *when* and *from where*. This module builds a canonical
snapshot of the terms the client saw, hashes it, and records the consent
statement shown at the time.

The snapshot is stored with the quote, so the hash can be re-checked later
without depending on the live (and possibly since-edited) quote row.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any, Optional

CONSENT_TEXT_VERSION = "quote-acceptance-v1"
CONSENT_TEXT = (
    "I have read this quote and agree to its terms, including the price, scope, "
    "payment terms and any reimbursable-expense terms."
)
SNAPSHOT_SCHEMA_VERSION = 1

_MAX_USER_AGENT_LENGTH = 512


@dataclass(frozen=True)
class AcceptanceContext:
    """Request details recorded alongside an acceptance."""

    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    def clean_user_agent(self) -> Optional[str]:
        if not self.user_agent:
            return None
        return self.user_agent.strip()[:_MAX_USER_AGENT_LENGTH] or None


def build_terms_snapshot(quote: Any, client_name: Optional[str], workspace: Any) -> dict:
    """Canonical, JSON-serialisable record of the terms being accepted."""
    return {
        "schema_version": SNAPSHOT_SCHEMA_VERSION,
        "quote_number": quote.quote_number,
        "version": quote.version,
        "issued_by": {
            "business_name": workspace.business_name,
            "tax_id": workspace.tax_id,
            "address": workspace.address,
        },
        "prepared_for": client_name,
        "currency": quote.currency,
        "issue_date": quote.issue_date.isoformat() if quote.issue_date else None,
        "expires_at": quote.expires_at.isoformat() if quote.expires_at else None,
        "items": [
            {
                "position": item.position,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price_minor": item.unit_price_minor,
                "total_minor": item.total_minor,
            }
            for item in sorted(quote.items, key=lambda i: i.position)
        ],
        "subtotal_minor": quote.subtotal_minor,
        "discount_minor": quote.discount_minor,
        "tax_rate_percent": quote.tax_rate_percent,
        "tax_minor": quote.tax_minor,
        "total_minor": quote.total_minor,
        "wht_rate_percent": quote.wht_rate_percent,
        "wht_minor": quote.wht_minor,
        "net_payable_minor": quote.net_payable_minor,
        "deposit_percentage": quote.deposit_percentage,
        "deposit_amount_minor": quote.deposit_amount_minor,
        "expense_policy": quote.expense_policy if quote.has_expense_policy else None,
        "notes": quote.notes,
    }


def hash_terms_snapshot(snapshot: dict) -> str:
    """SHA-256 over a canonical encoding (sorted keys, no whitespace, UTF-8)."""
    canonical = json.dumps(
        snapshot, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def verify_terms_hash(snapshot: Optional[dict], expected_hash: Optional[str]) -> Optional[bool]:
    """True/False if the stored snapshot still matches its hash; None if no evidence was stored."""
    if not snapshot or not expected_hash:
        return None
    return hmac.compare_digest(hash_terms_snapshot(snapshot), expected_hash)
