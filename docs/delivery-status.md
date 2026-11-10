# Document delivery status

`invoices.email_delivery_status` and `quotes.email_delivery_status` share one
contract, defined by `app.domains.documents.delivery.DocumentDeliveryStatus`.

| Value | Meaning |
|---|---|
| `NULL` | Never dispatched, or reset by recall/revision. |
| `queued` | An outbox message is pending, processing, or awaiting a retry. |
| `delivered` | The provider accepted the latest outbox message. This is provider acceptance, not a read receipt. |
| `failed` | The latest outbox message failed permanently or exhausted its retries. Any metered deduction for that message is refunded with reason `send_refund`. |
| `no_email` | Email was requested but the client has no email address. The document is not marked sent by email. |
| `link_shared` | A link/WhatsApp hand-off was recorded. No email was attempted. |

`bounced` and `opened` are reserved for a future provider webhook and are not
emitted by the current worker.

## Transitions

- Dispatch with an email address: `NULL`/terminal state -> `queued`.
- Worker accepted: `queued` -> `delivered`.
- Worker terminal failure: `queued` -> `failed` (and refund if metered).
- Worker retryable failure: stays `queued`.
- Dispatch without an email address: -> `no_email`.
- Link/WhatsApp hand-off: -> `link_shared`.
- Invoice recall or quote revision: -> `NULL`; pending outbox messages are
  superseded.

## Metering references

- Email deduction: outbox message ID.
- Email refund: outbox message ID, reason `send_refund`.
- Invoice link share: `link_share:{invoice_id}:{issuance_generation}`.
- Quote link share: `link_share:{quote_id}:{version}`.

The ledger deduplicates on `(workspace_id, reason, reference)`, so retries of
the same dispatch cannot double-charge.
