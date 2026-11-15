'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Scroll } from '@phosphor-icons/react';

import {
  AllCaughtUp,
  AttentionPanel,
  KpiGrid,
  OutstandingCard,
  QuickActions,
  StatusNavigation,
  type CurrencyMetrics,
} from '@/components/dashboard';
import { SetupChecklist } from '@/components/mobile/SetupChecklist';
import {
  Card,
  EmptyState,
  ErrorState,
  PageContainer,
  PageHeader,
  buttonStyles,
} from '@/components/ui';
import { cn } from '@/lib/cn';

const API_BASE = '/api';

function useFirstName() {
  const [name, setName] = useState('');

  useEffect(() => {
    let live = true;

    fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!live || !data) return;

        const fullName = data.user?.full_name?.trim();
        const businessName = data.workspace?.business_name?.trim();

        setName(
          fullName
            ? fullName.split(/\s+/)[0]
            : businessName || '',
        );
      })
      .catch(() => {
        // The dashboard remains usable without a greeting name.
      });

    return () => {
      live = false;
    };
  }, []);

  return name;
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="h-60 animate-pulse border-brut border-ink bg-surface-tint motion-reduce:animate-none lg:col-span-8" />
        <div className="grid gap-3 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse border-brut-thin border-ink bg-surface-tint motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-44 animate-pulse border-brut border-ink bg-surface-tint motion-reduce:animate-none" />
        <div className="h-44 animate-pulse border-brut border-ink bg-surface-tint motion-reduce:animate-none" />
      </div>

      <span className="sr-only">Loading your business activity</span>
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<CurrencyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState('');
  const [counts, setCounts] = useState<{
    claims: number | null;
    overdue: number | null;
  }>({
    claims: null,
    overdue: null,
  });

  const name = useFirstName();

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);

    try {
      const response = await fetch(`${API_BASE}/invoices/metrics`, {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Could not load dashboard metrics');
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid dashboard metrics response');
      }

      const nextMetrics = data as CurrencyMetrics[];

      setMetrics(nextMetrics);
      setSelected((current) =>
        nextMetrics.some((item) => item.currency === current)
          ? current
          : nextMetrics[0]?.currency ?? '',
      );
    } catch {
      // Do not display zero-valued metrics after a failed request.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setCounts({ claims: null, overdue: null });
  }, [selected]);

  const metric = metrics.find((item) => item.currency === selected) ?? metrics[0];

  const isEmpty =
    !loading &&
    !failed &&
    (metrics.length === 0 ||
      metrics.every((item) => (item.invoices_count ?? 0) === 0));

  const handleClaimsCount = useCallback((count: number) => {
    setCounts((current) => ({ ...current, claims: count }));
  }, []);

  const handleOverdueCount = useCallback((count: number) => {
    setCounts((current) => ({ ...current, overdue: count }));
  }, []);

  const claimsCount = counts.claims && counts.claims > 0 ? counts.claims : 0;
  const overdueCount = counts.overdue && counts.overdue > 0 ? counts.overdue : 0;
  const totalAttentionCount = claimsCount + overdueCount;

  const caughtUp =
    counts.claims === 0 &&
    counts.overdue === 0;

  return (
    <PageContainer width="list">
      <PageHeader
        eyebrow="Your workspace"
        title={name ? `Good to see you, ${name}` : 'Your business'}
        description="Keep track of what you have invoiced, what is owed, what needs you."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/quotes/new"
              className={cn(
                buttonStyles({ variant: 'outline', zone: 'calm' }),
                'hidden sm:inline-flex',
              )}
            >
              <Scroll aria-hidden className="h-4 w-4" />
              New quote
            </Link>
            <Link
              href="/invoices/new"
              className={cn(
                buttonStyles({ variant: 'accent' }),
                'hidden sm:inline-flex',
              )}
            >
              <Plus aria-hidden className="h-4 w-4" />
              New invoice
            </Link>
          </div>
        }
      />

      <SetupChecklist />

      {loading && <DashboardSkeleton />}

      {failed && (
        <ErrorState
          title="We couldn’t load your numbers"
          description="Check your connection and try again. Nothing was changed."
          retryLabel="Try again"
          onRetry={() => void load()}
        />
      )}

      {isEmpty && (
        <>
          <Card zone="expressive" tone="peach">
            <EmptyState
              title="No invoices yet"
              body="Create your first invoice and send it by email or WhatsApp. Bagg will help you keep track of payment."
              action={{
                label: 'Create your first invoice',
                href: '/invoices/new',
              }}
            />
          </Card>

          <QuickActions />
        </>
      )}

      {!loading && !failed && metric && !isEmpty && (
        <>
          {/* Hero snapshot & secondary KPIs */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <OutstandingCard
                metric={metric}
                metrics={metrics}
                selectedCurrency={selected}
                onCurrencyChange={setSelected}
              />
            </div>
            <div className="lg:col-span-4">
              <KpiGrid metric={metric} />
            </div>
          </div>

          {/* Needs attention queue */}
          <section aria-labelledby="needs-attention-heading" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2
                  id="needs-attention-heading"
                  className="text-title font-extrabold text-ink"
                >
                  Needs you now
                </h2>
                {totalAttentionCount > 0 && (
                  <span className="rounded-full border-brut-thin border-ink bg-status-late px-2.5 py-0.5 text-caption font-extrabold text-status-late-fg">
                    {totalAttentionCount}
                  </span>
                )}
              </div>
            </div>

            {caughtUp ? (
              <AllCaughtUp />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AttentionPanel
                  title="Confirm payments"
                  status="payment_claimed"
                  currency={metric.currency}
                  actionLabel="Review"
                  emptyMessage="No payments waiting for confirmation."
                  onCount={handleClaimsCount}
                />

                <AttentionPanel
                  title="Overdue invoices"
                  status="overdue"
                  currency={metric.currency}
                  actionLabel="Follow up"
                  emptyMessage="No overdue invoices."
                  onCount={handleOverdueCount}
                />
              </div>
            )}
          </section>

          {/* Shortcuts (secondary) */}
          <QuickActions />

          {/* Status browse (secondary) */}
          <StatusNavigation metric={metric} />
        </>
      )}
    </PageContainer>
  );
}
