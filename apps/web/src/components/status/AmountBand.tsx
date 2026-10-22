import Link from 'next/link';
import { CheckCircle2, ExternalLink, ReceiptText, ShieldCheck } from 'lucide-react';
import { formatMoney } from '@/lib/money';
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
    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500">
      <ShieldCheck className="h-3 w-3 text-emerald-600" />
      {label}
      {provider ? ` - ${provider}` : ''}
    </span>
  );
}

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
    <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/70">
      <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-emerald-300 bg-white" />
      <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-emerald-300 bg-white" />
      <div className={`flex flex-col gap-3 ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
              <ReceiptText className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                Official receipt
              </div>
              <div className="text-xs font-semibold text-emerald-950">
                {receipt.receipt_number || 'Payment confirmed'}
              </div>
            </div>
          </div>
          <StatusPill status="paid" />
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-dashed border-emerald-300 pt-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Amount received
            </div>
            <div className="text-lg font-black tracking-tight text-emerald-950">
              {formatMoney(receipt.amount_paid_minor, currency)}
            </div>
          </div>
          <div className="text-right text-[11px] text-emerald-800">
            {receipt.payment_date ? <div>{receipt.payment_date}</div> : null}
            {receipt.verification_code ? (
              <div className="font-mono text-[10px]">{receipt.verification_code}</div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <ConfirmationProvenance source={receipt.confirmation_source} provider={receipt.provider} />
          {detailHref ? (
            <Link
              href={detailHref}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
            >
              View receipt <ExternalLink className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
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
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-neutral-500">
          {formatMoney(paidMinor, currency)} paid
        </span>
        <span className="font-semibold text-neutral-700">
          {formatMoney(remaining, currency)} outstanding
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
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
    <div
      className={`rounded-xl border bg-white ${compact ? 'p-3' : 'p-4'} ${
        isOverdue ? 'border-red-200' : 'border-neutral-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
            {label || (isPartial ? 'Balance outstanding' : 'Amount due')}
          </div>
          <div className="mt-0.5 text-lg font-black tracking-tight text-neutral-950">
            {formatMoney(isPartial ? outstanding : totalMinor, currency)}
          </div>
          {isPartial ? (
            <div className="text-[11px] text-neutral-500">
              of {formatMoney(totalMinor, currency)} total
            </div>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill
            status={paymentState === 'processing' ? 'processing' : status}
            pulse={status === 'payment_claimed'}
          />
          {isOverdue ? (
            <span className="text-[10px] font-semibold text-red-600">
              {daysOverdue > 0 ? `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} late` : 'Past due'}
            </span>
          ) : dueDate ? (
            <span className="text-[10px] text-neutral-400">Due {dueDate}</span>
          ) : null}
        </div>
      </div>

      {isPartial ? (
        <div className="mt-3">
          <PaymentProgress totalMinor={totalMinor} paidMinor={paidMinor} currency={currency} />
        </div>
      ) : null}

      {paymentState === 'awaiting_confirmation' ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          The client says they have paid. Confirm the funds before this becomes a receipt.
        </div>
      ) : null}

      {paymentState === 'processing' ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Payment is processing. We will confirm it when the gateway webhook arrives.
        </div>
      ) : null}
    </div>
  );
}
