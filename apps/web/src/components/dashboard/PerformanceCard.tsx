'use client';

import Link from 'next/link';
import { ArrowClockwise } from '@phosphor-icons/react';

import { MoneyAmount } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatCompactMoney, formatMoney } from '@/lib/money';

export interface CurrencyMonthMetrics {
  currency: string;
  month: string;
  invoiced_minor: number;
  collected_minor: number;
}

interface PerformanceCardProps {
  paidMinor: number;
  sentCount: number;
  draftCount: number;
  currency: string;
  history: CurrencyMonthMetrics[];
  historyLoading?: boolean;
  historyFailed?: boolean;
  onRetryHistory?: () => void;
  className?: string;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function monthParts(month: string): { year: number; month: number } | null {
  const [year, monthNumber] = month.split('-').map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return null;
  }

  return { year, month: monthNumber };
}

function monthLabel(month: string): string {
  const parts = monthParts(month);
  return parts ? MONTH_LABELS[parts.month - 1] : month;
}

function fullMonthLabel(month: string): string {
  const parts = monthParts(month);
  return parts ? `${MONTH_LABELS[parts.month - 1]} ${parts.year}` : month;
}

function barHeight(value: number, peak: number): string {
  if (peak <= 0 || value <= 0) return '0%';
  return `${Math.max((value / peak) * 100, 2)}%`;
}

