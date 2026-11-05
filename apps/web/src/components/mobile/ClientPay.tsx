'use client';

/*
 * Phone layout for the public invoice page (/i/[token]).
 * Most clients open this from a WhatsApp link on their phone, so the first
 * screen answers three questions: how much, where to pay, what to do next.
 *
 * Four states, all calm (no sad or worried mascot on a client-facing screen):
 *   unpaid / part paid   amount due, payment details, "I've paid"
 *   payment reported     "Thanks", waiting for the freelancer to confirm
 *   report not accepted  a gentle note with the reason, "I've paid" again
 *   paid                 celebrating bag and the receipt
 *
 * "Payment reported" is never shown as paid. Only the server's own paid state
 * (status or a zero balance) switches the screen to Paid.
 *
 * Everything here hides from the sm breakpoint up, where the existing
 * InvoiceDocument layout stays as it is.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check, Clock } from 'lucide-react';
import { BagCharacter } from '@/components/brand';
import { Money } from '@/components/money/Money';
import { Button, Card, buttonStyles } from '@/components/ui';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

export interface ClientPayProps {
  invoiceNumber: string;
  currency: string;
  dueDate: string;
  status: string;
  payableMinor: number;
  paidMinor: number;
  remainingMinor: number;
  claim?: {
    status: string;
    amount_minor: number;
    payment_date: string;
    rejection_reason?: string | null;
  } | null;
  receipt?: {
    receipt_number: string;
    amount_paid_minor: number;
    payment_date: string;
    payment_method: string;
    reference?: string | null;
    share_token?: string | null;
  } | null;
  /** The existing <PaymentDetails /> element, passed in so its copy buttons keep working. */
  paymentDetails: ReactNode;
  /** Provider name. Not in the public payload yet: see the note in the page edits. */
  businessName?: string | null;
  onClaim: () => void;
}

function useState_(p: ClientPayProps) {
  const paid = p.status === 'paid' || (p.payableMinor > 0 && p.remainingMinor === 0);
  const pending = !paid && p.claim?.status === 'pending';
  const rejected = !paid && p.claim?.status === 'rejected';
  const pastDue = !paid && p.dueDate < new Date().toISOString().split('T')[0];
  return { paid, pending, rejected, pastDue };
}

const row = (label: string, value: ReactNode) => (
  <div className="flex items-baseline justify-between gap-3 border-t border-line-subtle py-2 text-body">
    <span className="text-text-soft">{label}</span>
    <span className="text-right font-extrabold">{value}</span>
  </div>
);

export function ClientPayView(p: ClientPayProps) {
  const { paid, pending, rejected, pastDue } = useState_(p);

  return (
    <div className="space-y-5 sm:hidden">
      <div>
        <p className="text-caption text-text-soft">{p.businessName ? `From ${p.businessName}` : 'Invoice'}</p>
        <p className="font-extrabold">{p.invoiceNumber}</p>
      </div>

      {paid ? (
        <section aria-label="Payment received" className="space-y-4 text-center">
          <BagCharacter size={112} mood="celebrating" className="mx-auto" decorative />
          <h1 className="text-title-l">paid. thank you!</h1>
          <Money
            amountMinor={p.receipt?.amount_paid_minor ?? p.paidMinor}
            currency={p.currency}
            variant="paid"
            className="block text-amount-l"
            hideCurrencyCode
          />
          {p.receipt && (
            <Card zone="calm" className="space-y-0 p-4 text-left">
              <p className="pb-2 font-extrabold">Receipt {p.receipt.receipt_number}</p>
              {row('Date', formatDate(p.receipt.payment_date))}
              {row('Method', p.receipt.payment_method.replaceAll('_', ' '))}
              {p.receipt.reference ? row('Reference', p.receipt.reference) : null}
            </Card>
          )}
        </section>
      ) : (
        <>
          <section aria-label="Amount due" className="space-y-2">
            <p className="text-body text-text-soft">{p.paidMinor > 0 ? 'Balance due' : 'Amount due'}</p>
            <Money
              amountMinor={p.remainingMinor}
              currency={p.currency}
              variant="total"
              className="block text-amount-l"
              hideCurrencyCode
            />
            <p className="flex flex-wrap items-center gap-2 text-body">
              <span>Due {formatDate(p.dueDate)}</span>
              {pastDue && (
                <span className="rounded-full bg-sun px-2 py-0.5 text-caption font-extrabold text-[#4A3200]">Past due</span>
              )}
            </p>
            {p.paidMinor > 0 && (
              <p className="text-caption text-text-soft">
                <Money amountMinor={p.paidMinor} currency={p.currency} variant="inherit" hideCurrencyCode /> already paid
                of <Money amountMinor={p.payableMinor} currency={p.currency} variant="inherit" hideCurrencyCode />
              </p>
            )}
          </section>

          {pending && (
            <Card zone="calm" tone="peach" className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <BagCharacter size={64} mood="thinking" decorative />
                <div>
                  <h2 className="text-heading">thanks, we&rsquo;ve told them</h2>
                  <p className="text-body text-text-soft">
                    You said you paid <Money amountMinor={p.claim!.amount_minor} currency={p.currency} variant="inherit" hideCurrencyCode />.
                    You&rsquo;ll get a receipt once it is confirmed.
                  </p>
                </div>
              </div>
              <ol className="space-y-2 text-body">
                <li className="flex items-center gap-2">
                  <Check aria-hidden className="h-5 w-5 rounded-full border-brut-thin border-ink bg-leaf p-0.5" />
                  Payment reported {formatDate(p.claim!.payment_date)}
                </li>
                <li className="flex items-center gap-2 font-extrabold">
                  <Clock aria-hidden className="h-5 w-5 rounded-full border-brut-thin border-ink bg-sun p-0.5" />
                  Waiting for confirmation
                </li>
              </ol>
            </Card>
          )}

          {rejected && (
            <Card zone="calm" tone="sun" className="space-y-1 p-4">
              <h2 className="text-heading">we couldn&rsquo;t match that payment</h2>
              <p className="text-body">
                {p.claim?.rejection_reason
                  ? p.claim.rejection_reason
                  : 'The details you sent did not match a payment yet.'}{' '}
                If you have paid, send the details again.
              </p>
            </Card>
          )}

          {pending ? (
            <details className="rounded-card border-brut border-ink bg-surface">
              <summary className="flex min-h-12 cursor-pointer items-center px-4 font-extrabold">Payment details</summary>
              <div className="p-3">{p.paymentDetails}</div>
            </details>
          ) : (
            <section aria-label="How to pay" className="space-y-2">
              {p.paymentDetails}
              <p className="text-caption text-text-soft">
                Use {p.invoiceNumber} as your payment reference so it can be matched.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Sticky bottom bar. Render it once on the page; it hides from sm and up. */
export function ClientPayBar(p: ClientPayProps) {
  const { paid, pending } = useState_(p);
  const receiptLink = p.receipt?.share_token ? `/r/${p.receipt.share_token}` : null;

  if (paid && !receiptLink) return null;

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-brut border-ink bg-surface px-4 pt-3 sm:hidden">
      <div className="pb-3">
        {paid ? (
          <Link href={receiptLink!} className={cn(buttonStyles({ size: 'lg' }), 'w-full')}>
            View receipt
          </Link>
        ) : pending ? (
          <Button variant="outline" zone="calm" size="lg" fullWidth onClick={p.onClaim}>
            Change what I sent
          </Button>
        ) : (
          <Button size="lg" fullWidth onClick={p.onClaim}>
            I&rsquo;ve paid
          </Button>
        )}
      </div>
    </div>
  );
}
