'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from '@phosphor-icons/react';

import { BagCharacter } from '@/components/brand';
import {
  HeroOwedCard,
  NeedsAttentionStrip,
  RecentActivityFeed,
  SetupChecklistCard,
  ThisMonthCard,
  type CurrencyMetrics,
} from '@/components/dashboard';
import {
  ErrorState,
  PageContainer,
  PageHeader,
  buttonStyles,
} from '@/components/ui';

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
      .catch(() => {});

    return () => {
      live = false;
    };
  }, []);

  return name;
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className="h-56 animate-pulse border-brut border-ink bg-surface-tint" />
          <div className="h-32 animate-pulse border-brut border-ink bg-surface-tint" />
          <div className="h-28 animate-pulse border-brut border-ink bg-surface-tint" />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <div className="h-20 animate-pulse border-brut border-ink bg-surface-tint" />
          <div className="h-72 animate-pulse border-brut border-ink bg-surface-tint" />
        </div>
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
  const [hasDispatchedDocument, setHasDispatchedDocument] = useState<boolean | null>(null);

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
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metric = metrics.find((item) => item.currency === selected) ?? metrics[0];

  // Check metrics evidence of sent invoices or payments
  const hasMetricActivity = metrics.some(
    (m) =>
      (m.sent_count ?? 0) > 0 ||
      (m.paid_count ?? 0) > 0 ||
      (m.paid_this_month_minor ?? 0) > 0,
  );

  // Teaching mode is active until the first document is dispatched
  const isTeachingMode =
    hasDispatchedDocument === false ||
    (hasDispatchedDocument === null && !loading && !hasMetricActivity);

  const handleMilestonesLoaded = useCallback((dispatched: boolean) => {
    setHasDispatchedDocument(dispatched);
  }, []);

  return (
    <PageContainer width="list">
      <PageHeader
        title={name ? `Hi, ${name}` : 'Hi there'}
        actions={
          <Link
            href="/invoices/new"
            className={buttonStyles({ variant: 'accent' })}
          >
            <Plus aria-hidden weight="bold" className="h-4 w-4" />
            Create invoice
          </Link>
        }
      />

      {loading && <DashboardSkeleton />}

      {failed && (
        <ErrorState
          title="We couldn’t load your numbers"
          description="Check your connection and try again. Nothing was changed."
          retryLabel="Try again"
          onRetry={() => void load()}
        />
      )}

      {!loading && !failed && (
        <>
          {/* =========================================================================
              1. TEACHING MODE: New users before first invoice is sent (Guidance First)
              ========================================================================= */}
          {isTeachingMode ? (
            <div className="mx-auto max-w-2xl space-y-6">
              {/* Hero: Setup checklist sits above hero card, full size */}
              <SetupChecklistCard
                mode="hero"
                onMilestonesLoaded={handleMilestonesLoaded}
              />

              {/* Empty Owed to you card: 0.00 */}
              <HeroOwedCard
                isTeachingMode
                selectedCurrency={selected || 'NGN'}
              />

              {/* Friendly empty state mascot */}
              <div className="flex items-center gap-4 border-brut border-ink bg-surface p-6 shadow-brut-sm">
                <BagCharacter mood="happy" size={54} className="shrink-0" />
                <div>
                  <p className="text-body font-extrabold text-ink">
                    Nothing needs you yet. Nice and calm.
                  </p>
                  <p className="mt-1 text-caption text-text-soft">
                    Your invoices, client payments, and action items will appear here once you send your first invoice.
                  </p>
                </div>
              </div>

              {/* Reassurance note */}
              <p className="text-center text-caption font-extrabold text-text-muted">
                More sections appear after the first send
              </p>
            </div>
          ) : (
            /* =========================================================================
               2. MONEY MODE: Active users once first invoice is sent (Money & Actions First)
               ========================================================================= */
            <>
              {/* DESKTOP LAYOUT (Left 2/3 and Right 1/3) */}
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
                {/* Left two-thirds: Hero card -> Attention strip -> This month */}
                <div className="space-y-6 lg:col-span-8">
                  <HeroOwedCard
                    metric={metric}
                    metrics={metrics}
                    selectedCurrency={selected}
                    onCurrencyChange={setSelected}
                  />

                  <NeedsAttentionStrip
                    overdueCount={metric?.overdue_count ?? 0}
                    claimsCount={metric?.claimed_count ?? 0}
                    viewedCount={metric?.viewed_count ?? 0}
                    currency={metric?.currency ?? selected ?? 'NGN'}
                  />

                  <ThisMonthCard
                    paidMinor={metric?.paid_this_month_minor ?? 0}
                    paidCount={metric?.paid_count ?? 0}
                    sentCount={metric?.sent_count ?? 0}
                    draftCount={metric?.draft_count ?? 0}
                    currency={metric?.currency ?? selected ?? 'NGN'}
                  />
                </div>

                {/* Right third: Setup checklist (slim) -> Recent activity */}
                <div className="space-y-6 lg:col-span-4">
                  <SetupChecklistCard
                    mode="slim"
                    onMilestonesLoaded={handleMilestonesLoaded}
                  />

                  <RecentActivityFeed />
                </div>
              </div>

              {/* MOBILE LAYOUT (Single Column Top-to-Bottom) */}
              <div className="space-y-5 lg:hidden">
                {/* 1. Hero card: money owed to you */}
                <HeroOwedCard
                  metric={metric}
                  metrics={metrics}
                  selectedCurrency={selected}
                  onCurrencyChange={setSelected}
                />

                {/* 2. Needs your attention (max 3 rows or mascot) */}
                <NeedsAttentionStrip
                  overdueCount={metric?.overdue_count ?? 0}
                  claimsCount={metric?.claimed_count ?? 0}
                  viewedCount={metric?.viewed_count ?? 0}
                  currency={metric?.currency ?? selected ?? 'NGN'}
                />

                {/* 3. Setup checklist (slim bar below attention strip) */}
                <SetupChecklistCard
                  mode="slim"
                  onMilestonesLoaded={handleMilestonesLoaded}
                />

                {/* 4. This month (compact row: Paid, Sent, Drafts) */}
                <ThisMonthCard
                  paidMinor={metric?.paid_this_month_minor ?? 0}
                  paidCount={metric?.paid_count ?? 0}
                  sentCount={metric?.sent_count ?? 0}
                  draftCount={metric?.draft_count ?? 0}
                  currency={metric?.currency ?? selected ?? 'NGN'}
                />

                {/* 5. Recent activity feed */}
                <RecentActivityFeed />
              </div>
            </>
          )}
        </>
      )}
    </PageContainer>
  );
}
