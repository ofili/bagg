import Link from 'next/link';
import { CheckCircle2, ExternalLink, ReceiptText, ShieldCheck } from 'lucide-react';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { StatusPill } from './StatusPill';

export interface ReceiptInfo {
  id?: string;
  receipt_number?: string;
  amount_paid_minor: number;
  balance_remaining_minor?: number;
  payment_date?: string;
  payment_method?: string;
  reference?: string | null;
  confirmation_source?: string;
  provider?: string | null;
  verification_code?: string;
  share_token?: string | null;
}

export function ConfirmationProvenance({
  source,
  provider,
}: {
  source?: string;
  provider?: string | null;
}) {
  const copy: Record<string, string> = {
    issuer_manual: 'Confirmed by the issuer after the funds arrived',
    issuer_claim_review: 'Confirmed by the issuer after reviewing the payment claim',
    webhook_paystack: 'Confirmed automatically by Paystack',
    legacy: 'Recorded before confirmation tracking was enabled',
  };
  const label = copy[source || 'legacy'] || 'Confirmed payment';

  return (
    <span className="inline-flex items-center gap-1.5 text-caption text-text-soft">
      <ShieldCheck aria-hidden className="h-3.5 w-3.5 shrink-0" />
      {label}
      {provider ? ` · ${provider}` : ''}
    </span>
  );
}

/** The one place a "paid" stamp is allowed: a receipt. */
export function ReceiptStub({
  receipt,
  currency,
  href,
  compact = false,
}: {
  receipt: ReceiptInfo;
  currency: string;
  href?: string;
  compact?: boolean;
}) {
  const detailHref = href || (receipt.share_token ? `/r/${receipt.share_token}` : undefined);

  return (
    <div className={cn('space-y-3 rounded-card border border-line bg-surface', compact ? 'p-3' : 'p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf text-[#052E1B]"
          >
            <ReceiptText className="h-4 w-4" />
          </span>
          <div>
            <p className="text-caption text-text-muted">Official receipt</p>
            <p className="text-body font-extrabold">{receipt.receipt_number || 'Payment confirmed'}</p>
          </div>
        </div>
        <StatusPill status="paid" />
      </div>

      <div className="flex items-end justify-between gap-3 border-t border-dashed border-line pt-3">
        <div>
          <p className="text-caption text-text-muted">Amount received</p>
          <Money amountMinor={receipt.amount_paid_minor} currency={currency} variant="paid" className="text-amount-m" />
        </div>
        <div className="text-right text-caption text-text-soft">
          {receipt.payment_date && <p>{formatDate(receipt.payment_date)}</p>}
          {receipt.verification_code && <p className="tabular">{receipt.verification_code}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ConfirmationProvenance source={receipt.confirmation_source} provider={receipt.provider} />
        {detailHref && (
          <Link
            href={detailHref}
            className="inline-flex min-h-11 items-center gap-1 text-body font-extrabold text-link underline underline-offset-4 hover:no-underline"
          >
            View receipt <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function PaymentProgress({
  totalMinor,
  paidMinor,
  currency,
}: {
  totalMinor: number;
  paidMinor: number;
  currency: string;
}) {
  const safeTotal = Math.max(totalMinor, 1);
  const percentage = Math.min(100, Math.round((paidMinor / safeTotal) * 100));
  const remaining = Math.max(0, totalMinor - paidMinor);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-body">
        <span className="text-text-soft">
          <Money amountMinor={paidMinor} currency={currency} variant="inherit" hideCurrencyCode /> paid
        </span>
        <span className="font-extrabold">
          <Money amountMinor={remaining} currency={currency} variant="inherit" hideCurrencyCode /> outstanding
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Share of the invoice paid"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-2.5 overflow-hidden rounded-full border border-ink bg-surface-tint"
      >
        <div className="h-full bg-leaf" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function AmountBand({
  totalMinor,
  paidMinor = 0,
  currency,
  status,
  paymentState,
  receipt,
  receiptHref,
  dueDate,
  isOverdue = false,
  daysOverdue = 0,
  label,
  compact = false,
}: {
  totalMinor: number;
  paidMinor?: number;
  currency: string;
  status?: string | null;
  paymentState?: string;
  receipt?: ReceiptInfo | null;
  receiptHref?: string;
  dueDate?: string | null;
  isOverdue?: boolean;
  daysOverdue?: number;
  label?: string;
  compact?: boolean;
}) {
  const isPaid = status === 'paid' || paymentState === 'paid';

  if (isPaid) {
    return (
      <ReceiptStub
        receipt={
          receipt || {
            amount_paid_minor: Math.max(paidMinor, totalMinor),
            balance_remaining_minor: 0,
            confirmation_source: 'issuer_manual',
          }
        }
        currency={currency}
        href={receiptHref}
        compact={compact}
      />
    );
  }

  const outstanding = Math.max(0, totalMinor - paidMinor);
  const isPartial = paidMinor > 0;

  return (
    <div className={cn('rounded-card border border-line-subtle bg-surface', compact ? 'p-3' : 'p-4')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption text-text-muted">{label || (isPartial ? 'Balance outstanding' : 'Amount due')}</p>
          <Money
            amountMinor={isPartial ? outstanding : totalMinor}
            currency={currency}
            className="text-amount-m"
          />
          {isPartial && (
            <p className="text-caption text-text-muted">
              of <Money amountMinor={totalMinor} currency={currency} variant="muted" hideCurrencyCode /> total
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill
            status={paymentState === 'processing' ? 'processing' : status}
            pulse={status === 'payment_claimed'}
          />
          {isOverdue ? (
            <span className="text-caption font-extrabold text-danger dark:text-[#FFB3A8]">
              {daysOverdue > 0 ? `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} late` : 'Past due'}
            </span>
          ) : dueDate ? (
            <span className="text-caption text-text-muted">Due {formatDate(dueDate)}</span>
          ) : null}
        </div>
      </div>

      {isPartial && (
        <div className="mt-3">
          <PaymentProgress totalMinor={totalMinor} paidMinor={paidMinor} currency={currency} />
        </div>
      )}

      {paymentState === 'awaiting_confirmation' && (
        <p className="mt-3 flex items-start gap-2 rounded-row bg-peach p-3 text-body">
          <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          The client says they have paid. Confirm the funds before this becomes a receipt.
        </p>
      )}

      {paymentState === 'processing' && (
        <p className="mt-3 flex items-start gap-2 rounded-row bg-peach p-3 text-body">
          <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          Payment is processing. We will confirm it when the gateway webhook arrives.
        </p>
      )}
    </div>
  );
}
