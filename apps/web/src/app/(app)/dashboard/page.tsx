'use client';

/*
 * Home, redesigned for phones. Same data as before (/invoices/metrics) plus
 * two short lists that answer "what needs me today?":
 *   1. payment claims waiting for you to confirm (status=payment_claimed)
 *   2. overdue invoices, oldest first (status=overdue)
 *
 * Money is never added across currencies. When there is more than one
 * currency, a switcher chooses which one the screen shows.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight, FileCheck, FileText, UserPlus } from 'lucide-react';
import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { BagCharacter } from '@/components/brand';
import { SetupChecklist } from "@/components/mobile/SetupChecklist";
import { Money } from '@/components/money/Money';
import { Button, Card, buttonStyles, chipStyles } from '@/components/ui';
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

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function useFirstName() {
  const [name, setName] = useState('');
  useEffect(() => {
    let live = true;
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!live || !d) return;
          // full_name exists once the profile fields are added; fall back to the business name.
          const n: string = d.user?.full_name?.trim() || d.workspace?.business_name?.trim() || '';
          setName(d.user?.full_name ? n.split(/\s+/)[0] : n);
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return name;
}

function NeedsList({
                     title,
                     status,
                     currency,
                     actionLabel,
                     onCount,
                   }: {
  title: string;
  status: 'payment_claimed' | 'overdue';
  currency: string;
  actionLabel: string;
  onCount: (n: number) => void;
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
    if (!table.loading) onCount(table.error ? -1 : rows.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.loading, table.error, rows.length]);

  if (table.loading && !table.data) {
    return <div className="h-24 animate-pulse rounded-card border-brut-thin border-ink bg-surface-tint" aria-hidden />;
  }
  if (rows.length === 0) return null;

  return (
      <section aria-label={title} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-heading">{title}</h2>
          {total > rows.length && (
              <Link href={`/invoices?status=${status}${currency ? `&currency=${currency}` : ''}`} className={buttonStyles({ variant: 'link' })}>
                See all {total}
              </Link>
          )}
        </div>
        <ul className="space-y-2">
          {rows.map((inv) => (
              <li key={inv.id}>
                <Link
                    href={`/invoices/${encodeURIComponent(inv.id)}`}
                    className="flex min-h-[72px] items-center gap-3 rounded-card border-brut border-ink bg-surface p-3 shadow-brut-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{inv.client_name || 'Unnamed client'}</p>
                    <p className="text-caption text-text-soft">
                      {inv.invoice_number} · due {formatDate(inv.due_date)}
                      {status === 'overdue' && inv.days_overdue ? ` · ${inv.days_overdue}d late` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Money
                        amountMinor={Math.max(0, inv.total_minor - inv.amount_paid_minor)}
                        currency={inv.currency}
                        className="font-extrabold"
                        hideCurrencyCode
                    />
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-caption font-extrabold',
                            status === 'overdue' ? 'bg-[#FFB3B3] text-[#5A1010]' : 'bg-sun text-[#4A3200]',
                        )}
                    >
                  {actionLabel}
                </span>
                  </div>
                  <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-text-muted" />
                </Link>
              </li>
          ))}
        </ul>
      </section>
  );
}

const QUICK = [
  { label: 'Invoice', href: '/invoices/new', icon: FileText },
  { label: 'Quote', href: '/quotes/new', icon: FileCheck },
  { label: 'Client', href: '/clients/new', icon: UserPlus },
  { label: 'Recurring', href: '/recurring-invoices', icon: ArrowClockwiseIcon }
] as const;

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<CurrencyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState('');
  const [counts, setCounts] = useState<{ claims: number | null; overdue: number | null }>({
    claims: null,
    overdue: null,
  });
  const name = useFirstName();

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    fetch(`${API_BASE}/invoices/metrics`, { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error('Could not load metrics');
          return res.json();
        })
        .then((data: CurrencyMetrics[]) => {
          setMetrics(data);
          setSelected((cur) => (data.some((d) => d.currency === cur) ? cur : (data[0]?.currency ?? '')));
        })
        // Never show zeros when the request failed: zero money looks like real data.
        .catch(() => setFailed(true))
        .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset the "caught up" check whenever the currency changes.
  useEffect(() => {
    setCounts({ claims: null, overdue: null });
  }, [selected]);

  const isEmpty = !loading && !failed && metrics.length === 0;
  const stat = metrics.find((m) => m.currency === selected) ?? metrics[0];
  const caughtUp = counts.claims === 0 && counts.overdue === 0;

  const filters = stat
      ? [
        { label: 'Drafts', status: 'draft', count: stat.draft_count },
        { label: 'Sent', status: 'sent', count: stat.sent_count },
        { label: 'Viewed', status: 'viewed', count: stat.viewed_count },
        { label: 'Claimed', status: 'payment_claimed', count: stat.claimed_count },
        { label: 'Partial', status: 'partially_paid', count: stat.partially_paid_count },
        { label: 'Paid', status: 'paid', count: stat.paid_count },
        ...(stat.overdue_count > 0 ? [{ label: 'Overdue', status: 'overdue', count: stat.overdue_count }] : []),
      ]
      : [];

  return (
      <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <BagCharacter size={44} mood="happy" decorative />
          <div className="min-w-0">
            <p className="text-caption text-text-soft">{greeting()}</p>
            <h1 className="truncate text-title-l">{name || 'welcome back'}</h1>
          </div>
        </div>

          <SetupChecklist />

        {loading && (
            <div role="status" className="space-y-3">
              <div className="h-36 animate-pulse rounded-card border-brut border-ink bg-surface-tint" aria-hidden />
              <div className="h-12 animate-pulse rounded-card border-brut-thin border-ink bg-surface-tint" aria-hidden />
              <div className="h-24 animate-pulse rounded-card border-brut-thin border-ink bg-surface-tint" aria-hidden />
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

        {/*{isEmpty && (*/}
        {/*    <Card tone="peach" className="space-y-4 p-8 text-center">*/}
        {/*      <BagCharacter size={72} mood="happy" className="mx-auto" decorative />*/}
        {/*      <h2 className="text-title">no invoices yet</h2>*/}
        {/*      <p className="mx-auto max-w-sm text-body text-text-soft">*/}
        {/*        Send your first invoice in about two minutes. We&rsquo;ll track what&rsquo;s waiting and what&rsquo;s paid.*/}
        {/*      </p>*/}
        {/*      <Link href="/invoices/new" className={buttonStyles({ size: 'lg' })}>*/}
        {/*        Create your first invoice*/}
        {/*      </Link>*/}
        {/*    </Card>*/}
        {/*)}*/}

        {!loading && !failed && stat && (
            <>
              {metrics.length > 1 && (
                  <div role="group" aria-label="Currency" className="flex gap-2 overflow-x-auto">
                    {metrics.map((m) => (
                        <button
                            key={m.currency}
                            type="button"
                            aria-pressed={m.currency === stat.currency}
                            onClick={() => setSelected(m.currency)}
                            className={cn(
                                'min-h-11 shrink-0 rounded-full border-brut-thin border-ink px-4 text-body',
                                m.currency === stat.currency ? 'bg-sun font-extrabold' : 'bg-surface font-medium text-text-soft',
                            )}
                        >
                          {m.currency}
                        </button>
                    ))}
                  </div>
              )}

              <Card tone="mango" className="space-y-2">
                <p className="text-body font-extrabold">Waiting to be paid</p>
                <Money
                    amountMinor={stat.outstanding_minor}
                    currency={stat.currency}
                    variant="inherit"
                    className="block text-amount-l"
                    hideCurrencyCode
                />
                {stat.overdue_count > 0 ? (
                    <Link
                        href={`/invoices?status=overdue&currency=${stat.currency}`}
                        className="inline-flex min-h-11 items-center gap-1 rounded-full border-brut-thin border-ink bg-surface px-3 text-caption font-extrabold text-ink"
                    >
                      {stat.overdue_count} overdue ·{' '}
                      <Money amountMinor={stat.overdue_minor} currency={stat.currency} variant="inherit" hideCurrencyCode />
                      <ArrowUpRight aria-hidden className="h-4 w-4" />
                    </Link>
                ) : (
                    <p className="text-caption">Nothing is overdue.</p>
                )}
              </Card>

              <div className="grid grid-cols-4 gap-2">
                {QUICK.map((q) => {
                  const Icon = q.icon;
                  return (
                      <Link
                          key={q.href}
                          href={q.href}
                          className={cn(
                              buttonStyles({ variant: 'outline', zone: 'calm' }),
                              'min-h-12 flex-col gap-1 px-1 text-caption sm:flex-row sm:text-body',
                          )}
                      >
                        <Icon aria-hidden className="h-[18px] w-[18px]" />
                        {q.label}
                      </Link>
                  );
                })}
              </div>

              <NeedsList
                  title="Confirm payments"
                  status="payment_claimed"
                  currency={stat.currency}
                  actionLabel="Review"
                  onCount={(n) => setCounts((c) => ({ ...c, claims: n }))}
              />
              <NeedsList
                  title="Overdue"
                  status="overdue"
                  currency={stat.currency}
                  actionLabel="Chase"
                  onCount={(n) => setCounts((c) => ({ ...c, overdue: n }))}
              />

              {caughtUp && (
                  <Card zone="calm" tone="peach" className="flex items-center gap-3">
                    <BagCharacter size={56} mood="superExcited" decorative />
                    <div>
                      <p className="font-extrabold">You&rsquo;re all caught up</p>
                      <p className="text-body text-text-soft">Nothing needs you right now.</p>
                    </div>
                  </Card>
              )}

              <Card zone="calm" className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-caption text-text-muted">Paid this month</p>
                  <Money
                      amountMinor={stat.paid_this_month_minor}
                      currency={stat.currency}
                      variant="paid"
                      className="text-amount-m"
                      hideCurrencyCode
                  />
                </div>
                <Link href={`/invoices?currency=${stat.currency}`} className={buttonStyles({ variant: 'link' })}>
                  All {stat.invoices_count} invoices <ArrowUpRight aria-hidden className="h-4 w-4" />
                </Link>
              </Card>

              <nav aria-label={`Filter ${stat.currency} invoices by status`} className="space-y-2">
                <p className="text-caption text-text-muted">Browse by status</p>
                <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                  {filters.map((f) => (
                      <li key={f.status} className="shrink-0">
                        <Link href={`/invoices?currency=${stat.currency}&status=${f.status}`} className={cn(chipStyles(), 'min-h-11')}>
                          {f.label} <span className="tabular font-extrabold">{f.count}</span>
                        </Link>
                      </li>
                  ))}
                </ul>
              </nav>
            </>
        )}
      </div>
  );
}


