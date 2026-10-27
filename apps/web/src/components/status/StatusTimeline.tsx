import { StatusPill } from './StatusPill';

export interface StatusEvent {
  id: string;
  from_status?: string | null;
  to_status: string;
  actor_type: string;
  source: string;
  created_at: string;
  event_metadata?: Record<string, unknown> | null;
}

const SOURCE_LABELS: Record<string, string> = {
  issuer_send: 'Sent by you',
  client_view: 'Viewed by the client',
  client_payment_claim: 'Client submitted a payment claim',
  issuer_claim_review: 'Confirmed by you after claim review',
  issuer_claim_rejected: 'Claim rejected by you',
  issuer_manual: 'Payment confirmed by you',
  webhook_paystack: 'Payment confirmed by Paystack',
  client_accept: 'Accepted by the client',
  client_decline: 'Declined by the client',
  issuer_convert: 'Converted to an invoice by you',
  system: 'System update',
};

export function StatusTimeline({ events }: { events: StatusEvent[] }) {
  if (!events.length) {
    return (
      <p className="text-body text-text-soft">
        No status history yet. It will appear as this document moves through your workflow.
      </p>
    );
  }

  return (
    <ol className="space-y-1">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <span aria-hidden className="mt-2 h-2.5 w-2.5 rounded-full bg-ink" />
            {index < events.length - 1 && <span aria-hidden className="mt-1 w-px flex-1 bg-line" />}
          </div>
          <div className="min-w-0 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={event.to_status} />
              <span className="text-caption text-text-muted">{formatWhen(event.created_at)}</span>
            </div>
            <p className="mt-1 text-body text-text-soft">
              {SOURCE_LABELS[event.source] || event.source.replaceAll('_', ' ')}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function formatWhen(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
