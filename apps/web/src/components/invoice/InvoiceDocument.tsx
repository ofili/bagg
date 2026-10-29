'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock3, ExternalLink, ReceiptText, ShieldCheck } from 'lucide-react';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import { Button, Card, buttonStyles } from '@/components/ui';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

interface InvoiceLineItem {
  id: string;
  position?: number;
  description: string;
  quantity: number;
  unit_price_minor: number;
  total_minor: number;
}

interface InvoiceReceiptSummary {
  id?: string;
  receipt_number?: string;
  amount_paid_minor?: number;
  balance_remaining_minor?: number;
  payment_date?: string;
  payment_method?: string;
  reference?: string | null;
  confirmation_source?: string;
  provider?: string | null;
  verification_code?: string;
  share_token?: string | null;
  created_at?: string;
}

interface InvoicePaymentClaim {
  id?: string;
  amount_minor?: number;
  payment_date?: string;
  reference?: string | null;
  proof_file_url?: string | null;
  status?: string;
  rejection_reason?: string | null;
  created_at?: string;
}

interface InvoiceDocumentProps {
  invoice: {
    id: string;
    invoice_number?: string;
    /** Business name shown at the top. The API should send this; nothing is invented when it is missing. */
    issuer_name?: string | null;
    /** Optional logo. The document works without one (initials are used). */
    issuer_logo_url?: string | null;
    client_name?: string | null;
    currency: string;
    status: string;
    user_facing_status?: string | null;
    issue_date: string;
    due_date?: string | null;
    items: InvoiceLineItem[];
    subtotal_minor: number;
    discount_minor: number;
    tax_rate_percent: number;
    tax_minor: number;
    total_minor: number;
    wht_rate_percent?: number;
    wht_minor?: number;
    net_payable_minor?: number;
    deposit_percentage?: number | null;
    deposit_amount_minor?: number | null;
    notes?: string | null;
    share_token?: string | null;
    latest_claim?: InvoicePaymentClaim | null;
    latest_receipt?: InvoiceReceiptSummary | null;
    remaining_minor?: number;
    amount_paid_minor?: number;
  };
  variant: 'public' | 'issuer';
  className?: string;
  /** Public view: start an online payment. When absent, the bank-transfer claim becomes the main action. */
  onPay?: () => void;
  /** Public view: open the "I've paid" claim sheet. */
  onClaimPaid?: () => void;
  /** Public view: shown above the actions while the invoice is unpaid (for example the bank details). */
  paymentSlot?: React.ReactNode;
}

