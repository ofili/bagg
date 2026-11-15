'use client';

import Link from 'next/link';
import { MoneyAmount, StatCard } from '@/components/ui';
import type { CurrencyMetrics } from './OutstandingCard';

interface KpiGridProps {
  metric: CurrencyMetrics;
  className?: string;
}

export function KpiGrid({ metric, className }: KpiGridProps) {
  return (
    <div className={className ?? 'grid gap-3 sm:grid-cols-3 lg:grid-cols-1'}>
      <StatCard
        label="Paid this month"
        value={
          <MoneyAmount
            amountMinor={metric.paid_this_month_minor}
            currency={metric.currency}
            tone="paid"
            size="lg"
            className="text-amount-m font-extrabold"
          />
        }
        description="Confirmed payments this month"
      />

      <StatCard
        label="Invoices created"
        value={metric.invoices_count.toLocaleString()}
        description={
          <Link
            href={`/invoices?currency=${encodeURIComponent(metric.currency)}`}
            className="font-bold text-link underline underline-offset-2 hover:no-underline"
          >
            View all invoices
          </Link>
        }
      />

      <StatCard
        label="Drafts"
        value={metric.draft_count.toLocaleString()}
        description={
          metric.draft_count > 0 ? (
            <Link
              href={`/invoices?status=draft&currency=${encodeURIComponent(metric.currency)}`}
              className="font-bold text-link underline underline-offset-2 hover:no-underline"
            >
              Finish and send
            </Link>
          ) : (
            'Nothing waiting to send'
          )
        }
      />
    </div>
  );
}
