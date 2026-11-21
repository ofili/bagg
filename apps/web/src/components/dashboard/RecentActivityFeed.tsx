
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  PaperPlaneTilt,
} from '@phosphor-icons/react';

import { ErrorState, MoneyAmount } from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

interface ActivityInvoice {
  id: string;
  invoice_number?: string | null;
  client_name?: string | null;
  status: string;
  total_minor: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSeconds < 0) return 'Just now';
  if (diffSeconds < 60) return 'Just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function getActivityMeta(item: ActivityInvoice) {
  const invoiceLabel = item.invoice_number
    ? `Invoice #${item.invoice_number}`
    : 'Invoice';

  switch (item.status) {
    case 'paid':
      return {
        icon: CheckCircle,
        label: `${invoiceLabel} paid`,
        iconClass: 'text-status-paid-fg',
      };

    case 'payment_claimed':
      return {
        icon: Clock,
        label: `Payment claimed for ${invoiceLabel}`,
        iconClass: 'text-status-due-fg',
      };

    case 'viewed':
      return {
        icon: Eye,
        label: `${invoiceLabel} viewed`,
        iconClass: 'text-link',
      };

    case 'sent':
      return {
        icon: PaperPlaneTilt,
        label: `${invoiceLabel} sent`,
        iconClass: 'text-ink',
      };

    default:
      return {
        icon: FileText,
        label: item.invoice_number
          ? invoiceLabel
          : 'Draft invoice updated',
        iconClass: 'text-text-muted',
      };
  }
}

function ActivitySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading recent invoice updates"
      className="space-y-3 p-4"
    >
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-12 animate-pulse bg-surface-tint motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export function RecentActivityFeed({
  className,
}: {
  className?: string;
}) {
  const [items, setItems] = useState<ActivityInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const response = await fetch(
        `${API_BASE}/invoices?per_page=5&sort_by=updated_at&sort_order=desc`,
        {
          credentials: 'include',
          cache: 'no-store',
        },
      );

      if (!response.ok) {
        throw new Error('Could not load recent invoice updates');
      }

      const data: unknown = await response.json();

      if (
        !data ||
        typeof data !== 'object' ||
        !('items' in data) ||
        !Array.isArray(data.items)
      ) {
        throw new Error('Invalid invoice list response');
      }

      setItems(data.items as ActivityInvoice[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      aria-labelledby="recent-updates-heading"
      className={cn('space-y-2', className)}
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="recent-updates-heading"
          className="text-heading font-extrabold text-ink"
        >
          Recent invoice updates
        </h2>
      </div>

      <div className="divide-y-2 divide-ink border-brut border-ink bg-surface shadow-brut-sm">
        {loading ? (
          <ActivitySkeleton />
        ) : error ? (
          <div className="p-4">
            <ErrorState
              compact
              title="Updates unavailable"
              description="Your recent invoice updates could not be loaded."
              retryLabel="Retry"
              onRetry={() => void load()}
            />
          </div>
        ) : items.length === 0 ? (
          <div className="p-5 text-center">
            <FileText
              aria-hidden
              className="mx-auto h-7 w-7 text-text-muted"
            />
            <p className="mt-2 text-caption font-bold text-ink">
              No invoice updates yet
            </p>
            <p className="mt-1 text-caption text-text-muted">
              Changes to your invoices will appear here.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const meta = getActivityMeta(item);
            const Icon = meta.icon;
            const updatedAt = item.updated_at || item.created_at;

            return (
              <Link
                key={item.id}
                href={`/invoices/${encodeURIComponent(item.id)}`}
                className="flex min-h-[68px] items-center justify-between gap-3 p-3.5 transition-colors hover:bg-surface-tint focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink sm:p-4"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <Icon
                    aria-hidden
                    weight="bold"
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      meta.iconClass,
                    )}
                  />

                  <div className="min-w-0">
                    <p className="truncate text-caption font-extrabold text-ink sm:text-body">
                      {meta.label}
                    </p>

                    <p className="truncate text-[11px] text-text-soft">
                      {item.client_name || 'No client specified'}
                    </p>
                  </div>
                </div>

                <div className="ml-2 shrink-0 text-right">
                  <time
                    dateTime={updatedAt}
                    className="block text-[11px] font-bold text-text-muted"
                  >
                    {formatRelativeTime(updatedAt)}
                  </time>

                  <MoneyAmount
                    amountMinor={item.total_minor}
                    currency={item.currency}
                    size="sm"
                    className="font-bold text-caption text-ink"
                  />
                </div>
              </Link>
            );
          })
        )}

        <Link
          href="/invoices"
          className="flex min-h-11 items-center justify-between gap-3 bg-surface-sunken p-3 text-caption font-extrabold text-link transition-colors hover:bg-surface-tint hover:underline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink"
        >
          <span>View all invoices</span>
          <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0" />
        </Link>
      </div>
    </section>
  );
}
