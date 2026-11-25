from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app.core.errors import BadRequestException
from app.domains.lifecycle.service import (
    DOCUMENT_STATUSES,
    INVOICE_TRANSITIONS,
    QUOTE_TRANSITIONS,
    can_transition,
    canonical_document_status,
    effective_invoice_status,
    effective_quote_status,
    invoice_is_overdue,
    record_status_event,
    transition_document,
    user_facing_invoice_status,
)


def make_document(
    *,
    document_id="doc_123",
    workspace_id="ws_123",
    status="draft",
    **values,
):
    return SimpleNamespace(
        id=document_id,
        workspace_id=workspace_id,
        status=status,
        **values,
    )


def test_canonical_status_sets_are_explicit():
    assert DOCUMENT_STATUSES["invoice"] == {
        "draft",
        "issued",
        "sent",
        "viewed",
        "payment_claimed",
        "partially_paid",
        "paid",
        "cancelled",
        "voided",
    }

    assert DOCUMENT_STATUSES["quote"] == {
        "draft",
        "issued",
        "sent",
        "viewed",
        "review_requested",
        "accepted",
        "declined",
        "converted",
        "cancelled",
    }


def test_overdue_and_expired_are_not_persisted_statuses():
    assert "overdue" not in DOCUMENT_STATUSES["invoice"]
    assert "expired" not in DOCUMENT_STATUSES["quote"]


def test_invoice_void_legacy_alias_is_normalised():
    assert canonical_document_status("invoice", "void") == "voided"
    assert canonical_document_status("invoice", "voided") == "voided"


def test_unknown_document_type_is_rejected():
    with pytest.raises(BadRequestException):
        can_transition("receipt", "draft", "issued")


def test_unknown_invoice_status_is_rejected():
    with pytest.raises(BadRequestException):
        canonical_document_status("invoice", "overdue")


def test_unknown_quote_status_is_rejected():
    with pytest.raises(BadRequestException):
        canonical_document_status("quote", "expired")


def test_invoice_transitions_use_canonical_voided_status():
    assert "voided" in INVOICE_TRANSITIONS["draft"]
    assert "void" not in INVOICE_TRANSITIONS["draft"]


def test_quote_cancelled_status_is_supported():
    assert "cancelled" in DOCUMENT_STATUSES["quote"]
    assert "cancelled" in QUOTE_TRANSITIONS["draft"]


@pytest.mark.parametrize(
    ("document_type", "source", "target"),
    [
        ("invoice", "draft", "issued"),
        ("invoice", "issued", "sent"),
        ("invoice", "sent", "viewed"),
        ("invoice", "viewed", "payment_claimed"),
        ("invoice", "payment_claimed", "partially_paid"),
        ("invoice", "partially_paid", "paid"),
        ("quote", "draft", "issued"),
        ("quote", "issued", "sent"),
        ("quote", "sent", "viewed"),
        ("quote", "viewed", "accepted"),
        ("quote", "accepted", "converted"),
        ("quote", "viewed", "declined"),
        ("quote", "draft", "cancelled"),
    ],
)
def test_valid_transitions(document_type, source, target):
    assert can_transition(document_type, source, target)


@pytest.mark.parametrize(
    ("document_type", "source", "target"),
    [
        ("invoice", "draft", "paid"),
        ("invoice", "paid", "cancelled"),
        ("invoice", "cancelled", "issued"),
        ("invoice", "voided", "issued"),
        ("quote", "draft", "accepted"),
        ("quote", "declined", "accepted"),
        ("quote", "converted", "draft"),
        ("quote", "cancelled", "issued"),
    ],
)
def test_invalid_transitions(document_type, source, target):
    assert not can_transition(document_type, source, target)


def test_payment_claim_can_restore_previous_invoice_state():
    assert can_transition("invoice", "payment_claimed", "issued")
    assert can_transition("invoice", "payment_claimed", "sent")
    assert can_transition("invoice", "payment_claimed", "viewed")


@pytest.mark.parametrize(
    "target",
    ["issued", "sent", "viewed", "partially_paid", "draft"],
)
def test_paid_invoice_cannot_be_reopened_by_generic_transition(target):
    assert not can_transition("invoice", "paid", target)


@pytest.mark.parametrize(
    "target",
    ["issued", "sent", "viewed", "partially_paid"],
)
def test_transition_document_rejects_generic_paid_invoice_reopening(target):
    db = Mock()
    invoice = make_document(
        status="paid",
        amount_paid_minor=100_000,
        total_minor=100_000,
        net_payable_minor=100_000,
    )

    with pytest.raises(BadRequestException):
        transition_document(
            db,
            document=invoice,
            document_type="invoice",
            to_status=target,
        )

    assert invoice.status == "paid"
    db.add.assert_not_called()


