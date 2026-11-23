"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react";

import { BagCharacter } from "@/components/brand";
import {
  HeroOwedCard,
  NeedsAttentionStrip,
  PerformanceCard,
  RecentActivityFeed,
  SetupChecklistCard,
  type CurrencyMetrics,
  type CurrencyMonthMetrics,
} from "@/components/dashboard";
import {
  ErrorState,
  PageContainer,
  PageHeader,
  buttonStyles,
} from "@/components/ui";
import { cn } from "@/lib/cn";

const API_BASE = "/api";

type SetupVisibility = "expanded" | "minimized" | "dismissed";

interface DashboardProfile {
  name: string;
  workspaceId: string | null;
  loaded: boolean;
}

function useDashboardProfile(): DashboardProfile {
  const [profile, setProfile] = useState<DashboardProfile>({
    name: "",
    workspaceId: null,
    loaded: false,
  });

  useEffect(() => {
    let live = true;

    fetch(`${API_BASE}/auth/me`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!live) return;

        const fullName = data?.user?.full_name?.trim();
        const businessName = data?.workspace?.business_name?.trim();
        const workspaceId = data?.workspace?.id;

        setProfile({
          name: fullName ? fullName.split(/\s+/)[0] : businessName || "",
          workspaceId:
            typeof workspaceId === "string" && workspaceId.length > 0
              ? workspaceId
              : null,
          loaded: true,
        });
      })
      .catch(() => {
        if (live) {
          setProfile({
            name: "",
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-5 lg:col-span-8">
          <div className="h-56 animate-pulse border-brut border-ink bg-surface-tint motion-reduce:animate-none" />
          <div className="h-32 animate-pulse border-brut border-ink bg-surface-tint motion-reduce:animate-none" />
          <div className="h-80 animate-pulse border-brut border-ink bg-surface-tint motion-reduce:animate-none" />
        </div>

        <div className="space-y-5 lg:col-span-4">
          <div className="h-20 animate-pulse border-brut border-ink bg-surface-tint motion-reduce:animate-none" />
          <div className="h-72 animate-pulse border-brut border-ink bg-surface-tint motion-reduce:animate-none" />
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
  const [selected, setSelected] = useState("");
  const [history, setHistory] = useState<CurrencyMonthMetrics[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [hasDispatchedDocument, setHasDispatchedDocument] = useState<
    boolean | null
  >(null);

  const profile = useDashboardProfile();

  const [setupVisibility, setSetupVisibility] =
    useState<SetupVisibility>("expanded");
  const [setupPreferenceReady, setSetupPreferenceReady] = useState(false);

  const setupPreferenceKey = profile.workspaceId
    ? `bagg:dashboard:setup-visibility:${profile.workspaceId}`
    : null;

  useEffect(() => {
    if (!profile.loaded) return;

    let visibility: SetupVisibility = "expanded";

    if (setupPreferenceKey) {
      try {
        const saved = window.localStorage.getItem(setupPreferenceKey);

        if (
          saved === "expanded" ||
          saved === "minimized" ||
          saved === "dismissed"
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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryFailed(false);

    try {
      const response = await fetch(
        `${API_BASE}/invoices/metrics/history?months=6`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Could not load performance history");
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid performance history response");
      }

      setHistory(data as CurrencyMonthMetrics[]);
    } catch {
      setHistoryFailed(true);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);

    try {
      const response = await fetch(`${API_BASE}/invoices/metrics`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not load dashboard metrics");
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid dashboard metrics response");
      }

      const nextMetrics = data as CurrencyMetrics[];

      setMetrics(nextMetrics);
      setSelected((current) =>
        nextMetrics.some((item) => item.currency === current)
          ? current
          : (nextMetrics[0]?.currency ?? ""),
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

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const metric =
    metrics.find((item) => item.currency === selected) ?? metrics[0];

  const hasMetricActivity = metrics.some(
    (item) =>
      (item.sent_count ?? 0) > 0 ||
      (item.paid_count ?? 0) > 0 ||
      (item.paid_this_month_minor ?? 0) > 0,
  );

  const isTeachingMode =
    !loading && !hasMetricActivity && hasDispatchedDocument !== true;

  const handleMilestonesLoaded = useCallback((dispatched: boolean) => {
    setHasDispatchedDocument(dispatched);
  }, []);

  // In teaching mode, the expanded setup guide already contains a prominent
  // create-invoice action. If it is minimised or dismissed, expose that action
  // in the page header on mobile as well as desktop.
  const showHeaderCreateAction =
    !isTeachingMode || !setupPreferenceReady || setupVisibility !== "expanded";

  return (
    <PageContainer width="list">
      <PageHeader
        eyebrow="Your workspace"
        title={profile.name ? `Hi, ${profile.name}` : "Hi there"}
        description="A clear view of what you’re owed, what needs attention, and what’s happening across your invoices."
        actions={
          <>
            {setupPreferenceReady && setupVisibility === "dismissed" && (
              <button
                type="button"
                onClick={() => changeSetupVisibility("expanded")}
                className="inline-flex min-h-11 items-center rounded-btn border-brut-thin border-ink bg-surface px-3 py-2 text-caption font-extrabold text-ink shadow-brut-sm transition-colors hover:bg-surface-tint"
              >
                Setup guide
              </button>
            )}

            {showHeaderCreateAction && (
              <Link
                href="/invoices/new"
                className={cn(
                  buttonStyles({ variant: "accent" }),
                  "w-full sm:w-auto",
                )}
              >
                <Plus aria-hidden weight="bold" className="h-4 w-4" />
                Create invoice
              </Link>
            )}
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
            <div className="mx-auto w-full max-w-2xl space-y-5">
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
                selectedCurrency={selected || "NGN"}
              />

              <div className="flex items-center gap-4 border-brut border-ink bg-surface p-5 shadow-brut-sm sm:p-6">
                <BagCharacter
                  mood="sleepy"
                  size={54}
                  className="shrink-0"
                  decorative
                />
                <div>
                  <p className="text-body font-extrabold text-ink">
                    nothing to chase yet.
                  </p>
                  <p className="mt-1 text-caption text-text-soft">
                    Nothing needs you right now. Your invoices, client payments,
                    and action items will appear here once you send your first
                    invoice.
                  </p>
                </div>
              </div>

              <p className="text-center text-caption font-extrabold text-text-muted">
                More sections appear after the first send
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
              <div className="space-y-5 lg:col-span-8 lg:space-y-6">
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
                  currency={metric?.currency ?? selected ?? "NGN"}
                />

                <PerformanceCard
                  paidMinor={metric?.paid_this_month_minor ?? 0}
                  sentCount={metric?.sent_count ?? 0}
                  draftCount={metric?.draft_count ?? 0}
                  currency={metric?.currency ?? selected ?? "NGN"}
                  history={history}
                  historyLoading={historyLoading}
                  historyFailed={historyFailed}
                  onRetryHistory={() => void loadHistory()}
                />
              </div>

              <div className="space-y-5 lg:col-span-4 lg:space-y-6">
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
          )}
        </>
      )}
    </PageContainer>
  );
}
