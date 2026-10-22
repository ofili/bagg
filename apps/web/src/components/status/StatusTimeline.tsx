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
      <p className="text-xs text-neutral-500">
        No status history yet. It will appear as this document moves through your workflow.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
            {index < events.length - 1 ? (
              <span className="mt-1 h-full w-px flex-1 bg-neutral-200" />
            ) : null}
          </div>
          <div className="pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={event.to_status} />
              <span className="text-[11px] text-neutral-400">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-600">
              {SOURCE_LABELS[event.source] || event.source.replaceAll('_', ' ')}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
