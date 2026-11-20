
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
import { cn } from '@/lib/cn';

const API_BASE = '/api';

type SetupVisibility = 'expanded' | 'minimized' | 'dismissed';

interface DashboardProfile {
  name: string;
  workspaceId: string | null;
  loaded: boolean;
}

function useDashboardProfile(): DashboardProfile {
  const [profile, setProfile] = useState<DashboardProfile>({
    name: '',
    workspaceId: null,
    loaded: false,
  });

  useEffect(() => {
    let live = true;

    fetch(`${API_BASE}/auth/me`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!live) return;

        const fullName = data?.user?.full_name?.trim();
        const businessName = data?.workspace?.business_name?.trim();
        const workspaceId = data?.workspace?.id;

        setProfile({
          name: fullName
            ? fullName.split(/\s+/)[0]
            : businessName || '',
          workspaceId:
            typeof workspaceId === 'string' && workspaceId.length > 0
              ? workspaceId
              : null,
          loaded: true,
        });
      })
      .catch(() => {
        if (live) {
          setProfile({
            name: '',
            workspaceId: null,
            loaded: true,
          });
        }
      });

    return () => {
      live = false;
    };
  }, []);

  return profile;
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

  const profile = useDashboardProfile();

  const [setupVisibility, setSetupVisibility] =
    useState<SetupVisibility>('expanded');
  const [setupPreferenceReady, setSetupPreferenceReady] = useState(false);

  const setupPreferenceKey = profile.workspaceId
    ? `bagg:dashboard:setup-visibility:${profile.workspaceId}`
    : null;

  useEffect(() => {
    if (!profile.loaded) return;

    let visibility: SetupVisibility = 'expanded';

    if (setupPreferenceKey) {
      try {
        const saved = window.localStorage.getItem(setupPreferenceKey);

        if (
          saved === 'expanded' ||
          saved === 'minimized' ||
          saved === 'dismissed'
        ) {
          visibility = saved;
        }
      } catch {
        // The dashboard remains usable when browser storage is unavailable.
      }
    }

    setSetupVisibility(visibility);
    setSetupPreferenceReady(true);
  }, [profile.loaded, setupPreferenceKey]);

  const changeSetupVisibility = useCallback(
    (visibility: SetupVisibility) => {
      setSetupVisibility(visibility);

      if (!setupPreferenceKey) return;

      try {
        window.localStorage.setItem(setupPreferenceKey, visibility);
      } catch {
        // Persistence is best-effort; the current page state still updates.
      }
    },
    [setupPreferenceKey],
  );

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

  const hasMetricActivity = metrics.some(
    (m) =>
      (m.sent_count ?? 0) > 0 ||
      (m.paid_count ?? 0) > 0 ||
      (m.paid_this_month_minor ?? 0) > 0,
  );

  const isTeachingMode =
    hasDispatchedDocument === false ||
    (hasDispatchedDocument === null && !loading && !hasMetricActivity);

  const handleMilestonesLoaded = useCallback((dispatched: boolean) => {
    setHasDispatchedDocument(dispatched);
  }, []);

  return (
    <PageContainer width="list">
      <PageHeader
        title={profile.name ? `Hi, ${profile.name}` : 'Hi there'}
        actions={
          <>
            {setupPreferenceReady && setupVisibility === 'dismissed' && (
              <button
                type="button"
                onClick={() => changeSetupVisibility('expanded')}
                className="inline-flex items-center rounded-btn border-brut-thin border-ink bg-surface px-3 py-2 text-caption font-extrabold text-ink shadow-brut-sm transition-colors hover:bg-surface-tint"
              >
                Setup guide
              </button>
            )}

            <Link
              href="/invoices/new"
              className={cn(buttonStyles({ variant: 'accent' }), 'hidden sm:inline-flex')}
            >
              <Plus aria-hidden weight="bold" className="h-4 w-4" />
              Create invoice
            </Link>
          </>
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
          {isTeachingMode ? (
            <div className="mx-auto max-w-2xl space-y-6">
              {setupPreferenceReady && (
                <SetupChecklistCard
                  mode="hero"
                  visibility={setupVisibility}
                  onVisibilityChange={changeSetupVisibility}
                  onMilestonesLoaded={handleMilestonesLoaded}
                />
              )}

              <HeroOwedCard
                isTeachingMode
                selectedCurrency={selected || 'NGN'}
              />

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

              <p className="text-center text-caption font-extrabold text-text-muted">
                More sections appear after the first send
              </p>
            </div>
          ) : (
            <>
              <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6">
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

                <div className="space-y-6 lg:col-span-4">
                  {setupPreferenceReady && (
                    <SetupChecklistCard
                      mode="slim"
                      visibility={setupVisibility}
                      onVisibilityChange={changeSetupVisibility}
                      onMilestonesLoaded={handleMilestonesLoaded}
                    />
                  )}

                  <RecentActivityFeed />
                </div>
              </div>

              <div className="space-y-5 lg:hidden">
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

                {setupPreferenceReady && (
                  <SetupChecklistCard
                    mode="slim"
                    visibility={setupVisibility}
                    onVisibilityChange={changeSetupVisibility}
                    onMilestonesLoaded={handleMilestonesLoaded}
                  />
                )}

                <ThisMonthCard
                  paidMinor={metric?.paid_this_month_minor ?? 0}
                  paidCount={metric?.paid_count ?? 0}
                  sentCount={metric?.sent_count ?? 0}
                  draftCount={metric?.draft_count ?? 0}
                  currency={metric?.currency ?? selected ?? 'NGN'}
                />

                <RecentActivityFeed />
              </div>
            </>
          )}
        </>
      )}
    </PageContainer>
  );
}