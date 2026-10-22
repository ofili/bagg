'use client';

import { formatMoney } from '@/lib/money';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MessageCircle,
  ReceiptText,
  Send,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react';

interface InvoiceLineItem {
  id: string;
  position?: number;
  description: string;
  quantity: number;
  unit_price_minor: number;
  total_minor: number;
}

interface InvoiceReceiptSummary {
  id?: string;
  receipt_number?: string;
  amount_paid_minor?: number;
  balance_remaining_minor?: number;
  payment_date?: string;
  payment_method?: string;
  reference?: string | null;
  confirmation_source?: string;
  provider?: string | null;
  verification_code?: string;
  share_token?: string | null;
  created_at?: string;
}

interface InvoicePaymentClaim {
  id?: string;
  amount_minor?: number;
  payment_date?: string;
  reference?: string | null;
  status?: string;
  rejection_reason?: string | null;
}

interface InvoiceDocumentProps {
  invoice: {
    id: string;
    invoice_number?: string;
    client_name?: string | null;
    currency: string;
    status: string;
    user_facing_status?: string | null;
    issue_date: string;
    due_date?: string | null;
    items: InvoiceLineItem[];
    subtotal_minor: number;
    discount_minor: number;
    tax_rate_percent: number;
    tax_minor: number;
    total_minor: number;
    wht_rate_percent?: number;
    wht_minor?: number;
    net_payable_minor?: number;
    deposit_percentage?: number | null;
    deposit_amount_minor?: number | null;
    notes?: string | null;
    share_token?: string | null;
    latest_claim?: InvoicePaymentClaim | null;
    latest_receipt?: InvoiceReceiptSummary | null;
    remaining_minor?: number;
    amount_paid_minor?: number;
  };
  variant: 'public' | 'issuer';
  className?: string;
}

