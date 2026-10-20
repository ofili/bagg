'use client';

import { formatMoney } from '@/lib/money';
import Link from 'next/link';
import { ArrowUpRight, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  // In v1, stats are strictly grouped by currency and never mixed together
  const currencyStats = [
    {
      currency: 'NGN' as const,
      outstanding_minor: 25000000,
      overdue_minor: 0,
      paid_this_month_minor: 20000000,
    },
    {
      currency: 'USD' as const,
      outstanding_minor: 125000,
      overdue_minor: 50000,
      paid_this_month_minor: 250000,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">Track what is outstanding, overdue, and paid across your currencies.</p>
      </div>

      <div className="space-y-6">
        {currencyStats.map((stat) => (
          <div key={stat.currency} className="bg-white rounded-xl border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-neutral-900">{stat.currency} Accounts</span>
                <span className="text-xs bg-neutral-100 px-2 py-0.5 rounded text-neutral-600 font-medium">Active</span>
              </div>
              <Link href="/invoices" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                View invoices <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-neutral-50 border">
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 mb-1">
                  <Clock className="w-4 h-4 text-amber-500" /> Outstanding
                </div>
                <div className="text-xl font-bold text-neutral-900">
                  {formatMoney(stat.outstanding_minor, stat.currency)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-neutral-50 border">
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 mb-1">
                  <AlertCircle className="w-4 h-4 text-red-500" /> Overdue
                </div>
                <div className="text-xl font-bold text-neutral-900">
                  {formatMoney(stat.overdue_minor, stat.currency)}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-neutral-50 border">
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Paid this Month
                </div>
                <div className="text-xl font-bold text-neutral-900">
                  {formatMoney(stat.paid_this_month_minor, stat.currency)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Action Guide */}
      <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-emerald-950">Fast 2-Minute Invoicing</h3>
          <p className="text-sm text-emerald-800">
            Share invoices directly to WhatsApp or download a crisp PDF. Payment instructions attach automatically.
          </p>
        </div>
        <Link
          href="/invoices"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg whitespace-nowrap transition"
        >
          Draft an Invoice
        </Link>
      </div>
    </div>
  );
}