function initials(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'b';
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toLowerCase();
}

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4', strong && 'font-extrabold')}>
      <span className={strong ? 'text-body-l' : 'text-body text-text-soft'}>{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/**
 * Quote, invoice and receipt share one calm layout: sender, amount, line items, total, one action, footer.
 * This is a calm-zone component: no hard shadows, no stickers, green only for paid.
 */
export function InvoiceDocument({
  invoice,
  variant = 'public',
  className,
  onPay,
  onClaimPaid,
  paymentSlot,
}: InvoiceDocumentProps) {
  const {
    invoice_number,
    issuer_name,
    issuer_logo_url,
    client_name,
    currency,
    status,
    user_facing_status,
    issue_date,
    due_date,
    items,
    subtotal_minor,
    discount_minor,
    tax_rate_percent,
    tax_minor,
    total_minor,
    wht_rate_percent = 0,
    wht_minor = 0,
    net_payable_minor,
    deposit_amount_minor,
    notes,
    share_token,
    latest_claim,
    latest_receipt,
    remaining_minor,
    amount_paid_minor = 0,
  } = invoice;

  const netPayable = net_payable_minor || total_minor;
  const remaining = remaining_minor ?? Math.max(0, netPayable - amount_paid_minor);
  const isPaid = status === 'paid' || user_facing_status === 'Paid';
  const isOverdue = user_facing_status === 'Overdue';
  const isClaimed = status === 'payment_claimed' || latest_claim?.status === 'pending';
  const isClaimRejected = !isPaid && !isClaimed && latest_claim?.status === 'rejected';
  const isPartiallyPaid = status === 'partially_paid' || (amount_paid_minor > 0 && !isPaid);
  const displayStatus = isClaimed && variant === 'public' ? 'Payment claimed' : (user_facing_status || status);
  const paidPercent = Math.min(100, Math.round((amount_paid_minor / Math.max(netPayable, 1)) * 100));

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const whatsappText = encodeURIComponent(
    `Hi ${client_name || 'there'}, here is invoice ${invoice_number}: ${shareUrl}/i/${share_token}`,
  );

  const claimLabel = isPartiallyPaid ? "I've paid the rest" : "I've paid";

  return (
    <div className={cn('space-y-6 text-text', className)}>
      {/* Sender, status */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {issuer_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={issuer_logo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-chip text-body font-extrabold"
            >
              {initials(issuer_name)}
            </span>
          )}
          <div className="min-w-0">
            {issuer_name && <p className="truncate text-heading">{issuer_name}</p>}
            {client_name && (
              <p className="truncate text-body text-text-soft">
                Billed to <span className="font-medium text-text">{client_name}</span>
              </p>
            )}
          </div>
        </div>
        <StatusPill status={status} labelOverride={displayStatus} />
      </header>

      {/* Amount */}
      <Card zone="calm" className="space-y-3 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-body text-text-soft">
            Invoice {invoice_number}
            {isPaid ? ' · paid' : ' · balance due'}
          </p>
          <p className="text-caption text-text-muted">{currency}</p>
        </div>
        <p className="text-amount-l sm:text-amount-xl">
          <Money
            amountMinor={isPaid ? amount_paid_minor : remaining}
            currency={currency}
            variant={isPaid ? 'paid' : 'total'}
            hideCurrencyCode
          />
        </p>
        <p className="text-body text-text-soft">
          Issued {formatDate(issue_date)}
          {due_date && (
            <>
              {' · '}
              <span className={cn(isOverdue && 'font-extrabold text-danger dark:text-[#FFB3A8]')}>
                {isOverdue ? 'Overdue, was due' : 'Due'} {formatDate(due_date)}
              </span>
            </>
          )}
        </p>

        {!isPaid && isPartiallyPaid && (
          <div className="space-y-1.5 pt-1">
            <div
              role="progressbar"
              aria-label="Share of the invoice paid"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={paidPercent}
              className="h-2.5 overflow-hidden rounded-full border border-ink bg-surface-tint"
            >
              <div className="h-full bg-leaf" style={{ width: `${paidPercent}%` }} />
            </div>
            <p className="text-body text-text-soft">
              <Money amountMinor={amount_paid_minor} currency={currency} variant="inherit" hideCurrencyCode /> of{' '}
              <Money amountMinor={netPayable} currency={currency} variant="inherit" hideCurrencyCode /> paid
            </p>
          </div>
        )}

        {isClaimed && (
          <div className="space-y-2 rounded-row border border-amber-300 bg-amber-50 p-3.5 text-body text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100">
              <Clock3 aria-hidden className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{variant === 'issuer' ? 'Payment claim awaiting confirmation' : 'Payment reported · Awaiting confirmation'}</span>
            </div>
            <p className="text-caption text-amber-800 dark:text-amber-300">
              {variant === 'issuer'
                ? 'Your client has reported a payment. Confirm the funds in your account to generate the official receipt.'
                : 'You reported this payment. Once your freelancer confirms the funds in their bank account, your receipt will be available here automatically.'}
            </p>
            {latest_claim && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-amber-200/60 pt-2 text-caption dark:border-amber-800/40">
                <span>
                  <strong className="text-amber-950 dark:text-amber-100">Amount:</strong>{' '}
                  <Money amountMinor={latest_claim.amount_minor || 0} currency={currency} hideCurrencyCode variant="inherit" />
                </span>
                {latest_claim.payment_date && (
                  <span>
                    <strong className="text-amber-950 dark:text-amber-100">Date:</strong>{' '}
                    {formatDate(latest_claim.payment_date)}
                  </span>
                )}
                {latest_claim.reference && (
                  <span>
                    <strong className="text-amber-950 dark:text-amber-100">Reference:</strong>{' '}
                    {latest_claim.reference}
                  </span>
                )}
                {latest_claim.proof_file_url && (
                  <a
                    href={latest_claim.proof_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-amber-900 underline dark:text-amber-100"
                  >
                    View proof document <ExternalLink aria-hidden className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {isClaimRejected && (
          <div className="space-y-2 rounded-row border border-red-300 bg-red-50 p-3.5 text-body text-red-950 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
            <div className="flex items-center gap-2 font-bold text-red-900 dark:text-red-100">
              <AlertCircle aria-hidden className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>Previous payment could not be verified</span>
            </div>
            <p className="text-caption text-red-800 dark:text-red-300">
              {variant === 'issuer'
                ? 'You rejected this payment claim.'
                : 'Your freelancer was unable to confirm the previously reported payment.'}
              {latest_claim?.rejection_reason && (
                <span className="mt-1 block font-medium">
                  Reason provided: &ldquo;{latest_claim.rejection_reason}&rdquo;
                </span>
              )}
            </p>
          </div>
        )}
      </Card>

      {/* Line items */}
      <section aria-labelledby="line-items" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="line-items" className="text-heading">
            Line items
          </h2>
          {share_token && (
            <Link
              href={`${'/api'}/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: 'link' })}
            >
              Download PDF
            </Link>
          )}
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-row border border-line-subtle bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-body font-medium">{item.description}</p>
                <p className="text-caption text-text-muted">
                  {item.quantity} ×{' '}
                  <Money amountMinor={item.unit_price_minor} currency={currency} variant="muted" hideCurrencyCode />
                </p>
              </div>
              <Money amountMinor={item.total_minor} currency={currency} className="text-amount-s" hideCurrencyCode />
            </li>
          ))}
        </ul>
      </section>

      {/* Totals */}
      <section aria-label="Totals" className="space-y-2">
        <Row label="Subtotal">
          <Money amountMinor={subtotal_minor} currency={currency} hideCurrencyCode />
        </Row>
        {discount_minor > 0 && (
          <Row label="Discount">
            −<Money amountMinor={discount_minor} currency={currency} hideCurrencyCode />
          </Row>
        )}
        {tax_minor > 0 && (
          <Row label={`VAT (${tax_rate_percent}%)`}>
            <Money amountMinor={tax_minor} currency={currency} hideCurrencyCode />
          </Row>
        )}
        {wht_minor > 0 && (
          <>
            <Row label="Gross total">
              <Money amountMinor={total_minor} currency={currency} hideCurrencyCode />
            </Row>
            <Row label={`Less withholding tax (${wht_rate_percent}%)`}>
              −<Money amountMinor={wht_minor} currency={currency} hideCurrencyCode />
            </Row>
          </>
        )}
        <div className="border-t border-line pt-3">
          <Row label="Total due" strong>
            <Money amountMinor={netPayable} currency={currency} className="text-amount-m" hideCurrencyCode />
          </Row>
        </div>
      </section>

      {/* Deposit */}
      {(deposit_amount_minor || 0) > 0 && (
        <Card zone="calm" tone="peach" className="space-y-1">
          <Row label="Deposit due today" strong>
            <Money amountMinor={deposit_amount_minor || 0} currency={currency} hideCurrencyCode />
          </Row>
          <Row label="Remaining balance">
            <Money
              amountMinor={Math.max(0, netPayable - (deposit_amount_minor || 0))}
              currency={currency}
              hideCurrencyCode
            />
          </Row>
        </Card>
      )}

      {/* Notes */}
      {notes && (
        <Card zone="calm">
          <h2 className="text-heading">Notes</h2>
          <p className="mt-2 whitespace-pre-line text-body text-text-soft">{notes}</p>
        </Card>
      )}

      {/* Latest receipt */}
      {latest_receipt && (
        <Card zone="calm" className="space-y-3">
          <div className="flex items-center gap-2">
            <ReceiptText aria-hidden className="h-4 w-4" />
            <h2 className="text-heading">Latest receipt</h2>
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-dashed border-line pt-3">
            <div>
              <p className="text-caption text-text-muted">Amount received</p>
              <Money
                amountMinor={latest_receipt.amount_paid_minor || 0}
                currency={currency}
                variant="paid"
                className="text-amount-m"
                hideCurrencyCode
              />
            </div>
            <div className="text-right text-caption text-text-soft">
              {latest_receipt.payment_date && <p>{formatDate(latest_receipt.payment_date)}</p>}
              {latest_receipt.verification_code && <p className="tabular">{latest_receipt.verification_code}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 text-caption text-text-soft">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
              Confirmed by {latest_receipt.confirmation_source || 'the issuer'}
              {latest_receipt.provider ? ` (${latest_receipt.provider})` : ''}
            </span>
            {latest_receipt.share_token && (
              <Link href={`/r/${latest_receipt.share_token}`} className={buttonStyles({ variant: 'link' })}>
                View receipt <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </Card>
      )}

      {variant === 'public' && !isPaid && paymentSlot}

      {/* Client: one main action, then the quieter ones */}
      {variant === 'public' && (
        <div className="space-y-3 border-t border-line pt-5">
          {!isPaid && (
            <>
              {onPay && (
                <Button zone="calm" size="lg" fullWidth onClick={onPay}>
                  Pay <Money amountMinor={remaining} currency={currency} variant="inherit" hideCurrencyCode />
                </Button>
              )}
              {isClaimed ? (
                <div className="space-y-2 text-center">
                  <Button
                    variant="outline"
                    zone="calm"
                    size="lg"
                    fullWidth
                    onClick={onClaimPaid}
                  >
                    Update payment details
                  </Button>
                  <p className="text-caption text-text-muted">
                    Need to correct the reference, date, or amount you reported?
                  </p>
                </div>
              ) : isClaimRejected ? (
                <Button
                  zone="calm"
                  size="lg"
                  fullWidth
                  onClick={onClaimPaid}
                  className="bg-danger text-white hover:bg-danger/90"
                >
                  Submit payment details again
                </Button>
              ) : (
                <Button zone="calm" size="lg" fullWidth onClick={onClaimPaid}>
                  {claimLabel}
                </Button>
              )}
              <div className="text-center">
                <a
                  href={`https://wa.me/?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonStyles({ variant: 'link' })}
                >
                  Share on WhatsApp
                </a>
              </div>
            </>
          )}
          {isPaid && latest_receipt?.share_token && (
            <Link
              href={`/r/${latest_receipt.share_token}`}
              className={buttonStyles({ variant: 'outline', zone: 'calm', fullWidth: true })}
            >
              <ShieldCheck aria-hidden className="h-4 w-4" /> View receipt
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
