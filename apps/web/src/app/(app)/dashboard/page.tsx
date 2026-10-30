'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Loader2, Plus } from 'lucide-react';
import { BagCharacter } from '@/components/brand';
import { Money } from '@/components/money/Money';
import { Button, Card, buttonStyles, chipStyles } from '@/components/ui';

const API_BASE = '/api';

interface CurrencyMetrics {
  currency: string;
  outstanding_minor: number;
  overdue_minor: number;
  paid_this_month_minor: number;
  invoices_count: number;
  draft_count: number;
  sent_count: number;
  viewed_count: number;
  claimed_count: number;
  partially_paid_count: number;
  paid_count: number;
  overdue_count: number;
  cancelled_count: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<CurrencyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    fetch(`${API_BASE}/invoices/metrics`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load metrics');
        return res.json();
      })
      .then((data: CurrencyMetrics[]) => setMetrics(data))
      // Never show zeros when the request failed: zero money looks like real data.
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isEmpty = !loading && !failed && metrics.length === 0;

  return (
    <div className="w-full space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-title-l sm:text-display">home</h1>
          <p className="mt-1 text-body text-text-soft">
            Each currency is counted on its own. Nothing is converted or added together.
          </p>
        </div>
        {!isEmpty && !failed && (
          <Link href="/invoices/new" className={buttonStyles({ variant: 'accent' })}>
            <Plus aria-hidden className="h-4 w-4" /> New invoice
          </Link>
        )}
      </div>

      {loading && (
        <div role="status" className="flex justify-center py-16 text-text-muted">
          <Loader2 aria-hidden className="h-7 w-7 animate-spin" />
          <span className="sr-only">Loading your numbers</span>
        </div>
      )}

      {failed && (
        <Card zone="calm" className="space-y-3 p-6">
          <h2 className="text-heading">we couldn&rsquo;t load your numbers</h2>
          <p className="text-body text-text-soft">Check your connection and try again. Nothing was changed.</p>
          <Button zone="calm" variant="outline" onClick={load}>
            Try again
          </Button>
        </Card>
      )}

      {isEmpty && (
        <Card tone="peach" className="space-y-4 p-8 text-center">
          <BagCharacter size={56} mood="happy" className="mx-auto" decorative />
          <h2 className="text-title">no invoices yet</h2>
          <p className="mx-auto max-w-sm text-body text-text-soft">
            Send your first invoice in about two minutes. We&rsquo;ll track what&rsquo;s waiting and what&rsquo;s paid.
          </p>
          <Link href="/invoices/new" className={buttonStyles({ size: 'lg' })}>
            <Plus aria-hidden className="h-4 w-4" /> Create your first invoice
          </Link>
        </Card>
      )}

      {!loading &&
        !failed &&
        metrics.map((stat) => {
          const filters = [
            { label: 'Drafts', status: 'draft', count: stat.draft_count },
            { label: 'Sent', status: 'sent', count: stat.sent_count },
            { label: 'Viewed', status: 'viewed', count: stat.viewed_count },
            { label: 'Claimed', status: 'payment_claimed', count: stat.claimed_count },
            { label: 'Partial', status: 'partially_paid', count: stat.partially_paid_count },
            { label: 'Paid', status: 'paid', count: stat.paid_count },
            ...(stat.overdue_count > 0 ? [{ label: 'Overdue', status: 'overdue', count: stat.overdue_count }] : []),
          ];

          return (
            <section key={stat.currency} aria-labelledby={`cur-${stat.currency}`} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h2 id={`cur-${stat.currency}`} className="text-title">
                    {stat.currency}
                  </h2>
                  <span className="rounded-full bg-peach-chip px-2.5 py-0.5 text-caption font-extrabold">
                    {stat.invoices_count} {stat.invoices_count === 1 ? 'invoice' : 'invoices'}
                  </span>
                </div>
                <Link
                  href={`/invoices?currency=${stat.currency}`}
                  className={buttonStyles({ variant: 'link' })}
                >
                  View all {stat.currency} invoices <ArrowUpRight aria-hidden className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Card tone="mango" className="space-y-1">
                  <p className="text-body font-extrabold">Waiting on clients</p>
                  <Money
                    amountMinor={stat.outstanding_minor}
                    currency={stat.currency}
                    variant="inherit"
                    className="block text-amount-l"
                    hideCurrencyCode
                  />
                  <p className="text-caption">Sent or viewed, not paid yet</p>
                </Card>

                <Card className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-body font-extrabold">Overdue</p>
                    {stat.overdue_count > 0 && (
                      <span className="rounded-full bg-[#FFB3B3] px-2 py-0.5 text-caption font-extrabold text-[#5A1010]">
                        {stat.overdue_count} late
                      </span>
                    )}
                  </div>
                  <Money
                    amountMinor={stat.overdue_minor}
                    currency={stat.currency}
                    variant={stat.overdue_minor > 0 ? 'negative' : 'total'}
                    className="block text-amount-l"
                    hideCurrencyCode
                  />
                  <p className="text-caption text-text-muted">Past the due date</p>
                </Card>

                <Card className="space-y-1">
                  <p className="text-body font-extrabold">Paid this month</p>
                  <Money
                    amountMinor={stat.paid_this_month_minor}
                    currency={stat.currency}
                    variant="paid"
                    className="block text-amount-l"
                    hideCurrencyCode
                  />
                  <p className="text-caption text-text-muted">Confirmed this month</p>
                </Card>
              </div>

              <nav aria-label={`Filter ${stat.currency} invoices by status`} className="space-y-2">
                <p className="text-caption text-text-muted">Filter by status</p>
                <ul className="flex flex-wrap gap-2">
                  {filters.map((f) => (
                    <li key={f.status}>
                      <Link href={`/invoices?currency=${stat.currency}&status=${f.status}`} className={chipStyles()}>
                        {f.label} <span className="tabular font-extrabold">{f.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </section>
          );
        })}

      {!loading && !failed && !isEmpty && (
        <Card zone="calm" tone="peach">
          <p className="text-body">
            <span className="font-extrabold">Fast invoicing.</span> Share an invoice on WhatsApp or download it as a
            PDF. Payment details attach automatically.
          </p>
        </Card>
      )}
    </div>
  );
}