export function InvoiceDocument({ invoice, variant = 'public', className }: InvoiceDocumentProps) {
  const {
    invoice_number,
    client_name,
    currency,
    status,
    user_facing_status,
    issue_date,
    due_date,
    items,
    subtotal_minor,
    discount_minor,
    tax_rate_percent,
    tax_minor,
    total_minor,
    wht_rate_percent = 0,
    wht_minor = 0,
    net_payable_minor,
    deposit_percentage,
    deposit_amount_minor,
    notes,
    share_token,
    latest_claim,
    latest_receipt,
    remaining_minor,
    amount_paid_minor = 0,
  } = invoice;

  const netPayable = net_payable_minor || total_minor;
  const remaining = remaining_minor ?? Math.max(0, netPayable - amount_paid_minor);
  const isPaid = status === 'paid' || user_facing_status === 'Paid';
  const isOverdue = user_facing_status === 'Overdue';
  const isClaimed = status === 'payment_claimed' || latest_claim?.status === 'pending';
  const isPartiallyPaid = status === 'partially_paid' || (amount_paid_minor > 0 && !isPaid);
  const displayStatus = user_facing_status || status;

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const whatsappText = encodeURIComponent(
    `Hi ${client_name || 'there'}, here is invoice ${invoice_number}: ${shareUrl}/i/${share_token}`
  );

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Invoice From
            </span>
            <h1 className="text-lg font-bold text-neutral-900 mt-1">
              Studio Bagg Creative Ltd
            </h1>
            {client_name && (
              <div className="text-xs text-neutral-500 mt-0.5">
                Billed to: <strong>{client_name}</strong>
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-1 w-full sm:w-auto">
            <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
              Invoice
            </span>
            <div className="text-2xl font-black text-neutral-900">{invoice_number}</div>
            <StatusPill
              status={status}
              labelOverride={displayStatus}
              subLabel={
                ['issued', 'sent', 'viewed'].includes(status)
                  ? status.charAt(0).toUpperCase() + status.slice(1)
                  : undefined
              }
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-400 w-full sm:w-auto">
            <span>Issued: {issue_date}</span>
            <span className="mx-1">•</span>
            <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-emerald-400 font-medium'}>
              Due {due_date}
            </span>
          </div>
        </div>

        {variant === 'issuer' && share_token && (
          <Link
            href={`/i/${share_token}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 border px-2.5 py-1 rounded-md bg-neutral-50 hover:bg-neutral-100 transition"
          >
            <ExternalLink className="w-3 h-3" /> Client view
          </Link>
        )}
      </div>

      {/* Amount Band */}
      <div className="mt-4 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">
              {isPaid ? 'Total paid' : 'Balance outstanding'}
            </div>
            <div className="mt-0.5 text-lg font-black tracking-tight text-neutral-950">
              <Money
                amountMinor={isPaid ? amount_paid_minor : remaining}
                currency={currency}
                variant={isPaid ? 'paid' : 'outstanding'}
              />
            </div>
            {!isPaid && remaining > 0 && (
              <div className="text-[11px] text-neutral-500">
                of <Money amountMinor={total_minor} currency={currency} variant="muted" /> total
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusPill status={status} />
            {isOverdue ? (
              <span className="text-[10px] font-semibold text-red-600">Past due</span>
            ) : due_date ? (
              <span className="text-[10px] text-neutral-400">Due {due_date}</span>
            ) : null}
          </div>
        </div>

        {(!isPaid && remaining > 0) || isPartiallyPaid ? (
          <div className="mt-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-neutral-500">
                  <Money amountMinor={amount_paid_minor} currency={currency} variant="muted" /> paid
                </span>
                <span className="font-semibold text-neutral-700">
                  <Money amountMinor={remaining} currency={currency} /> outstanding
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
                  style={{ width: `${Math.min(100, Math.round((amount_paid_minor / Math.max(total_minor, 1)) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {status === 'payment_claimed' && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Payment claim received — confirm funds before this becomes a receipt.
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-neutral-900">Line items</h2>
          {share_token && (
            <Link
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 border px-2.5 py-1 rounded-md bg-neutral-50 hover:bg-neutral-100 transition"
            >
              <Download className="w-3 h-3" /> PDF
            </Link>
          )}
        </div>
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-neutral-50 p-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-neutral-800">{item.description}</div>
              <div className="text-[11px] text-neutral-500">
                {item.quantity} ×
                <Money amountMinor={item.unit_price_minor} currency={currency} variant="muted" />
              </div>
            </div>
            <span className="font-mono font-semibold text-neutral-900 text-sm">
              <Money amountMinor={item.total_minor} currency={currency} />
            </span>
          </div>
        ))}
      </div>

      {/* Calculation Breakdown */}
      <div className="mt-6 space-y-2 text-xs text-neutral-600">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-medium text-neutral-900">
            <Money amountMinor={subtotal_minor} currency={currency} />
          </span>
        </div>
        {discount_minor > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Discount:</span>
            <span className="font-medium">-<Money amountMinor={discount_minor} currency={currency} /></span>
          </div>
        )}
        {tax_minor > 0 && (
          <div className="flex justify-between">
            <span>VAT ({tax_rate_percent}%):</span>
            <span className="font-medium text-neutral-900">
              <Money amountMinor={tax_minor} currency={currency} />
            </span>
          </div>
        )}
        {(wht_minor || 0) > 0 && (
          <>
            <div className="flex justify-between font-semibold text-neutral-800 pt-1 border-t">
              <span>Gross Total:</span>
              <span className="font-mono">
                <Money amountMinor={total_minor} currency={currency} />
              </span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>Less WHT ({wht_rate_percent}%):</span>
              <span className="font-mono">-<Money amountMinor={wht_minor} currency={currency} /></span>
            </div>
          </>
        )}
        <div className="flex justify-between text-base font-black text-neutral-900 pt-2 border-t">
          <span>Net Payable:</span>
          <span className="text-emerald-700 font-mono font-bold">
            <Money amountMinor={netPayable} currency={currency} />
          </span>
        </div>
      </div>

      {/* Deposit callout */}
      {(deposit_amount_minor || 0) > 0 && (
        <div className="mt-5 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 space-y-2">
          <div className="flex justify-between font-bold text-xs">
            <span>Deposit Due Today:</span>
            <span className="font-mono">
              <Money amountMinor={deposit_amount_minor || 0} currency={currency} />
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-emerald-700">
            <span>Remaining Balance:</span>
            <span className="font-mono">
              <Money
                amountMinor={Math.max(0, netPayable - (deposit_amount_minor || 0))}
                currency={currency}
              />
            </span>
          </div>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mt-5 rounded-xl border bg-white p-4">
          <h2 className="text-sm font-bold text-neutral-900 mb-2">Notes</h2>
          <p className="mt-1 whitespace-pre-line text-xs text-neutral-600">{notes}</p>
        </div>
      )}

      {/* Payment Details */}
      {latest_receipt && (
        <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ReceiptText className="h-4 w-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-neutral-900">Latest receipt</h3>
          </div>
          <div className="flex items-end justify-between gap-3 border-t border-dashed border-emerald-300 pt-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Amount received
              </div>
              <div className="text-lg font-black tracking-tight text-emerald-950">
                <Money amountMinor={latest_receipt.amount_paid_minor || 0} currency={currency} />
              </div>
            </div>
            <div className="text-right text-[11px] text-emerald-800">
              {latest_receipt.payment_date && <div>{latest_receipt.payment_date}</div>}
              {latest_receipt.verification_code && (
                <div className="font-mono text-[10px]">{latest_receipt.verification_code}</div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3">
            <span className="text-[11px] text-neutral-500">Confirmed via</span>
            <span className="text-[11px] text-emerald-700 font-semibold">
              {latest_receipt.confirmation_source || 'Issuer'}
              {latest_receipt.provider ? ` - ${latest_receipt.provider}` : ''}
            </span>
            {latest_receipt.share_token && (
              <Link
                href={`/r/${latest_receipt.share_token}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
              >
                View receipt <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Variant-specific actions */}
      {variant === 'public' && (
        <div className="mt-6 space-y-3 pt-4 border-t">
          {!isPaid && (
            <>
              <button
                type="button"
                className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl shadow-md transition inline-flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Pay with Card / Transfer
              </button>
              {!isClaimed && (
                <button
                  type="button"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition inline-flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  {isPartiallyPaid ? "I've Paid Remaining Balance" : "I've Paid via Bank Transfer"}
                </button>
              )}
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100 transition"
              >
                <Share2 className="w-4 h-4" /> Message on WhatsApp
              </a>
            </>
          )}
          {isPaid && latest_receipt?.share_token && (
            <Link
              href={`/r/${latest_receipt.share_token}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 border border-emerald-200 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition"
            >
              <ShieldCheck className="w-3 h-3" /> View receipt
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
