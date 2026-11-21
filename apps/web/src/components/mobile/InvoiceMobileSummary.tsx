
'use client';

import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

interface InvoiceMobileSummaryProps {
  clientName?: string | null;
  dueDate: string;
  currency: string;
  netPayableMinor: number;
  paidMinor: number;
  remainingMinor?: number;
  overdue: boolean;
}

export function InvoiceMobileSummary({
  clientName,
  dueDate,
  currency,
  netPayableMinor,
  paidMinor,
  remainingMinor,
  overdue,
}: InvoiceMobileSummaryProps) {
  const balance =
    remainingMinor ?? Math.max(0, netPayableMinor - paidMinor);

  const settled = balance === 0 && netPayableMinor > 0;

  const pct =
    netPayableMinor > 0
      ? Math.min(
          100,
          Math.round((paidMinor / netPayableMinor) * 100),
        )
      : 0;

  return (
    <section
      aria-label="Invoice summary"
      className={cn(
        'space-y-2 border-brut border-ink bg-surface p-4',
        'shadow-brut-sm sm:hidden',
      )}
    >
      <p className="truncate text-body-l font-extrabold">
        {clientName || 'Client'}
      </p>

      <p
        className={cn(
          'text-caption',
          overdue
            ? 'font-bold text-danger'
            : 'text-text-soft',
        )}
      >
        {overdue ? 'Overdue · was due ' : 'Due '}
        {formatDate(dueDate)}
      </p>

      <p className="pt-1 text-caption text-text-soft">
        {settled ? 'Paid in full' : 'Balance due'}
      </p>

      <Money
        amountMinor={settled ? netPayableMinor : balance}
        currency={currency}
        variant={settled ? 'paid' : 'total'}
        className="block text-amount-l"
        hideCurrencyCode
      />

      {paidMinor > 0 && !settled && (
        <div className="space-y-1.5 pt-1">
          <div
            role="progressbar"
            aria-label="Amount paid so far"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className={cn(
              'h-3.5 overflow-hidden rounded-full',
              'border-brut-thin border-ink bg-cream',
            )}
          >
            <div
              className="h-full bg-leaf"
              style={{ width: `${pct}%` }}
            />
          </div>

          <p className="text-caption text-text-soft">
            <Money
              amountMinor={paidMinor}
              currency={currency}
              variant="inherit"
              hideCurrencyCode
            />{' '}
            paid of{' '}
            <Money
              amountMinor={netPayableMinor}
              currency={currency}
              variant="inherit"
              hideCurrencyCode
            />
          </p>
        </div>
      )}
    </section>
  );
}
