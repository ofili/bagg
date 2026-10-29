from datetime import datetime, timezone
import pytest
from app.domains.notifications.models import Notification
from app.domains.notifications.schemas import NotificationResponse, UnreadCountResponse
from app.domains.notifications.service import NotificationService
from app.main import app


def test_notification_routes_registered():
    paths = app.openapi()["paths"]
    assert "/notifications" in paths
    assert "/notifications/unread-count" in paths
    assert "/notifications/{id}/read" in paths
    assert "/notifications/read-all" in paths


def test_notification_response_schema():
    now = datetime.now(timezone.utc)
    data = {
        "id": "ntf_test123",
        "workspace_id": "ws_123",
        "recipient_user_id": "usr_123",
        "type": "client_comment",
        "title": "New question on invoice INV-001",
        "body": "Client asked about deliverable scope.",
        "document_type": "invoice",
        "document_id": "inv_123",
        "document_number": "INV-001",
        "comment_id": "cmt_123",
        "link_url": "/invoices/inv_123#comments",
        "read_at": None,
        "created_at": now,
    }
    resp = NotificationResponse.model_validate(data)
    assert resp.id == "ntf_test123"
    assert resp.document_type == "invoice"
    assert resp.read_at is None


def test_unread_count_schema():
    resp = UnreadCountResponse(unread_count=5)
    assert resp.unread_count == 5


def test_invoice_and_quote_comment_routes_registered():
    paths = app.openapi()["paths"]
    assert "/invoices/{id}/comments" in paths
    assert "/quotes/{id}/comments" in paths


@pytest.mark.parametrize("event_type,doc_type,title", [
    ("quote_accepted", "quote", "Quote Q-001 was accepted!"),
    ("quote_declined", "quote", "Quote Q-001 was declined"),
    ("quote_review_requested", "quote", "Changes requested on quote Q-001"),
    ("quote_viewed", "quote", "Quote Q-001 was viewed"),
    ("payment_claimed", "invoice", "Payment claimed on invoice INV-001"),
    ("invoice_paid", "invoice", "Invoice INV-001 is fully paid!"),
    ("payment_received", "invoice", "Payment received for invoice INV-001"),
    ("invoice_viewed", "invoice", "Invoice INV-001 was viewed"),
])
def test_state_change_notifications_schema(event_type, doc_type, title):
    now = datetime.now(timezone.utc)
    data = {
        "id": f"ntf_{event_type}",
        "workspace_id": "ws_123",
        "recipient_user_id": "usr_123",
        "type": event_type,
        "title": title,
        "body": f"Details for {event_type}",
        "document_type": doc_type,
        "document_id": "doc_123",
        "document_number": "DOC-001",
        "comment_id": None,
        "link_url": f"/{doc_type}s/doc_123",
        "read_at": None,
        "created_at": now,
    }
    resp = NotificationResponse.model_validate(data)
    assert resp.type == event_type
    assert resp.document_type == doc_type
    assert resp.title == title
