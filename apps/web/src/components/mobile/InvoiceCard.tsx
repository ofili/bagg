'use client';

import Link from 'next/link';
import { formatMoney } from '@/lib/money';
import { Share2, Copy, ExternalLink, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface InvoiceCardProps {
  id: string;
  invoiceNumber: string;
  clientName?: string | null;
  currency: string;
  totalMinor: number;
  amountPaidMinor: number;
  status: string;
  effectiveStatus?: string | null;
  isOverdue?: boolean;
  daysOverdue?: number;
  paymentState?: string;
  shareToken?: string | null;
  latestReceipt?: { share_token?: string | null; confirmation_source?: string | null } | null;
  dueDate: string;
}

interface OverflowMenuItem {
  label: string;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  icon?: React.ReactNode;
}

export function InvoiceCard({
  id,
  invoiceNumber,
  clientName,
  currency,
  totalMinor,
  amountPaidMinor,
  status,
  effectiveStatus,
  isOverdue = false,
  daysOverdue = 0,
  paymentState,
  shareToken,
  latestReceipt,
  dueDate,
}: InvoiceCardProps) {
  const displayStatus = effectiveStatus || status;
  const balanceMinor = Math.max(0, totalMinor - amountPaidMinor);
  const isPaid = displayStatus === 'paid' || paymentState === 'paid';

  const overflowItems: OverflowMenuItem[] = [
    {
      label: 'View details',
      href: `/invoices/${id}`,
      icon: <ExternalLink className="w-3 h-3" />,
    },
    {
      label: 'Copy link',
      href: shareToken ? `/i/${shareToken}` : undefined,
      icon: <Copy className="w-3 h-3" />,
    },
  ];

  if (shareToken) {
    overflowItems.push({
      label: 'Download PDF',
      href: `/invoices/${id}/pdf`,
      icon: <Share2 className="w-3 h-3" />,
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-bold text-neutral-900">{invoiceNumber}</span>
            {isOverdue && (
              <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                {daysOverdue > 0 ? `${daysOverdue}d late` : 'Past due'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
            <span>{clientName || 'Client'}</span>
            <span className="mx-0.5">•</span>
            <span>Due {dueDate}</span>
          </div>

          {/* Status pill */}
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border"
            aria-label={`Invoice status: ${displayStatus}`}
          >
            <CheckCircle2
              className={`w-3 h-3 ${
                isPaid ? 'text-emerald-600' : 'text-neutral-400'
              }`}
              aria-hidden="true"
            />
            <span className={`capitalize ${
              isPaid
                ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                : 'text-neutral-600 border-neutral-200 bg-neutral-50'
            }`}>
              {displayStatus}
            </span>
          </button>
        </div>

        <div className="text-right">
          <div className="text-base font-black tracking-tight text-neutral-900">
            {formatMoney(isPaid ? amountPaidMinor : balanceMinor, currency)}
          </div>
          {!isPaid && balanceMinor > 0 && (
            <div className="text-xs text-neutral-500">
              of {formatMoney(totalMinor, currency)} total
            </div>
          )}
        </div>

        {/* Overflow menu (primary action = WhatsApp share on mobile) */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition" aria-label="More options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </SheetTrigger>
          <SheetContent className="w-48 rounded-xl border border-neutral-200 bg-white shadow-xl p-2">
            <div className="space-y-1">
              {overflowItems.map((item, i) => {
                if (!item.href) return null;
                const Comp = item.external ? 'a' : Link;
                return (
                  <Comp
                    key={i}
                    {...(item.external
                      ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
                      : { href: item.href })}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 rounded-lg transition"
                  >
                    {item.icon}
                    {item.label}
                  </Comp>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* WhatsApp primary action - full width on mobile */}
      {shareToken && (
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Hi ${clientName || 'there'}, here is invoice ${invoiceNumber}: ${typeof window !== 'undefined' ? window.location.origin : ''}/i/${shareToken}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition"
        >
          <Share2 className="w-3 h-3" /> Share on WhatsApp
        </a>
      )}
    </div>
  );
}
