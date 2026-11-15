'use client';

import Link from 'next/link';
import { SectionHeader, chipStyles } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CurrencyMetrics } from './OutstandingCard';

interface StatusNavigationProps {
  metric: CurrencyMetrics;
  className?: string;
}

export function StatusNavigation({ metric, className }: StatusNavigationProps) {
  const filters = [
    { label: 'Draft', status: 'draft', count: metric.draft_count },
    { label: 'Sent', status: 'sent', count: metric.sent_count },
    { label: 'Viewed', status: 'viewed', count: metric.viewed_count },
    { label: 'Claimed', status: 'payment_claimed', count: metric.claimed_count },
    { label: 'Partial', status: 'partially_paid', count: metric.partially_paid_count },
    { label: 'Paid', status: 'paid', count: metric.paid_count },
    ...(metric.overdue_count > 0
      ? [{ label: 'Overdue', status: 'overdue', count: metric.overdue_count }]
      : []),
  ];

  return (
    <nav
      aria-label={`${metric.currency} invoices by status`}
      className={cn('space-y-3', className)}
    >
      <SectionHeader
        title="Browse invoices"
        description="Jump straight to a status."
      />

      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {filters.map((filter) => (
          <li key={filter.status} className="shrink-0">
            <Link
              href={`/invoices?currency=${encodeURIComponent(metric.currency)}&status=${filter.status}`}
              className={cn(chipStyles(), 'min-h-11')}
            >
              {filter.label}
              <span className="tabular font-extrabold">{filter.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
