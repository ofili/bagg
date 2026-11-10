"""Document email delivery status contract.

The value is stored on the invoice/quote row and reflects the latest
dispatch attempt for that document issuance:

- ``None``       Never dispatched, or reset by recall/revision.
- ``queued``     An outbox message is pending, processing, or awaiting retry.
- ``delivered``  The provider accepted the latest outbox message. This is
                 provider acceptance, not a read receipt.
- ``failed``     The latest outbox message failed permanently (or exhausted
                 its retries). Any metered deduction for that message is
                 refunded with reason ``send_refund``.
- ``no_email``   Email was requested but the client has no email address.
- ``link_shared`` A link/WhatsApp hand-off was recorded; no email was sent.

``bounced`` and ``opened`` are reserved for a future provider webhook and are
not emitted by the current worker.
"""

from enum import StrEnum


class DocumentDeliveryStatus(StrEnum):
    QUEUED = "queued"
    DELIVERED = "delivered"
    FAILED = "failed"
    NO_EMAIL = "no_email"
    LINK_SHARED = "link_shared"
