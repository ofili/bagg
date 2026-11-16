'use client';

import Link from 'next/link';
import { MoneyAmount } from '@/components/ui';
import { cn } from '@/lib/cn';

interface ThisMonthCardProps {
  paidMinor: number;
  paidCount: number;
  sentCount: number;
  draftCount: number;
  currency: string;
  className?: string;
}

export function ThisMonthCard({
  paidMinor,
  paidCount,
  sentCount,
  draftCount,
  currency,
  className,
}: ThisMonthCardProps) {
  return (
    <section aria-labelledby="this-month-heading" className={cn('space-y-2', className)}>
      <h2
        id="this-month-heading"
        className="text-heading font-extrabold text-ink"
      >
        This month
      </h2>

      <div className="grid grid-cols-3 border-brut border-ink bg-surface shadow-brut-sm divide-x-2 divide-ink">
        {/* PAID */}
        <Link
          href={`/invoices?status=paid&currency=${encodeURIComponent(currency)}`}
          className="p-4 transition-colors hover:bg-surface-tint sm:p-5"
        >
          <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Paid
          </p>
          <div className="mt-1.5">
            <MoneyAmount
              amountMinor={paidMinor}
              currency={currency}
              size="md"
              className="font-extrabold text-body sm:text-heading"
            />
          </div>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {paidCount} {paidCount === 1 ? 'payment' : 'payments'}
          </p>
        </Link>

        {/* SENT */}
        <Link
          href={`/invoices?currency=${encodeURIComponent(currency)}`}
          className="p-4 transition-colors hover:bg-surface-tint sm:p-5"
        >
          <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Sent
          </p>
          <p className="mt-1.5 text-body font-black text-ink sm:text-heading">
            {sentCount.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {sentCount === 1 ? 'document' : 'documents'} delivered
          </p>
        </Link>

        {/* DRAFTS */}
        <Link
          href={`/invoices?status=draft&currency=${encodeURIComponent(currency)}`}
          className="p-4 transition-colors hover:bg-surface-tint sm:p-5"
        >
          <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
            Drafts
          </p>
          <p className="mt-1.5 text-body font-black text-ink sm:text-heading">
            {draftCount.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {draftCount === 1 ? 'ready to review' : 'in progress'}
          </p>
        </Link>
      </div>
    </section>
  );
}
