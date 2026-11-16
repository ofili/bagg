'use client';

import Link from 'next/link';
import { ArrowUpRight, Plus } from '@phosphor-icons/react';
import { MoneyAmount, buttonStyles } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CurrencyMetrics } from './OutstandingCard';

interface HeroOwedCardProps {
  metric?: CurrencyMetrics | null;
  metrics?: CurrencyMetrics[];
  selectedCurrency: string;
  onCurrencyChange?: (currency: string) => void;
  isTeachingMode?: boolean;
  className?: string;
}

export function HeroOwedCard({
  metric,
  metrics = [],
  selectedCurrency,
  onCurrencyChange,
  isTeachingMode = false,
  className,
}: HeroOwedCardProps) {
  const currency = metric?.currency || selectedCurrency || 'NGN';
  const outstandingMinor = isTeachingMode ? 0 : (metric?.outstanding_minor ?? 0);
  const overdueMinor = isTeachingMode ? 0 : (metric?.overdue_minor ?? 0);
  const overdueCount = isTeachingMode ? 0 : (metric?.overdue_count ?? 0);
  const dueSoonMinor = Math.max(0, outstandingMinor - overdueMinor);

  return (
    <section
      aria-labelledby="owed-heading"
      className={cn(
        'border-brut border-ink bg-[#EBF4FE] p-6 text-ink shadow-brut sm:p-7',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            id="owed-heading"
            className="text-caption font-extrabold uppercase tracking-wider text-text-muted"
          >
            Owed to you
          </p>

          <div className="mt-2">
            <MoneyAmount
              amountMinor={outstandingMinor}
              currency={currency}
              size="xl"
              className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl"
            />
          </div>

          <p className="mt-2 text-body font-bold text-text-soft">
            {isTeachingMode
              ? 'Your first invoice will show up here'
              : `Across ${(metric?.invoices_count ?? 0).toLocaleString()} invoice${(metric?.invoices_count ?? 0) === 1 ? '' : 's'} in ${currency}.`}
          </p>
        </div>

        {/* Currency Switcher */}
        {!isTeachingMode && metrics.length > 1 && onCurrencyChange && (
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
        )}
      </div>

      {/* Chips & Action */}
      {!isTeachingMode && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {overdueCount > 0 ? (
            <Link
              href={`/invoices?status=overdue&currency=${encodeURIComponent(currency)}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border-brut-thin border-ink bg-status-late px-3.5 py-1 text-caption font-extrabold text-status-late-fg shadow-brut-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
            >
              <span className="h-2 w-2 rounded-full bg-status-late-fg" aria-hidden />
              <span>Overdue</span>
              <span aria-hidden>·</span>
              <MoneyAmount
                amountMinor={overdueMinor}
                currency={currency}
                size="sm"
                className="font-extrabold"
              />
              <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="inline-flex min-h-10 items-center gap-2 rounded-full border-brut-thin border-ink/40 bg-surface px-3.5 py-1 text-caption font-extrabold text-text-muted">
              Nothing overdue
            </span>
          )}

          {dueSoonMinor > 0 && (
            <Link
              href={`/invoices?status=issued&currency=${encodeURIComponent(currency)}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border-brut-thin border-ink bg-mango px-3.5 py-1 text-caption font-extrabold text-on-mango shadow-brut-sm transition-transform active:translate-x-0.5 active:translate-y-0.5"
            >
              <span>Due soon</span>
              <span aria-hidden>·</span>
              <MoneyAmount
                amountMinor={dueSoonMinor}
                currency={currency}
                size="sm"
                className="font-extrabold"
              />
              <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          )}

          {/* Primary Create Invoice Button on Mobile */}
          <div className="mt-2 w-full sm:hidden">
            <Link
              href="/invoices/new"
              className={buttonStyles({ variant: 'accent', fullWidth: true })}
            >
              <Plus aria-hidden className="h-4 w-4" />
              Create invoice
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
