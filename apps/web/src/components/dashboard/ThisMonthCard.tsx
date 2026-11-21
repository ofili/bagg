
'use client';

import Link from 'next/link';
import { MoneyAmount } from '@/components/ui';
import { cn } from '@/lib/cn';

interface ThisMonthCardProps {
  paidMinor: number;
  sentCount: number;
  draftCount: number;
  currency: string;
  className?: string;
}

export function ThisMonthCard({
  paidMinor,
  sentCount,
  draftCount,
  currency,
  className,
}: ThisMonthCardProps) {
  const encodedCurrency = encodeURIComponent(currency);

  return (
    <section
      aria-labelledby="invoice-snapshot-heading"
      className={cn('space-y-2', className)}
    >
      <h2
        id="invoice-snapshot-heading"
        className="text-heading font-extrabold text-ink"
      >
        Invoice snapshot
      </h2>

      <div className="grid grid-cols-1 divide-y-2 divide-ink border-brut border-ink bg-surface shadow-brut-sm sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0">
        <div className="min-w-0 p-4 sm:p-5">
          <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Collected this month
          </p>

          <div className="mt-2">
            <MoneyAmount
              amountMinor={paidMinor}
              currency={currency}
              size="lg"
              tone="paid"
              className="font-extrabold"
            />
          </div>

          <p className="mt-1 text-[11px] text-text-muted">
            Confirmed payments this month
          </p>
        </div>

        <Link
          href={`/invoices?status=sent&currency=${encodedCurrency}`}
          className="min-w-0 p-4 transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink sm:p-5"
          aria-label={`View ${sentCount} sent invoices in ${currency}`}
        >
          <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Sent invoices
          </p>

          <p className="mt-2 text-title-l font-black tabular-nums text-ink">
            {sentCount.toLocaleString()}
          </p>

          <p className="mt-1 text-[11px] text-text-muted">
            Currently sent
          </p>
        </Link>

        <Link
          href={`/invoices?status=draft&currency=${encodedCurrency}`}
          className="min-w-0 p-4 transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink sm:p-5"
          aria-label={`View ${draftCount} draft invoices in ${currency}`}
        >
          <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Draft invoices
          </p>

          <p className="mt-2 text-title-l font-black tabular-nums text-ink">
            {draftCount.toLocaleString()}
          </p>

          <p className="mt-1 text-[11px] text-text-muted">
            {draftCount === 1 ? 'Needs review' : 'In progress'}
          </p>
        </Link>
      </div>
    </section>
  );
}