// 'use client';
//
// import { useCallback, useEffect, useState } from 'react';
// import Link from 'next/link';
// import { ArrowUpRight, Loader2, Plus } from 'lucide-react';
// import { BagCharacter } from '@/components/brand';
// import { Money } from '@/components/money/Money';
// import { Button, Card, buttonStyles, chipStyles } from '@/components/ui';
//
// const API_BASE = '/api';
//
// interface CurrencyMetrics {
//   currency: string;
//   outstanding_minor: number;
//   overdue_minor: number;
//   paid_this_month_minor: number;
//   invoices_count: number;
//   draft_count: number;
//   sent_count: number;
//   viewed_count: number;
//   claimed_count: number;
//   partially_paid_count: number;
//   paid_count: number;
//   overdue_count: number;
//   cancelled_count: number;
// }
//
// export default function DashboardPage() {
//   const [metrics, setMetrics] = useState<CurrencyMetrics[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [failed, setFailed] = useState(false);
//
//   const load = useCallback(() => {
//     setLoading(true);
//     setFailed(false);
//     fetch(`${API_BASE}/invoices/metrics`, { credentials: 'include' })
//       .then((res) => {
//         if (!res.ok) throw new Error('Could not load metrics');
//         return res.json();
//       })
//       .then((data: CurrencyMetrics[]) => setMetrics(data))
//       // Never show zeros when the request failed: zero money looks like real data.
//       .catch(() => setFailed(true))
//       .finally(() => setLoading(false));
//   }, []);
//
//   useEffect(() => {
//     load();
//   }, [load]);
//
//   const isEmpty =
//     !loading &&
//     !failed &&
//     (metrics.length === 0 || metrics.every((m) => (m.invoices_count ?? 0) === 0));
//
//   return (
//     <div className="w-full space-y-8 p-4 sm:p-6 lg:p-8">
//       <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
//         <div>
//           <h1 className="text-title-l sm:text-display">home</h1>
//           <p className="mt-1 text-body text-text-soft">
//             Each currency is counted on its own. Nothing is converted or added together.
//           </p>
//         </div>
//         {!isEmpty && !failed && (
//           <Link href="/invoices/new" className={buttonStyles({ variant: 'accent' })}>
//             <Plus aria-hidden className="h-4 w-4" /> New invoice
//           </Link>
//         )}
//       </div>
//
//       {loading && (
//         <div role="status" className="flex justify-center py-16 text-text-muted">
//           <Loader2 aria-hidden className="h-7 w-7 animate-spin" />
//           <span className="sr-only">Loading your numbers</span>
//         </div>
//       )}
//
//       {failed && (
//         <Card zone="calm" className="space-y-3 p-6">
//           <h2 className="text-heading">we couldn&rsquo;t load your numbers</h2>
//           <p className="text-body text-text-soft">Check your connection and try again. Nothing was changed.</p>
//           <Button zone="calm" variant="outline" onClick={load}>
//             Try again
//           </Button>
//         </Card>
//       )}
//
//       {isEmpty && (
//         <Card tone="peach" className="space-y-4 p-8 text-center">
//           <BagCharacter size={56} mood="happy" className="mx-auto" decorative />
//           <h2 className="text-title">no invoices yet</h2>
//           <p className="mx-auto max-w-sm text-body text-text-soft">
//             Send your first invoice in about two minutes. We&rsquo;ll track what&rsquo;s waiting and what&rsquo;s paid.
//           </p>
//           <Link href="/invoices/new" className={buttonStyles({ size: 'lg' })}>
//             <Plus aria-hidden className="h-4 w-4" /> Create your first invoice
//           </Link>
//         </Card>
//       )}
//
//       {!loading &&
//         !failed &&
//         metrics.map((stat) => {
//           const filters = [
//             { label: 'Drafts', status: 'draft', count: stat.draft_count },
//             { label: 'Sent', status: 'sent', count: stat.sent_count },
//             { label: 'Viewed', status: 'viewed', count: stat.viewed_count },
//             { label: 'Claimed', status: 'payment_claimed', count: stat.claimed_count },
//             { label: 'Partial', status: 'partially_paid', count: stat.partially_paid_count },
//             { label: 'Paid', status: 'paid', count: stat.paid_count },
//             ...(stat.overdue_count > 0 ? [{ label: 'Overdue', status: 'overdue', count: stat.overdue_count }] : []),
//           ];
//
//           return (
//             <section key={stat.currency} aria-labelledby={`cur-${stat.currency}`} className="space-y-4">
//               <div className="flex flex-wrap items-center justify-between gap-2">
//                 <div className="flex items-center gap-3">
//                   <h2 id={`cur-${stat.currency}`} className="text-title">
//                     {stat.currency}
//                   </h2>
//                   <span className="rounded-full bg-peach-chip px-2.5 py-0.5 text-caption font-extrabold">
//                     {stat.invoices_count} {stat.invoices_count === 1 ? 'invoice' : 'invoices'}
//                   </span>
//                 </div>
//                 <Link
//                   href={`/invoices?currency=${stat.currency}`}
//                   className={buttonStyles({ variant: 'link' })}
//                 >
//                   View all {stat.currency} invoices <ArrowUpRight aria-hidden className="h-4 w-4" />
//                 </Link>
//               </div>
//
//               <div className="grid gap-4 sm:grid-cols-3">
//                 <Card tone="mango" className="space-y-1">
//                   <p className="text-body font-extrabold">Waiting on clients</p>
//                   <Money
//                     amountMinor={stat.outstanding_minor}
//                     currency={stat.currency}
//                     variant="inherit"
//                     className="block text-amount-l"
//                     hideCurrencyCode
//                   />
//                   <p className="text-caption">Sent or viewed, not paid yet</p>
//                 </Card>
//
//                 <Card className="space-y-1">
//                   <div className="flex items-center justify-between gap-2">
//                     <p className="text-body font-extrabold">Overdue</p>
//                     {stat.overdue_count > 0 && (
//                       <span className="rounded-full bg-[#FFB3B3] px-2 py-0.5 text-caption font-extrabold text-[#5A1010]">
//                         {stat.overdue_count} late
//                       </span>
//                     )}
//                   </div>
//                   <Money
//                     amountMinor={stat.overdue_minor}
//                     currency={stat.currency}
//                     variant={stat.overdue_minor > 0 ? 'negative' : 'total'}
//                     className="block text-amount-l"
//                     hideCurrencyCode
//                   />
//                   <p className="text-caption text-text-muted">Past the due date</p>
//                 </Card>
//
//                 <Card className="space-y-1">
//                   <p className="text-body font-extrabold">Paid this month</p>
//                   <Money
//                     amountMinor={stat.paid_this_month_minor}
//                     currency={stat.currency}
//                     variant="paid"
//                     className="block text-amount-l"
//                     hideCurrencyCode
//                   />
//                   <p className="text-caption text-text-muted">Confirmed this month</p>
//                 </Card>
//               </div>
//
//               <nav aria-label={`Filter ${stat.currency} invoices by status`} className="space-y-2">
//                 <p className="text-caption text-text-muted">Filter by status</p>
//                 <ul className="flex flex-wrap gap-2">
//                   {filters.map((f) => (
//                     <li key={f.status}>
//                       <Link href={`/invoices?currency=${stat.currency}&status=${f.status}`} className={chipStyles()}>
//                         {f.label} <span className="tabular font-extrabold">{f.count}</span>
//                       </Link>
//                     </li>
//                   ))}
//                 </ul>
//               </nav>
//             </section>
//           );
//         })}
//
//       {!loading && !failed && !isEmpty && (
//         <Card zone="calm" tone="peach">
//           <p className="text-body">
//             <span className="font-extrabold">Fast invoicing.</span> Share an invoice on WhatsApp or download it as a
//             PDF. Payment details attach automatically.
//           </p>
//         </Card>
//       )}
//     </div>
//   );
// }
