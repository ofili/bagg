'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ErrorState } from '@/components/ui';
import { useDataTable } from '@/hooks/useDataTable';
import { AttentionRow, type AttentionInvoice } from './AttentionRow';

interface AttentionPanelProps {
  title: string;
  status: 'payment_claimed' | 'overdue';
  currency: string;
  actionLabel: string;
  emptyMessage: string;
  onCount?: (count: number) => void;
}

export function AttentionPanel({
  title,
  status,
  currency,
  actionLabel,
  emptyMessage,
  onCount,
}: AttentionPanelProps) {
  const table = useDataTable<AttentionInvoice>({
    endpoint: '/invoices',
    defaultSortBy: 'due_date',
    defaultSortOrder: 'asc',
    defaultPerPage: 3,
    extraParams: currency ? { status, currency } : { status },
  });

  const rows = table.data?.items ?? [];
  const total = table.data?.total ?? 0;

  useEffect(() => {
    if (!table.loading && onCount) {
      onCount(table.error ? -1 : total);
    }
  }, [table.loading, table.error, total, onCount]);

  const href = `/invoices?status=${status}&currency=${encodeURIComponent(currency)}`;

  return (
    <div className="border-brut border-ink bg-surface flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-line-subtle bg-surface-tint px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-heading text-ink">{title}</h3>
          {total > 0 && (
            <span className="rounded-full border-brut-thin border-ink bg-surface px-2 py-0.5 text-caption font-extrabold text-text">
              {total}
            </span>
          )}
        </div>

        {total > 0 && (
          <Link
            href={href}
            className="text-body font-bold text-link underline underline-offset-2 hover:no-underline"
          >
            See all {total}
          </Link>
        )}
      </div>

      <div className="flex-1">
        {table.loading && !table.data ? (
          <div className="space-y-3 p-4">
            <div className="h-12 animate-pulse bg-surface-tint motion-reduce:animate-none" />
            <div className="h-12 animate-pulse bg-surface-tint motion-reduce:animate-none" />
          </div>
        ) : table.error ? (
          <div className="p-4">
            <ErrorState
              compact
              title="Could not load list"
              description="Your other dashboard information is still available."
              retryLabel="Retry"
              onRetry={() => void table.reload()}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-body text-text-muted">
            {emptyMessage}
          </div>
        ) : (
          <div>
            {rows.slice(0, 3).map((invoice) => (
              <AttentionRow
                key={invoice.id}
                invoice={invoice}
                status={status}
                actionLabel={actionLabel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
