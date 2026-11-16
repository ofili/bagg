
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  BarChart3,
  CreditCard,
  Filter,
  Loader2,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';

import {
  Card,
  PageContainer,
  PageHeader,
} from '@/components/ui';

const API = '/api/control-plane';

type Tab =
  | 'overview'
  | 'funnel'
  | 'cohorts'
  | 'segments'
  | 'billing'
  | 'events';

type Filters = {
  from_date: string;
  to_date: string;
  country: string;
  plan_code: string;
  acquisition_source: string;
};

type Overview = {
  account_count: number;
  workspace_count: number;
  profile_completed: number;
  first_document_created: number;
  first_document_dispatched: number;
  first_payment_confirmed: number;
  paid_subscriptions: number;
  profile_completion_rate: number;
  document_creation_rate: number;
  dispatch_rate: number;
  client_payment_rate: number;
  subscription_conversion_rate: number;
};

type FunnelStage = {
  key: string;
  count: number;
  conversion_rate: number;
  previous_stage_rate: number;
};

type Funnel = {
  cohort_size: number;
  measurement_unit: string;
  stages: FunnelStage[];
};

type CohortWindow = {
  eligible_accounts: number;
  initially_activated: number;
  commercially_activated: number;
  initial_activation_rate: number;
  commercial_activation_rate: number;
  mature: boolean;
};

type Cohort = {
  cohort_month: string;
  signup_accounts: number;
  windows: Record<string, CohortWindow>;
};

type SegmentItem = {
  workspace_id: string;
  business_name: string | null;
  country: string | null;
  onboarding_completed: boolean;
  created_at: string;
  workspace_age_days: number;
  owner_email: string;
  owner_name: string | null;
  plan_code: string;
  subscription_status: string | null;
};

type Segments = {
  counts: Record<string, number>;
  selected_segment: string;
  total: number;
  limit: number;
  offset: number;
  items: SegmentItem[];
};

type BillingRow = {
  currency: string;
  purchase_type: string;
  status: string;
  count: number;
  amount_minor: number;
};

type Billing = {
  checkout_count: number;
  successful_checkouts: number;
  failed_checkouts: number;
  pending_checkouts: number;
  revenue_by_currency: Array<{
    currency: string;
    subscription_revenue_minor: number;
    credit_pack_revenue_minor: number;
    total_revenue_minor: number;
  }>;
  checkout_breakdown: BillingRow[];
  currency_note?: string;
};

type ProductEvent = {
  event_id: string;
  event_name: string;
  event_version: number;
  workspace_id: string;
  user_id: string | null;
  source: string;
  properties: Record<string, string | number | boolean | null>;
  occurred_at: string;
};

type Events = {
  total: number;
  limit: number;
  offset: number;
  items: ProductEvent[];
};

const EMPTY_FILTERS: Filters = {
  from_date: '',
  to_date: '',
  country: '',
  plan_code: '',
  acquisition_source: '',
};

const SEGMENT_LABELS: Record<string, string> = {
  incomplete_setup: 'Incomplete setup',
  no_document: 'No document created',
  drafts_not_dispatched: 'Drafts not dispatched',
  dispatched_no_payment: 'Dispatched, no confirmed payment',
  pending_checkout: 'Pending checkout',
  failed_checkout: 'Failed checkout',
  paid_not_activated: 'Paid, not activated',
};

const FUNNEL_LABELS: Record<string, string> = {
  account_created: 'Account created',
  workspace_created: 'Workspace created',
  profile_completed: 'Business profile completed',
  first_document_created: 'First document created',
  first_document_dispatched: 'First document dispatched',
  first_payment_confirmed: 'First client payment confirmed',
  paid_subscription: 'Paid subscription',
};

const TABS: Array<{ key: Tab; label: string; icon: typeof Activity }> = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'funnel', label: 'Funnel', icon: ArrowDownRight },
  { key: 'cohorts', label: 'Cohorts', icon: Users },
  { key: 'segments', label: 'Segments', icon: Filter },
  { key: 'billing', label: 'Billing', icon: CreditCard },
  { key: 'events', label: 'Events', icon: Activity },
];

