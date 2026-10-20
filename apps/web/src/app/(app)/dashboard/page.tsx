'use client';

import { useState, useEffect } from 'react';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';
import {
  ArrowUpRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Plus,
  TrendingUp,
  Receipt,
  Layers
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  useEffect(() => {
    fetch(`${API_BASE}/invoices/metrics`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load metrics');
        return res.json();
      })
      .then((data: CurrencyMetrics[]) => {
        setMetrics(data);
      })
      .catch(() => {
        // Fallback default
        setMetrics([
          {
            currency: 'NGN',
            outstanding_minor: 0,
            overdue_minor: 0,
            paid_this_month_minor: 0,
            invoices_count: 0,
            draft_count: 0,
            sent_count: 0,
            viewed_count: 0,
            claimed_count: 0,
            partially_paid_count: 0,
            paid_count: 0,
            overdue_count: 0,
            cancelled_count: 0,
          },
        ]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-sm text-neutral-500">
            Currency-segregated metrics. Multi-currency balances are strictly grouped and never summed together.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </Link>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center text-neutral-400">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
        </div>
      ) : metrics.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-white space-y-3">
          <FileText className="w-10 h-10 text-neutral-300 mx-auto" />
          <h3 className="font-semibold text-neutral-800 text-base">No invoice data yet</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Create your first invoice to begin tracking outstanding, overdue, and collected revenue.
          </p>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Draft an Invoice
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {metrics.map((stat) => (
            <div key={stat.currency} className="bg-white rounded-xl border p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-lg text-neutral-900">{stat.currency} Workspace</span>
                  <span className="text-[11px] bg-neutral-100 px-2 py-0.5 rounded-full text-neutral-600 font-semibold uppercase tracking-wider">
                    {stat.invoices_count} {stat.invoices_count === 1 ? 'Invoice' : 'Invoices'}
                  </span>
                </div>
                <Link
                  href={`/invoices?currency=${stat.currency}`}
                  className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                >
                  View all {stat.currency} invoices <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* 3 Core Currency Metrics Cards (US-DSH-01) */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-800 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" /> Outstanding
                    </span>
                    <span className="text-[10px] text-amber-600 font-mono">Unsettled</span>
                  </div>
                  <div className="text-xl font-bold text-neutral-900">
                    {formatMoney(stat.outstanding_minor, stat.currency)}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Sent or viewed pending settlement
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-red-50/50 border border-red-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-red-800 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600" /> Overdue
                    </span>
                    {stat.overdue_count > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded font-bold">
                        {stat.overdue_count}
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-bold text-neutral-900">
                    {formatMoney(stat.overdue_minor, stat.currency)}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Past due date without payment
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Paid this Month
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono">Settled</span>
                  </div>
                  <div className="text-xl font-bold text-neutral-900">
                    {formatMoney(stat.paid_this_month_minor, stat.currency)}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Confirmed revenue in current month
                  </div>
                </div>
              </div>

              {/* Status Breakdown Pills (US-DSH-02) */}
              <div className="pt-2 border-t flex flex-wrap items-center gap-2 text-xs">
                <span className="text-neutral-400 font-medium text-[11px] mr-1">Status Filter:</span>
                <Link
                  href={`/invoices?currency=${stat.currency}&status=draft`}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium transition"
                >
                  Drafts ({stat.draft_count})
                </Link>
                <Link
                  href={`/invoices?currency=${stat.currency}&status=sent`}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-medium transition"
                >
                  Sent ({stat.sent_count})
                </Link>
                <Link
                  href={`/invoices?currency=${stat.currency}&status=viewed`}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition"
                >
                  Viewed ({stat.viewed_count})
                </Link>
                <Link
                  href={`/invoices?currency=${stat.currency}&status=payment_claimed`}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium transition"
                >
                  Claimed ({stat.claimed_count})
                </Link>
                <Link
                  href={`/invoices?currency=${stat.currency}&status=partially_paid`}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium transition"
                >
                  Partial ({stat.partially_paid_count})
                </Link>
                <Link
                  href={`/invoices?currency=${stat.currency}&status=paid`}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium transition"
                >
                  Paid ({stat.paid_count})
                </Link>
                {stat.overdue_count > 0 && (
                  <Link
                    href={`/invoices?currency=${stat.currency}&status=overdue`}
                    className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 font-medium transition"
                  >
                    Overdue ({stat.overdue_count})
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Action Guide */}
      <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-emerald-950">Fast 2-Minute Invoicing</h3>
          <p className="text-sm text-emerald-800">
            Share invoices directly to WhatsApp or download a crisp PDF. Payment instructions attach automatically.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg whitespace-nowrap transition"
        >
          Draft an Invoice
        </Link>
      </div>
    </div>
  );
}