export function PerformanceCard({
  paidMinor,
  sentCount,
  draftCount,
  currency,
  history,
  historyLoading = false,
  historyFailed = false,
  onRetryHistory,
  className,
}: PerformanceCardProps) {
  const encodedCurrency = encodeURIComponent(currency);

  const rows = history
    .filter((row) => row.currency === currency)
    .slice()
    .sort((a, b) => a.month.localeCompare(b.month));

  const peakMinor = rows.reduce(
    (peak, row) =>
      Math.max(peak, row.invoiced_minor ?? 0, row.collected_minor ?? 0),
    0,
  );

  // The endpoint always ends its range with the current month.
  const activeMonth = rows.length > 0 ? rows[rows.length - 1].month : '';
  const hasCurrentMonth = activeMonth !== '';
  const hasActivity = rows.length > 0 && peakMinor > 0;
  const gridTemplateColumns = `repeat(${Math.max(rows.length, 1)}, minmax(0, 1fr))`;

  return (
    <section
      aria-labelledby="performance-heading"
      className={cn('border-brut border-ink bg-surface shadow-brut-sm', className)}
    >
      <div className="border-b-2 border-ink px-4 py-3 sm:px-5">
        <h2
          id="performance-heading"
          className="text-caption font-extrabold uppercase tracking-wider text-text-muted"
        >
          Performance
        </h2>
      </div>

      <div className="grid grid-cols-3 divide-x-2 divide-ink border-b-2 border-ink">
        <div className="min-w-0 p-3 sm:p-5">
          <p className="text-[10px] font-extrabold uppercase leading-tight tracking-wider text-text-muted sm:text-[12px]">
            Collected
          </p>

          <div className="mt-1.5 sm:mt-2">
            <MoneyAmount
              amountMinor={paidMinor}
              currency={currency}
              size="sm"
              tone="paid"
              compact
              className="font-extrabold sm:text-amount-m"
            />
          </div>

          <p className="mt-1 hidden text-[11px] text-text-muted sm:block">
            this month
          </p>
        </div>

        <Link
          href={`/invoices?status=sent&currency=${encodedCurrency}`}
          className="min-w-0 p-3 transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink sm:p-5"
          aria-label={`View ${sentCount} sent invoices in ${currency}`}
        >
          <p className="text-[10px] font-extrabold uppercase leading-tight tracking-wider text-text-muted sm:text-[12px]">
            <span className="sm:hidden">Sent</span>
            <span className="hidden sm:inline">Sent invoices</span>
          </p>

          <p className="mt-1.5 text-amount-s font-black tabular-nums text-ink sm:mt-2 sm:text-amount-m">
            {sentCount.toLocaleString()}
          </p>

          <p className="mt-1 hidden text-[11px] text-text-muted sm:block">
            currently sent
          </p>
        </Link>

        <Link
          href={`/invoices?status=draft&currency=${encodedCurrency}`}
          className="min-w-0 p-3 transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink sm:p-5"
          aria-label={`View ${draftCount} draft invoices in ${currency}`}
        >
          <p className="text-[10px] font-extrabold uppercase leading-tight tracking-wider text-text-muted sm:text-[12px]">
            <span className="sm:hidden">Drafts</span>
            <span className="hidden sm:inline">Draft invoices</span>
          </p>

          <p className="mt-1.5 text-amount-s font-black tabular-nums text-ink sm:mt-2 sm:text-amount-m">
            {draftCount.toLocaleString()}
          </p>

          <p className="mt-1 hidden text-[11px] text-text-muted sm:block">
            {draftCount === 1 ? 'needs review' : 'in progress'}
          </p>
        </Link>
      </div>

      <div className="p-4 sm:p-5">
          {historyLoading ? (
            <div role="status">
              <div
                className="flex h-32 items-end gap-2 sm:h-40 sm:gap-3"
                aria-hidden
              >
                {[44, 68, 36, 84, 56, 62].map((billed, index) => (
                  <div
                    key={billed}
                    className="flex h-full flex-1 items-end justify-center gap-0.5 sm:gap-1.5"
                  >
                    <div
                      className="w-2.5 animate-pulse bg-surface-tint motion-reduce:animate-none sm:w-4"
                      style={{ height: `${billed}%` }}
                    />
                    <div
                      className="w-2.5 animate-pulse bg-surface-tint motion-reduce:animate-none sm:w-4"
                      style={{
                        height: `${Math.max(billed - 16, 8) + (index % 3) * 4}%`,
                      }}
                    />
                  </div>
                ))}
              </div>

              <span className="sr-only">Loading performance history</span>
            </div>
          ) : historyFailed ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-3 border-brut-thin border-ink bg-surface-sunken p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-body font-extrabold text-ink">
                  We couldn’t load your 6-month history
                </p>
                <p className="mt-0.5 text-caption text-text-muted">
                  Your invoice totals above are still up to date.
                </p>
              </div>

              {onRetryHistory && (
                <button
                  type="button"
                  onClick={onRetryHistory}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-btn border-brut-thin border-ink bg-surface px-3 py-1.5 text-caption font-extrabold text-ink shadow-brut-sm transition-colors hover:bg-surface-tint"
                >
                  <ArrowClockwise aria-hidden weight="bold" className="h-4 w-4" />
                  Try again
                </button>
              )}
            </div>
          ) : !hasActivity ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center border-brut-thin border-line bg-surface-sunken p-6 text-center">
              <p className="text-body font-extrabold text-ink">
                No billed or collected amounts yet
              </p>
              <p className="mt-1 max-w-sm text-caption text-text-muted">
                Send an invoice to start building your 6-month performance history.
              </p>
              <Link
                href="/invoices/new"
                className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-btn border-brut-thin border-ink bg-surface px-4 py-2 text-caption font-extrabold text-ink shadow-brut-sm transition-colors hover:bg-surface-tint"
              >
                Create an invoice
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-body font-extrabold text-ink sm:text-label">
                  Billed vs collected
                </p>

                <div className="text-right">
                  <p className="text-caption font-bold text-text-muted">
                    <span className="hidden sm:inline">Last 6 months · </span>
                    <span>{currency}</span>
                  </p>
                  <p className="text-[11px] font-bold text-text-muted sm:hidden">
                    peak {formatCompactMoney(peakMinor, currency)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2 sm:gap-3">
                <div className="relative hidden w-14 shrink-0 self-start border-r border-ink sm:block sm:h-40">
                  <div className="absolute inset-x-0 top-0 pr-2 text-right text-[10px] font-bold tabular-nums text-text-muted">
                    {formatCompactMoney(peakMinor, currency)}
                  </div>
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pr-2 text-right text-[10px] font-bold tabular-nums text-text-muted">
                    {formatCompactMoney(peakMinor / 2, currency)}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 pr-2 text-right text-[10px] font-bold tabular-nums text-text-muted">
                    0
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="relative h-32 sm:h-40">
                    <div
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 border-t-2 border-ink"
                    />

                    <div
                      className="absolute inset-0 grid items-end gap-1 sm:gap-3"
                      style={{ gridTemplateColumns }}
                    >
                      {rows.map((row) => (
                        <div
                          key={row.month}
                          className="flex h-full items-end justify-center gap-0.5 sm:gap-1.5"
                        >
                          <div
                            aria-hidden
                            title={`${fullMonthLabel(row.month)}: ${formatMoney(
                              row.invoiced_minor,
                              currency,
                            )} billed`}
                            className="w-2.5 bg-ink sm:w-4"
                            style={{
                              height: barHeight(row.invoiced_minor, peakMinor),
                            }}
                          />
                          <div
                            aria-hidden
                            title={`${fullMonthLabel(row.month)}: ${formatMoney(
                              row.collected_minor,
                              currency,
                            )} collected`}
                            className={cn(
                              'w-2.5 sm:w-4',
                              row.collected_minor > 0 &&
                                'border-brut-thin border-ink bg-status-paid',
                            )}
                            style={{
                              height: barHeight(row.collected_minor, peakMinor),
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="mt-2 grid gap-1 text-center text-[10px] font-bold text-text-muted sm:gap-3 sm:text-[12px]"
                    style={{ gridTemplateColumns }}
                  >
                    {rows.map((row) => (
                      <span
                        key={row.month}
                        className={cn(
                          'truncate',
                          row.month === activeMonth && 'font-black text-ink',
                        )}
                      >
                        {monthLabel(row.month)}
                        {row.month === activeMonth && (
                          <span aria-hidden>*</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption font-bold text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 border-brut-thin border-ink bg-status-paid"
                  />
                  Collected
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 border-brut-thin border-ink bg-ink"
                  />
                  Invoiced
                </span>
                {hasCurrentMonth && (
                  <span className="text-[11px] text-text-muted">
                    * month to date
                  </span>
                )}
              </div>

              <table className="sr-only">
                <caption>
                  Billed and collected by month in {currency}, last{' '}
                  {rows.length} months
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Month</th>
                    <th scope="col">Billed</th>
                    <th scope="col">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.month}>
                      <th scope="row">
                        {fullMonthLabel(row.month)}
                        {row.month === activeMonth ? ' (to date)' : ''}
                      </th>
                      <td>{formatMoney(row.invoiced_minor, currency)}</td>
                      <td>{formatMoney(row.collected_minor, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
    </section>
  );
}
