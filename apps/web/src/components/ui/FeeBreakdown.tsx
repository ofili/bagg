
import { MoneyAmount } from './MoneyAmount';
import { cn } from '@/lib/cn';

export interface FeeBreakdownItem {
  id: string;
  label: string;
  amountMinor: number;
  kind?: 'normal' | 'discount' | 'fee' | 'withholding';
}

export interface FeeBreakdownProps {
  currency: string;
  items: readonly FeeBreakdownItem[];
  totalLabel?: string;
  totalMinor: number;
  className?: string;
}

export function FeeBreakdown({
  currency,
  items,
  totalLabel = 'Total',
  totalMinor,
  className,
}: FeeBreakdownProps) {
  return (
    <section
      aria-label="Amount breakdown"
      className={cn('space-y-3', className)}
    >
      <dl className="space-y-2">
        {items.map((item) => {
          const negative =
            item.kind === 'discount' || item.kind === 'withholding';

          return (
            <div
              key={item.id}
              className="flex items-start justify-between gap-4 text-body"
            >
              <dt className="min-w-0 text-text-soft">{item.label}</dt>
              <dd className="shrink-0 text-right">
                <MoneyAmount
                  amountMinor={item.amountMinor}
                  currency={currency}
                  size="sm"
                  tone={negative ? 'muted' : 'default'}
                />
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="flex items-center justify-between gap-4 border-t border-line pt-3">
        <dt className="text-body font-extrabold text-text">{totalLabel}</dt>
        <dd className="text-right">
          <MoneyAmount
            amountMinor={totalMinor}
            currency={currency}
            size="lg"
          />
        </dd>
      </div>
    </section>
  );
}
