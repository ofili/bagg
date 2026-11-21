
'use client';

import { MoneyAmount } from '@/components/ui';
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

  const outstandingMinor = isTeachingMode
    ? 0
    : metric?.outstanding_minor ?? 0;

  const invoiceCount = isTeachingMode
    ? 0
    : metric?.invoices_count ?? 0;

  return (
    <section
      aria-labelledby="owed-heading"
      className={cn(
        'border-brut border-ink bg-status-pending p-6 text-ink shadow-brut sm:p-7',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
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
              : `Across ${invoiceCount.toLocaleString()} invoice${invoiceCount === 1 ? '' : 's'} in ${currency}.`}
          </p>
        </div>

        {!isTeachingMode && metrics.length > 1 && onCurrencyChange && (
          <div
            role="group"
            aria-label="Select currency"
            className="flex gap-1.5 overflow-x-auto pb-1"
          >
            {metrics.map((item) => {
              const active = item.currency === selectedCurrency;

              return (
                <button
                  key={item.currency}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onCurrencyChange(item.currency)}
                  className={cn(
                    'rounded-full border-brut-thin border-ink px-3 py-1 text-caption font-extrabold transition-colors',
                    active
                      ? 'bg-ink text-surface'
                      : 'bg-surface text-text hover:bg-surface-tint',
                  )}
                >
                  {item.currency}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
