'use client';

import Link from 'next/link';
import { ArrowUpRight } from '@phosphor-icons/react';
import { MoneyAmount } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface CurrencyMetrics {
  currency: string;
  outstanding_minor: number;
  overdue_minor: number;
  paid_this_month_minor: number;
  invoices_count: number;
  draft_count: number;
  sent_count: number;
  viewed_count: number;
  claimed_count: number;
  partially_paid_count: number;
  paid_count: number;
  overdue_count: number;
  cancelled_count: number;
}

interface OutstandingCardProps {
  metric: CurrencyMetrics;
  metrics: CurrencyMetrics[];
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
  className?: string;
}

export function OutstandingCard({
  metric,
  metrics,
  selectedCurrency,
  onCurrencyChange,
  className,
}: OutstandingCardProps) {
  return (
    <section
      aria-labelledby="outstanding-heading"
      className={cn(
        'border-brut border-ink bg-mango p-5 text-on-mango shadow-brut sm:p-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            id="outstanding-heading"
            className="text-caption font-extrabold uppercase tracking-wide"
          >
            Waiting to be paid
          </p>

          <div className="mt-2">
            <MoneyAmount
              amountMinor={metric.outstanding_minor}
              currency={metric.currency}
              size="xl"
              className="text-amount-l sm:text-amount-xl font-extrabold"
            />
          </div>

          <p className="mt-2 text-body font-semibold">
            Across {metric.invoices_count.toLocaleString()}{' '}
            invoice{metric.invoices_count === 1 ? '' : 's'} in{' '}
            {metric.currency}.
          </p>
        </div>

        {metrics.length > 1 ? (
          <div
            role="group"
            aria-label="Select currency"
            className="flex gap-1.5 overflow-x-auto pb-1"
          >
            {metrics.map((m) => {
              const active = m.currency === selectedCurrency;
              return (
                <button
                  key={m.currency}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onCurrencyChange(m.currency)}
                  className={cn(
                    'rounded-full border-brut-thin border-ink px-3 py-1 text-caption font-extrabold transition-colors',
                    active
                      ? 'bg-ink text-surface'
                      : 'bg-surface text-text hover:bg-surface-tint',
                  )}
                >
                  {m.currency}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="rounded-full border-brut-thin border-ink bg-surface px-3 py-1 text-caption font-extrabold text-text">
            {metric.currency}
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {metric.overdue_count > 0 ? (
          <Link
            href={`/invoices?status=overdue&currency=${encodeURIComponent(metric.currency)}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-brut-thin border-ink bg-surface px-4 text-body font-extrabold text-text transition-colors hover:bg-surface-tint"
          >
            <span>{metric.overdue_count.toLocaleString()} overdue</span>
            <span aria-hidden>·</span>
            <MoneyAmount
              amountMinor={metric.overdue_minor}
              currency={metric.currency}
              size="sm"
              tone="default"
              className="font-extrabold"
            />
            <ArrowUpRight aria-hidden className="h-4 w-4" />
          </Link>
        ) : (
          <p className="text-body font-semibold">Nothing is overdue.</p>
        )}

        <Link
          href={`/invoices?currency=${encodeURIComponent(metric.currency)}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-btn border-brut-thin border-ink bg-ink px-4 text-body font-extrabold text-surface transition-colors hover:bg-ink/90"
        >
          View all invoices
          <ArrowUpRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
