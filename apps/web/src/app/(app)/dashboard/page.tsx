
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  FileText,
  UserPlus,
} from 'lucide-react';
import { ArrowClockwiseIcon } from '@phosphor-icons/react';

import { SetupChecklist } from '@/components/mobile/SetupChecklist';
import { Money } from '@/components/money/Money';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  SectionHeader,
  buttonStyles,
  chipStyles,
} from '@/components/ui';
import { useDataTable } from '@/hooks/useDataTable';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

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

interface InvoiceRow {
  id: string;
  invoice_number: string;
  client_name?: string | null;
  currency: string;
  total_minor: number;
  amount_paid_minor: number;
  due_date: string;
  days_overdue?: number;
}

type AttentionStatus = 'payment_claimed' | 'overdue';

const QUICK_ACTIONS = [
  { label: 'Invoice', href: '/invoices/new', icon: FileText },
  { label: 'Quote', href: '/quotes/new', icon: FileCheck },
  { label: 'Client', href: '/clients/new', icon: UserPlus },
  { label: 'Recurring', href: '/recurring-invoices', icon: ArrowClockwiseIcon },
] as const;

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
    <div role="status" aria-label="Loading dashboard" className="space-y-5">
      <div className="h-36 animate-pulse rounded-card border-brut border-ink bg-surface-tint" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-card border-brut-thin border-ink bg-surface-tint"
          />
        ))}
      </div>
      <div className="h-28 animate-pulse rounded-card border-brut-thin border-ink bg-surface-tint" />
      <span className="sr-only">Loading your business activity</span>
    </div>
  );
}

function CurrencySelector({
  metrics,
  selected,
  onChange,
}: {
  metrics: CurrencyMetrics[];
  selected: string;
  onChange: (currency: string) => void;
}) {
  if (metrics.length <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Select currency"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {metrics.map((metric) => {
        const active = metric.currency === selected;

        return (
          <button
            key={metric.currency}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(metric.currency)}
            className={cn(
              'min-h-11 shrink-0 rounded-full border-brut-thin border-ink px-4 text-body',
              active
                ? 'bg-sun font-extrabold text-[#4A3200]'
                : 'bg-surface font-medium text-text-soft hover:bg-surface-tint',
            )}
          >
            {metric.currency}
          </button>
        );
      })}
    </div>
  );
}