function queryString(filters: Filters, extra?: Record<string, string | number>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value.trim()) params.set(key, value.trim());
  }

  for (const [key, value] of Object.entries(extra ?? {})) {
    params.set(key, String(value));
  }

  return params.toString();
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.detail ||
      body.message ||
      `Request failed (${response.status})`,
    );
  }

  return response.json() as Promise<T>;
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-GB').format(value ?? 0);
}

function formatPercent(value: number | null | undefined) {
  return `${(value ?? 0).toFixed(1)}%`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoneyMinor(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${currency} ${(amount / 100).toFixed(2)}`;
  }
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="space-y-2">
      <p className="text-caption font-bold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="text-title-l font-extrabold tabular-nums text-ink">
        {value}
      </p>
      {detail && (
        <p className="text-caption text-text-soft">{detail}</p>
      )}
    </Card>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-title font-extrabold text-ink">{title}</h2>
        {description && (
          <p className="mt-1 text-body text-text-soft">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-brut-thin border-ink bg-surface p-8 text-center text-body text-text-soft">
      {children}
    </div>
  );
}

export default function ControlPlaneAnalyticsPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [tab, setTab] = useState<Tab>('overview');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortWindows, setCohortWindows] = useState<string[]>([]);
  const [segments, setSegments] = useState<Segments | null>(null);
  const [selectedSegment, setSelectedSegment] = useState('incomplete_setup');
  const [segmentOffset, setSegmentOffset] = useState(0);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [events, setEvents] = useState<Events | null>(null);
  const [eventName, setEventName] = useState('');
  const [eventSource, setEventSource] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersQuery = useMemo(
    () => queryString(appliedFilters),
    [appliedFilters],
  );

  useEffect(() => {
    let cancelled = false;

    async function verifyAccess() {
      try {
        const response = await fetch(`${API}/me`, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (cancelled) return;

        if (response.status === 401 || response.status === 403) {
          setAccessDenied(true);
          return;
        }

        if (!response.ok) {
          throw new Error('Could not verify control-plane access.');
        }

        setAuthorized(true);
      } catch {
        if (!cancelled) {
          setError('Could not verify your access. Refresh and try again.');
        }
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    }

    void verifyAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadOverview = useCallback(async () => {
    const [overviewData, funnelData] = await Promise.all([
      getJson<Overview>(`${API}/analytics/overview?${filtersQuery}`),
      getJson<Funnel>(`${API}/analytics/funnel?${filtersQuery}`),
    ]);

    setOverview(overviewData);
    setFunnel(funnelData);
  }, [filtersQuery]);

  const loadCohorts = useCallback(async () => {
    const data = await getJson<{
      items: Cohort[];
      windows: string[];
    }>(`${API}/analytics/cohorts?${filtersQuery}`);

    setCohorts(data.items ?? []);
    setCohortWindows(data.windows ?? []);
  }, [filtersQuery]);

  const loadSegments = useCallback(async () => {
    const query = queryString(appliedFilters, {
      segment: selectedSegment,
      limit: 50,
      offset: segmentOffset,
    });

    const data = await getJson<Segments>(
      `${API}/analytics/segments?${query}`,
    );

    setSegments(data);
  }, [appliedFilters, selectedSegment, segmentOffset]);

  const loadBilling = useCallback(async () => {
    const data = await getJson<Billing>(
      `${API}/analytics/billing?${filtersQuery}`,
    );

    setBilling(data);
  }, [filtersQuery]);

  const loadEvents = useCallback(async () => {
    const query = queryString(appliedFilters, {
      limit: 50,
      offset: 0,
      ...(eventName.trim() ? { event_name: eventName.trim() } : {}),
      ...(eventSource ? { event_source: eventSource } : {}),
    });

    const data = await getJson<Events>(
      `${API}/analytics/events?${query}`,
    );

    setEvents(data);
  }, [appliedFilters, eventName, eventSource]);

  const loadCurrentTab = useCallback(async () => {
    if (!authorized) return;

    setLoading(true);
    setError(null);

    try {
      if (tab === 'overview' || tab === 'funnel') {
        await loadOverview();
      } else if (tab === 'cohorts') {
        await loadCohorts();
      } else if (tab === 'segments') {
        await loadSegments();
      } else if (tab === 'billing') {
        await loadBilling();
      } else if (tab === 'events') {
        await loadEvents();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Analytics could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    authorized,
    tab,
    loadOverview,
    loadCohorts,
    loadSegments,
    loadBilling,
    loadEvents,
  ]);

  useEffect(() => {
    void loadCurrentTab();
  }, [loadCurrentTab]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    if (
      filters.from_date &&
      filters.to_date &&
      filters.from_date > filters.to_date
    ) {
      setError('The start date must be before or equal to the end date.');
      return;
    }

    setError(null);
    setSegmentOffset(0);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSegmentOffset(0);
  }

  const hasFilters = Object.values(appliedFilters).some(Boolean);

  if (checkingAccess) {
    return (
      <PageContainer width="wide">
        <div className="flex min-h-64 items-center justify-center gap-3 text-text-soft">
          <Loader2 className="h-5 w-5 animate-spin" />
          Verifying staff access…
        </div>
      </PageContainer>
    );
  }

  if (accessDenied) {
    return (
      <PageContainer width="wide">
        <PageHeader
          eyebrow="Restricted area"
          title="Control plane"
          description="This area is available to authorised Bagg staff only."
        />
        <Card className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-late-fg" />
          <div>
            <p className="font-bold text-ink">Access not authorised</p>
            <p className="mt-1 text-body text-text-soft">
              Your account does not have control-plane permissions.
              Contact a Bagg administrator if you believe this is incorrect.
            </p>
          </div>
        </Card>
      </PageContainer>
    );
  }

  if (!authorized) {
    return (
      <PageContainer width="wide">
        <PageHeader title="Control plane" />
        {error && <EmptyMessage>{error}</EmptyMessage>}
      </PageContainer>
    );
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        eyebrow="Bagg internal"
        title="Control plane"
        description="Monitor onboarding, activation, conversion and subscription performance across Bagg workspaces."
        actions={
          <button
            type="button"
            onClick={() => void loadCurrentTab()}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 border-brut-thin border-ink bg-surface px-3 text-sm font-bold text-ink shadow-brut-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="space-y-3 border-brut-thin border-ink bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-extrabold text-ink">Filters</p>
            <p className="text-caption text-text-soft">
              Applied to the selected analytics view.
            </p>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-caption font-bold text-text-soft hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="space-y-1">
            <span className="text-caption font-bold text-text-muted">From</span>
            <input
              type="date"
              value={filters.from_date}
              onChange={(event) => updateFilter('from_date', event.target.value)}
              className="min-h-10 w-full border-brut-thin border-ink bg-white px-2 text-sm text-ink"
            />
          </label>

          <label className="space-y-1">
            <span className="text-caption font-bold text-text-muted">To</span>
            <input
              type="date"
              value={filters.to_date}
              onChange={(event) => updateFilter('to_date', event.target.value)}
              className="min-h-10 w-full border-brut-thin border-ink bg-white px-2 text-sm text-ink"
            />
          </label>

          <label className="space-y-1">
            <span className="text-caption font-bold text-text-muted">Country code</span>
            <input
              value={filters.country}
              onChange={(event) => updateFilter('country', event.target.value.toUpperCase())}
              placeholder="NG"
              maxLength={3}
              className="min-h-10 w-full border-brut-thin border-ink bg-white px-3 text-sm text-ink"
            />
          </label>

          <label className="space-y-1">
            <span className="text-caption font-bold text-text-muted">Plan code</span>
            <input
              value={filters.plan_code}
              onChange={(event) => updateFilter('plan_code', event.target.value)}
              placeholder="creator_pro"
              className="min-h-10 w-full border-brut-thin border-ink bg-white px-3 text-sm text-ink"
            />
          </label>

          <label className="space-y-1">
            <span className="text-caption font-bold text-text-muted">Acquisition source</span>
            <input
              value={filters.acquisition_source}
              onChange={(event) => updateFilter('acquisition_source', event.target.value)}
              placeholder="referral"
              className="min-h-10 w-full border-brut-thin border-ink bg-white px-3 text-sm text-ink"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={applyFilters}
            className="min-h-10 border-brut border-ink bg-mango px-5 text-sm font-extrabold text-on-mango shadow-brut-sm"
          >
            Apply filters
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b-2 border-ink pb-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex shrink-0 items-center gap-2 border-brut-thin px-3 py-2 text-sm font-bold ${
              tab === key
                ? 'border-ink bg-mango text-on-mango shadow-brut-sm'
                : 'border-transparent text-text-soft hover:bg-surface-tint'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 border-brut-thin border-ink bg-status-late p-3 text-sm text-status-late-fg"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-3 text-sm text-text-soft">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading analytics…
        </div>
      )}

      {!loading && tab === 'overview' && overview && (
        <div className="space-y-8">
          <Section
            title="Acquisition and activation"
            description="Workspace and account counts for the selected signup period."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Accounts" value={formatNumber(overview.account_count)} />
              <MetricCard label="Workspaces" value={formatNumber(overview.workspace_count)} />
              <MetricCard
                label="Business profiles completed"
                value={formatNumber(overview.profile_completed)}
                detail={formatPercent(overview.profile_completion_rate)}
              />
              <MetricCard
                label="First documents created"
                value={formatNumber(overview.first_document_created)}
                detail={formatPercent(overview.document_creation_rate)}
              />
              <MetricCard
                label="First documents dispatched"
                value={formatNumber(overview.first_document_dispatched)}
                detail={formatPercent(overview.dispatch_rate)}
              />
              <MetricCard
                label="First client payments"
                value={formatNumber(overview.first_payment_confirmed)}
                detail={formatPercent(overview.client_payment_rate)}
              />
              <MetricCard
                label="Paid subscriptions"
                value={formatNumber(overview.paid_subscriptions)}
                detail={formatPercent(overview.subscription_conversion_rate)}
              />
            </div>
          </Section>

          <Section
            title="Activation progression"
            description="Share of filtered workspaces reaching each product milestone."
          >
            <div className="space-y-4 border-brut-thin border-ink bg-surface p-4">
              {[
                ['Business profile', overview.profile_completion_rate],
                ['First document', overview.document_creation_rate],
                ['First dispatch', overview.dispatch_rate],
                ['First confirmed payment', overview.client_payment_rate],
                ['Paid subscription', overview.subscription_conversion_rate],
              ].map(([label, rate]) => {
                const percentage = Number(rate) || 0;

                return (
                  <div key={String(label)} className="space-y-1">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="font-semibold text-ink">{label}</span>
                      <span className="font-bold tabular-nums text-ink">
                        {formatPercent(percentage)}
                      </span>
                    </div>
                    <div className="h-3 border-brut-thin border-ink bg-surface-tint">
                      <div
                        className="h-full bg-mango"
                        style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      )}

      {!loading && tab === 'funnel' && funnel && (
        <Section
          title="Activation and conversion funnel"
          description={`Measurement unit: ${funnel.measurement_unit}. Cohort size: ${formatNumber(funnel.cohort_size)}.`}
        >
          <div className="space-y-3">
            {funnel.stages.map((stage, index) => {
              const width = funnel.cohort_size > 0
                ? Math.max(0, Math.min(100, stage.count / funnel.cohort_size * 100))
                : 0;

              return (
                <div
                  key={stage.key}
                  className="border-brut-thin border-ink bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center border-brut-thin border-ink bg-surface-tint text-sm font-extrabold">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-bold text-ink">
                          {FUNNEL_LABELS[stage.key] ?? stage.key}
                        </p>
                        <p className="text-caption text-text-soft">
                          {formatPercent(stage.previous_stage_rate)} from previous stage
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-title font-extrabold tabular-nums text-ink">
                        {formatNumber(stage.count)}
                      </p>
                      <p className="text-caption text-text-soft">
                        {formatPercent(stage.conversion_rate)} of cohort
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-3 border-brut-thin border-ink bg-surface-tint">
                    <div
                      className="h-full bg-mango"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {!loading && tab === 'cohorts' && (
        <Section
          title="Signup cohorts"
          description="Activation measured within fixed windows after account creation. Immature windows are not counted as failures."
        >
          {cohorts.length === 0 ? (
            <EmptyMessage>No cohort data for this filter.</EmptyMessage>
          ) : (
            <div className="overflow-x-auto border-brut-thin border-ink bg-surface">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b-2 border-ink bg-surface-tint">
                  <tr>
                    <th className="p-3">Signup month</th>
                    <th className="p-3 text-right">Accounts</th>
                    {cohortWindows.map((window) => (
                      <th key={window} className="p-3 text-right">
                        {window} dispatch
                      </th>
                    ))}
                    {cohortWindows.map((window) => (
                      <th key={`${window}-paid`} className="p-3 text-right">
                        {window} payment
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((cohort) => (
                    <tr key={cohort.cohort_month} className="border-b border-ink/20">
                      <td className="p-3 font-bold text-ink">{cohort.cohort_month}</td>
                      <td className="p-3 text-right tabular-nums">
                        {formatNumber(cohort.signup_accounts)}
                      </td>
                      {cohortWindows.map((window) => {
                        const item = cohort.windows[window];

                        return (
                          <td key={window} className="p-3 text-right tabular-nums">
                            {item?.mature
                              ? formatPercent(item.initial_activation_rate)
                              : '—'}
                          </td>
                        );
                      })}
                      {cohortWindows.map((window) => {
                        const item = cohort.windows[window];

                        return (
                          <td key={`${window}-paid`} className="p-3 text-right tabular-nums">
                            {item?.mature
                              ? formatPercent(item.commercial_activation_rate)
                              : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {!loading && tab === 'segments' && (
        <div className="space-y-5">
          <Section
            title="Operational segments"
            description="Find workspaces that may need onboarding assistance or commercial follow-up."
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(segments?.counts ?? {}).map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedSegment(key);
                    setSegmentOffset(0);
                  }}
                  className={`border-brut-thin border-ink p-3 text-left ${
                    selectedSegment === key
                      ? 'bg-mango text-on-mango shadow-brut-sm'
                      : 'bg-surface text-ink'
                  }`}
                >
                  <p className="text-caption font-bold">
                    {SEGMENT_LABELS[key] ?? key}
                  </p>
                  <p className="mt-1 text-title font-extrabold tabular-nums">
                    {formatNumber(count)}
                  </p>
                </button>
              ))}
            </div>
          </Section>

          <Section
            title={SEGMENT_LABELS[selectedSegment] ?? selectedSegment}
            description={`${formatNumber(segments?.total)} workspaces in this segment.`}
          >
            {!segments?.items.length ? (
              <EmptyMessage>No workspaces in this segment.</EmptyMessage>
            ) : (
              <>
                <div className="overflow-x-auto border-brut-thin border-ink bg-surface">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="border-b-2 border-ink bg-surface-tint">
                      <tr>
                        <th className="p-3">Business</th>
                        <th className="p-3">Owner</th>
                        <th className="p-3">Country</th>
                        <th className="p-3">Plan</th>
                        <th className="p-3">Workspace age</th>
                        <th className="p-3">Setup</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segments.items.map((item) => (
                        <tr key={item.workspace_id} className="border-b border-ink/20">
                          <td className="p-3 font-bold text-ink">
                            {item.business_name || 'Unnamed workspace'}
                          </td>
                          <td className="p-3">
                            <p className="font-semibold">{item.owner_name || '—'}</p>
                            <p className="text-caption text-text-soft">{item.owner_email}</p>
                          </td>
                          <td className="p-3">{item.country || '—'}</td>
                          <td className="p-3">{item.plan_code}</td>
                          <td className="p-3 tabular-nums">{item.workspace_age_days} days</td>
                          <td className="p-3">
                            {item.onboarding_completed ? 'Complete' : 'Incomplete'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-caption text-text-soft">
                    Showing {segments.offset + 1}–{Math.min(
                      segments.offset + segments.limit,
                      segments.total,
                    )} of {formatNumber(segments.total)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={segmentOffset === 0}
                      onClick={() => setSegmentOffset((value) => Math.max(0, value - 50))}
                      className="min-h-9 border-brut-thin border-ink px-3 text-sm font-bold disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={segmentOffset + 50 >= segments.total}
                      onClick={() => setSegmentOffset((value) => value + 50)}
                      className="min-h-9 border-brut-thin border-ink px-3 text-sm font-bold disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </Section>
        </div>
      )}

      {!loading && tab === 'billing' && billing && (
        <div className="space-y-8">
          <Section
            title="Subscription and credit checkout"
            description="Subscription purchases and credit-pack purchases remain separate. Revenue is never combined across currencies."
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard label="Total checkouts" value={formatNumber(billing.checkout_count)} />
              <MetricCard label="Successful" value={formatNumber(billing.successful_checkouts)} />
              <MetricCard label="Pending" value={formatNumber(billing.pending_checkouts)} />
              <MetricCard label="Failed" value={formatNumber(billing.failed_checkouts)} />
            </div>
          </Section>

          <Section title="Revenue by currency">
            {!billing.revenue_by_currency?.length ? (
              <EmptyMessage>No successful checkout revenue in this period.</EmptyMessage>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {billing.revenue_by_currency.map((item) => (
                  <Card key={item.currency} className="space-y-3">
                    <p className="font-extrabold text-ink">{item.currency}</p>
                    <p className="text-title-l font-extrabold tabular-nums text-ink">
                      {formatMoneyMinor(item.total_revenue_minor, item.currency)}
                    </p>
                    <div className="space-y-1 text-caption text-text-soft">
                      <div className="flex justify-between gap-2">
                        <span>Subscriptions</span>
                        <span className="font-bold text-ink">
                          {formatMoneyMinor(item.subscription_revenue_minor, item.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span>Credit packs</span>
                        <span className="font-bold text-ink">
                          {formatMoneyMinor(item.credit_pack_revenue_minor, item.currency)}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {billing.currency_note && (
              <p className="text-caption text-text-soft">{billing.currency_note}</p>
            )}
          </Section>

          <Section title="Checkout breakdown">
            {!billing.checkout_breakdown?.length ? (
              <EmptyMessage>No checkout activity in this period.</EmptyMessage>
            ) : (
              <div className="overflow-x-auto border-brut-thin border-ink bg-surface">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="border-b-2 border-ink bg-surface-tint">
                    <tr>
                      <th className="p-3">Currency</th>
                      <th className="p-3">Purchase type</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Count</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.checkout_breakdown.map((row, index) => (
                      <tr key={`${row.currency}-${row.purchase_type}-${row.status}-${index}`} className="border-b border-ink/20">
                        <td className="p-3 font-bold">{row.currency}</td>
                        <td className="p-3">{row.purchase_type}</td>
                        <td className="p-3">{row.status}</td>
                        <td className="p-3 text-right tabular-nums">{formatNumber(row.count)}</td>
                        <td className="p-3 text-right tabular-nums">
                          {formatMoneyMinor(row.amount_minor, row.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}

      {!loading && tab === 'events' && (
        <div className="space-y-5">
          <Section
            title="Product event explorer"
            description="Inspect recorded product events. Sensitive event properties are filtered by the API."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="text-caption font-bold text-text-muted">Event name</span>
                <input
                  value={eventName}
                  onChange={(event) => setEventName(event.target.value)}
                  placeholder="payment.first_confirmed"
                  className="min-h-10 w-full border-brut-thin border-ink bg-white px-3 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-caption font-bold text-text-muted">Event origin</span>
                <select
                  value={eventSource}
                  onChange={(event) => setEventSource(event.target.value)}
                  className="min-h-10 w-full border-brut-thin border-ink bg-white px-3 text-sm"
                >
                  <option value="">All origins</option>
                  <option value="api">API</option>
                  <option value="web">Web</option>
                  <option value="client">Client</option>
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void loadEvents()}
                  className="min-h-10 w-full border-brut border-ink bg-mango px-4 text-sm font-extrabold text-on-mango shadow-brut-sm"
                >
                  Search events
                </button>
              </div>
            </div>
          </Section>

          <Section
            title="Recorded events"
            description={`${formatNumber(events?.total)} matching events.`}
          >
            {!events?.items.length ? (
              <EmptyMessage>No events match the current filters.</EmptyMessage>
            ) : (
              <div className="space-y-3">
                {events.items.map((event) => (
                  <details
                    key={event.event_id}
                    className="border-brut-thin border-ink bg-surface"
                  >
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-3">
                      <div>
                        <p className="font-bold text-ink">{event.event_name}</p>
                        <p className="text-caption text-text-soft">
                          {formatDateTime(event.occurred_at)} · {event.source} · v{event.event_version}
                        </p>
                      </div>
                      <span className="text-caption text-text-soft">
                        {event.workspace_id}
                      </span>
                    </summary>

                    <div className="border-t border-ink/20 p-3">
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-text-soft">
                        {JSON.stringify(event.properties, null, 2)}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {!loading &&
        ((tab === 'overview' && !overview) ||
          (tab === 'funnel' && !funnel) ||
          (tab === 'billing' && !billing)) &&
        !error && (
          <EmptyMessage>No analytics data is available for this view.</EmptyMessage>
        )}
    </PageContainer>
  );
}
