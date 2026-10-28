interface ConfirmationProvenanceProps {
  source?: string | null;
  provider?: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  issuer_claim_review: 'Confirmed by you after claim review',
  issuer_manual: 'Payment confirmed by you',
  webhook_paystack: 'Payment confirmed by Paystack',
  system: 'System confirmation',
};

export function ConfirmationProvenance({
  source,
  provider,
}: ConfirmationProvenanceProps) {
  const label = source
    ? SOURCE_LABELS[source] ?? source.replaceAll('_', ' ')
    : 'Confirmation source unavailable';

  return (
    <div className="space-y-1">
      <p className="text-body font-medium">{label}</p>
      {provider && (
        <p className="text-caption text-text-muted">
          Provider: {provider}
        </p>
      )}
    </div>
  );
}