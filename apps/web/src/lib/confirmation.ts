const CONFIRMATION_LABELS: Record<string, string> = {
  issuer_manual: 'issuer confirmation',
  issuer_claim_review: 'issuer claim review',
  webhook_paystack: 'Paystack webhook',
  legacy: 'legacy record',
};

export function confirmationLabel(source?: string | null) {
  if (!source) return 'recorded payment';
  return CONFIRMATION_LABELS[source] ?? 'recorded payment';
}
