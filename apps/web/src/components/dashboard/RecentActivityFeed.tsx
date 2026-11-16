'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { MoneyAmount } from '@/components/ui';
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
  paid_at?: string | null;
  sent_at?: string | null;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function RecentActivityFeed({ className }: { className?: string }) {
  const [items, setItems] = useState<ActivityInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetch(`${API_BASE}/invoices?per_page=5&sort_by=updated_at&sort_order=desc`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!live || !data) return;
        const list = Array.isArray(data.items) ? data.items : [];
        setItems(list);
      })
      .catch(() => {})
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, []);

  function renderStatusMeta(item: ActivityInvoice) {
    switch (item.status) {
      case 'paid':
        return {
          icon: <CheckCircle weight="fill" className="h-4 w-4 text-leaf" />,
          label: `Invoice #${item.invoice_number || 'draft'} paid`,
          dot: 'bg-leaf',
        };
      case 'payment_claimed':
        return {
          icon: <Clock weight="fill" className="h-4 w-4 text-mango" />,
          label: `Claim received for #${item.invoice_number || 'draft'}`,
          dot: 'bg-mango',
        };
      case 'viewed':
        return {
          icon: <Eye weight="bold" className="h-4 w-4 text-link" />,
          label: `Invoice #${item.invoice_number || 'draft'} viewed`,
          dot: 'bg-link',
        };
      case 'sent':
        return {
          icon: <PaperPlaneTilt weight="fill" className="h-4 w-4 text-ink" />,
          label: `Invoice #${item.invoice_number || 'draft'} sent`,
          dot: 'bg-ink',
        };
      default:
        return {
          icon: <FileText weight="duotone" className="h-4 w-4 text-text-muted" />,
          label: item.invoice_number ? `Invoice #${item.invoice_number}` : 'Draft invoice',
          dot: 'bg-text-muted',
        };
    }
  }

  return (
    <section aria-labelledby="activity-heading" className={cn('space-y-2', className)}>
      <h2
        id="activity-heading"
        className="text-heading font-extrabold text-ink"
      >
        Recent activity
      </h2>

      <div className="border-brut border-ink bg-surface shadow-brut-sm divide-y-2 divide-ink">
        {loading ? (
          <div className="space-y-3 p-4">
            <div className="h-10 animate-pulse bg-surface-tint" />
            <div className="h-10 animate-pulse bg-surface-tint" />
            <div className="h-10 animate-pulse bg-surface-tint" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-5 text-center text-caption text-text-muted">
            No recent document activity yet.
          </div>
        ) : (
          items.map((item) => {
            const meta = renderStatusMeta(item);
            const timeAgo = formatRelativeTime(item.updated_at || item.created_at);

            return (
              <Link
                key={item.id}
                href={`/invoices/${item.id}`}
                className="flex items-center justify-between p-3.5 transition-colors hover:bg-surface-tint sm:p-4"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="mt-0.5 shrink-0">{meta.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate text-caption font-extrabold text-ink sm:text-body">
                      {meta.label}
                    </p>
                    <p className="truncate text-[11px] text-text-soft">
                      {item.client_name || 'No client specified'}
                    </p>
                  </div>
                </div>

                <div className="ml-3 shrink-0 text-right">
                  <span className="text-[11px] font-bold text-text-muted block">
                    {timeAgo}
                  </span>
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

        {/* Footer Link */}
        <Link
          href="/invoices"
          className="flex items-center justify-between bg-surface-sunken p-3 text-caption font-extrabold text-link transition-colors hover:bg-surface-tint hover:underline"
        >
          <span>See all invoices & activity</span>
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