function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              buttonStyles({ variant: 'outline', zone: 'calm' }),
              'min-h-12 justify-center gap-2 px-2 text-body',
            )}
          >
            <Icon aria-hidden className="h-[18px] w-[18px] shrink-0" />
            {action.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AttentionList({
  title,
  status,
  currency,
  actionLabel,
  onCount,
}: {
  title: string;
  status: AttentionStatus;
  currency: string;
  actionLabel: string;
  onCount: (count: number) => void;
}) {
  const table = useDataTable<InvoiceRow>({
    endpoint: '/invoices',
    defaultSortBy: 'due_date',
    defaultSortOrder: 'asc',
    defaultPerPage: 5,
    extraParams: currency ? { status, currency } : { status },
  });

  const rows = table.data?.items ?? [];
  const total = table.data?.total ?? 0;

  useEffect(() => {
    if (!table.loading) {
      onCount(table.error ? -1 : total);
    }
  }, [table.loading, table.error, total, onCount]);

  if (table.loading && !table.data) {
    return (
      <section aria-label={title} className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded bg-surface-tint" />
        <div className="h-20 animate-pulse rounded-card border border-line-subtle bg-surface" />
      </section>
    );
  }

  if (table.error) {
    return (
      <Card zone="calm" className="space-y-2">
        <SectionHeader title={title} />
        <p role="alert" className="text-body text-text-soft">
          This list could not be loaded. Your other dashboard information is still available.
        </p>
        <Button
          zone="calm"
          variant="outline"
          onClick={() => void table.reload()}
        >
          Retry
        </Button>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  const href = `/invoices?status=${status}&currency=${encodeURIComponent(currency)}`;

  return (
    <section aria-label={title} className="space-y-3">
      <SectionHeader
        title={title}
        action={
          total > rows.length ? (
            <Link href={href} className={buttonStyles({ variant: 'link' })}>
              See all {total}
            </Link>
          ) : undefined
        }
      />

      <ul className="space-y-2">
        {rows.map((invoice) => {
          const outstanding = Math.max(
            0,
            invoice.total_minor - invoice.amount_paid_minor,
          );

          return (
            <li key={invoice.id}>
              <Link
                href={`/invoices/${encodeURIComponent(invoice.id)}`}
                className={cn(
                  'flex min-h-[72px] items-center gap-3 rounded-card',
                  'border-brut-thin border-ink bg-surface p-3 shadow-brut-sm',
                  'transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-extrabold text-text">
                    {invoice.client_name || 'Unnamed client'}
                  </p>
                  <p className="text-caption text-text-soft">
                    {invoice.invoice_number}
                    {invoice.due_date ? ` · Due ${formatDate(invoice.due_date)}` : ''}
                    {status === 'overdue' && invoice.days_overdue
                      ? ` · ${invoice.days_overdue}d late`
                      : ''}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Money
                    amountMinor={outstanding}
                    currency={invoice.currency}
                    className="font-extrabold"
                  />
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-caption font-extrabold',
                      status === 'overdue'
                        ? 'bg-[#FFB3B3] text-[#5A1010]'
                        : 'bg-sun text-[#4A3200]',
                    )}
                  >
                    {actionLabel}
                  </span>
                </div>

                <ChevronRight
                  aria-hidden
                  className="h-5 w-5 shrink-0 text-text-muted"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatusNavigation({
  metric,
}: {
  metric: CurrencyMetrics;
}) {
  const filters = [
    { label: 'Drafts', status: 'draft', count: metric.draft_count },
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
      className="space-y-3"
    >
      <SectionHeader title="Browse invoices" />

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

  const caughtUp =
    counts.claims === 0 &&
    counts.overdue === 0;

  const handleClaimsCount = useCallback((count: number) => {
  setCounts((current) => ({ ...current, claims: count }));
  }, []);

  const handleOverdueCount = useCallback((count: number) => {
    setCounts((current) => ({ ...current, overdue: count }));
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Your workspace"
        title={name ? `Good to see you, ${name}` : 'Your business'}
        description="Keep track of what you have invoiced, what is owed and what needs your attention."
        actions={
          <Link
            href="/invoices/new"
            className={buttonStyles({ variant: 'accent' })}
          >
            <FileText aria-hidden className="h-4 w-4" />
            New invoice
          </Link>
        }
      />

      <SetupChecklist />

      {loading && <DashboardSkeleton />}

      {failed && (
        <Card zone="calm" className="space-y-3 p-6">
          <h2 className="text-heading">We couldn’t load your numbers</h2>
          <p className="text-body text-text-soft">
            Check your connection and try again. Nothing was changed.
          </p>
          <Button zone="calm" variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </Card>
      )}

      {isEmpty && (
        <Card zone="expressive" tone="peach" className="space-y-4">
          <EmptyState
            title="No invoices yet"
            body="Create your first invoice and send it by email or WhatsApp. Bagg will help you keep track of payment."
            action={{
              label: 'Create your first invoice',
              href: '/invoices/new',
            }}
          />
          <QuickActions />
        </Card>
      )}

      {!loading && !failed && metric && !isEmpty && (
        <>
          <CurrencySelector
            metrics={metrics}
            selected={metric.currency}
            onChange={setSelected}
          />

          <Card tone="mango" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-body font-extrabold">Waiting to be paid</p>
              <span className="rounded-full border border-ink bg-surface px-2.5 py-1 text-caption font-extrabold text-ink">
                {metric.currency}
              </span>
            </div>

            <Money
              amountMinor={metric.outstanding_minor}
              currency={metric.currency}
              variant="inherit"
              className="block text-amount-l"
            />

            {metric.overdue_count > 0 ? (
              <Link
                href={`/invoices?status=overdue&currency=${encodeURIComponent(metric.currency)}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border-brut-thin border-ink bg-surface px-3 text-caption font-extrabold text-ink"
              >
                {metric.overdue_count} overdue
                <span aria-hidden>·</span>
                <Money
                  amountMinor={metric.overdue_minor}
                  currency={metric.currency}
                  variant="inherit"
                />
                <ArrowUpRight aria-hidden className="h-4 w-4" />
              </Link>
            ) : (
              <p className="text-caption">Nothing is overdue.</p>
            )}
          </Card>

          <QuickActions />

          <div className="grid gap-3 sm:grid-cols-2">
            <Card zone="calm" className="space-y-2">
              <p className="text-caption text-text-muted">Paid this month</p>
              <Money
                amountMinor={metric.paid_this_month_minor}
                currency={metric.currency}
                variant="paid"
                className="block text-amount-m"
              />
              <p className="text-caption text-text-soft">
                Confirmed payments this month
              </p>
            </Card>

            <Card zone="calm" className="space-y-2">
              <p className="text-caption text-text-muted">Invoices created</p>
              <p className="text-amount-m font-extrabold tabular-nums">
                {metric.invoices_count.toLocaleString()}
              </p>
              <Link
                href={`/invoices?currency=${encodeURIComponent(metric.currency)}`}
                className={buttonStyles({ variant: 'link' })}
              >
                View invoices
                <ArrowUpRight aria-hidden className="h-4 w-4" />
              </Link>
            </Card>
          </div>

          <div className="space-y-5">
            <AttentionList
              title="Confirm payments"
              status="payment_claimed"
              currency={metric.currency}
              actionLabel="Review"
              onCount={handleClaimsCount}
            />

            <AttentionList
              title="Overdue invoices"
              status="overdue"
              currency={metric.currency}
              actionLabel="Follow up"
              onCount={handleOverdueCount}
            />

            {caughtUp && (
              <Card zone="calm" tone="peach">
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    aria-hidden
                    className="h-8 w-8 shrink-0 text-[#0F6B45]"
                  />
                  <div>
                    <p className="font-extrabold">You’re all caught up</p>
                    <p className="text-body text-text-soft">
                      Nothing needs your attention right now.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <StatusNavigation metric={metric} />
        </>
      )}
    </div>
  );
}
