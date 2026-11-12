
import { MoneyAmount } from './MoneyAmount';
import { cn } from '@/lib/cn';

export interface PaymentSummaryProps {
  currency: string;
  totalMinor: number;
  paidMinor: number;
  outstandingMinor?: number;
  title?: string;
  showProgress?: boolean;
  className?: string;
}

export function PaymentSummary({
  currency,
  totalMinor,
  paidMinor,
  outstandingMinor,
  title = 'Payment summary',
  showProgress = true,
  className,
}: PaymentSummaryProps) {
  const safeTotal = Number.isFinite(totalMinor) ? Math.max(0, totalMinor) : 0;
  const safePaid = Number.isFinite(paidMinor) ? Math.max(0, paidMinor) : 0;
  const balance = outstandingMinor !== undefined
    ? Math.max(0, outstandingMinor)
    : Math.max(0, safeTotal - safePaid);

  const progress = safeTotal > 0
    ? Math.min(100, Math.round((safePaid / safeTotal) * 100))
    : 0;

  const settled = safeTotal > 0 && balance === 0;

  return (
    <section
      aria-label={title}
      className={cn(
        'space-y-4 rounded-card border border-line-subtle bg-surface p-4',
        className,
      )}
    >
      <h3 className="text-heading font-extrabold text-text">{title}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-caption text-text-muted">Total</p>
          <MoneyAmount
            amountMinor={safeTotal}
            currency={currency}
            size="lg"
          />
        </div>

        <div className="min-w-0 space-y-1">
          <p className="text-caption text-text-muted">Received</p>
          <MoneyAmount
            amountMinor={safePaid}
            currency={currency}
            size="lg"
            tone="paid"
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-line-subtle pt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-body font-semibold text-text">
            {settled ? 'Paid in full' : 'Outstanding'}
          </span>
          <MoneyAmount
            amountMinor={balance}
            currency={currency}
            size="lg"
            tone={settled ? 'paid' : 'default'}
          />
        </div>

        {showProgress && (
          <div className="space-y-1.5">
            <div
              role="progressbar"
              aria-label="Payment progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-2.5 overflow-hidden rounded-full bg-surface-sunken"
            >
              <div
                className="h-full rounded-full bg-leaf transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-caption text-text-muted">
              {progress}% received
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