def test_transition_document_mutates_and_records_event_without_commit():
    db = Mock()
    invoice = make_document(status="draft")

    event = transition_document(
        db,
        document=invoice,
        document_type="invoice",
        to_status="issued",
        actor_type="issuer",
        actor_id="user_123",
        source="invoice_finalized",
        metadata={"generation": 1},
    )

    assert invoice.status == "issued"
    assert event.document_type == "invoice"
    assert event.document_id == invoice.id
    assert event.workspace_id == invoice.workspace_id
    assert event.from_status == "draft"
    assert event.to_status == "issued"
    assert event.actor_type == "issuer"
    assert event.actor_id == "user_123"
    assert event.source == "invoice_finalized"
    assert event.event_metadata == {"generation": 1}

    db.add.assert_called_once_with(event)
    db.commit.assert_not_called()
    db.flush.assert_not_called()


def test_transition_document_rejects_invalid_transition_without_mutation():
    db = Mock()
    invoice = make_document(status="draft")

    with pytest.raises(BadRequestException):
        transition_document(
            db,
            document=invoice,
            document_type="invoice",
            to_status="paid",
        )

    assert invoice.status == "draft"
    db.add.assert_not_called()
    db.commit.assert_not_called()


def test_transition_document_rejects_same_status():
    db = Mock()
    invoice = make_document(status="issued")

    with pytest.raises(BadRequestException):
        transition_document(
            db,
            document=invoice,
            document_type="invoice",
            to_status="issued",
        )

    assert invoice.status == "issued"
    db.add.assert_not_called()


def test_transition_document_normalises_legacy_invoice_void():
    db = Mock()
    invoice = make_document(status="void")

    with pytest.raises(BadRequestException):
        transition_document(
            db,
            document=invoice,
            document_type="invoice",
            to_status="issued",
        )

    # The transition is rejected because voided is terminal.
    assert invoice.status == "void"


def test_record_status_event_allows_same_status_observation():
    db = Mock()

    event = record_status_event(
        db=db,
        workspace_id="ws_123",
        document_type="invoice",
        document_id="inv_123",
        from_status="paid",
        to_status="paid",
        source="client_view",
    )

    assert event.from_status == "paid"
    assert event.to_status == "paid"
    assert event.source == "client_view"
    db.add.assert_called_once_with(event)
    db.commit.assert_not_called()


def test_record_status_event_normalises_legacy_status():
    db = Mock()

    event = record_status_event(
        db=db,
        workspace_id="ws_123",
        document_type="invoice",
        document_id="inv_123",
        from_status="void",
        to_status="void",
        source="legacy_observation",
    )

    assert event.from_status == "voided"
    assert event.to_status == "voided"


def test_record_status_event_rejects_unknown_document_type():
    db = Mock()

    with pytest.raises(BadRequestException):
        record_status_event(
            db=db,
            workspace_id="ws_123",
            document_type="receipt",
            document_id="rcp_123",
            from_status=None,
            to_status="issued",
        )

    db.add.assert_not_called()


def test_invoice_overdue_is_computed_not_persisted():
    invoice = make_document(
        status="sent",
        due_date=date(2026, 1, 1),
        total_minor=100_000,
        net_payable_minor=100_000,
        amount_paid_minor=0,
    )

    assert invoice_is_overdue(invoice, date(2026, 1, 10))
    assert effective_invoice_status(invoice, date(2026, 1, 10)) == "overdue"
    assert user_facing_invoice_status(invoice, date(2026, 1, 10)) == "Overdue"


def test_voided_invoice_is_not_overdue():
    invoice = make_document(
        status="voided",
        due_date=date(2026, 1, 1),
        total_minor=100_000,
        net_payable_minor=100_000,
        amount_paid_minor=0,
    )

    assert not invoice_is_overdue(invoice, date(2026, 1, 10))


def test_legacy_void_invoice_is_not_overdue():
    invoice = make_document(
        status="void",
        due_date=date(2026, 1, 1),
        total_minor=100_000,
        net_payable_minor=100_000,
        amount_paid_minor=0,
    )

    assert not invoice_is_overdue(invoice, date(2026, 1, 10))


def test_cancelled_quote_is_not_effectively_expired():
    quote = make_document(
        status="cancelled",
        expires_at=date(2026, 1, 1),
    )

    assert effective_quote_status(quote, date(2026, 1, 10)) == "cancelled"
