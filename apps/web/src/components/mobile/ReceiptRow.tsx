'use client';

/*
 * Phone row for the receipts list. Replaces the renderMobileCard body.
 * Tap anywhere on the row to open the receipt. The invoice link is a separate
 * tap target next to it, not nested inside the row link.
 */
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

export interface ReceiptRowData {
    id: string;
    receipt_number: string;
    invoice_id: string;
    invoice_number: string;
    client_name?: string | null;
    payer_name?: string | null;
    currency: string;
    amount_paid_minor: number;
    payment_date: string;
    payment_method: string;
    is_verified: boolean;
}

const label = (v: string) =>
    v
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');

export function ReceiptRow({ receipt }: { receipt: ReceiptRowData }) {
    return (
        <div className="overflow-hidden rounded-card border-brut border-ink bg-surface shadow-brut-sm">
            <Link href={`/receipts/${encodeURIComponent(receipt.id)}`} className="flex min-h-[72px] items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{receipt.client_name || receipt.payer_name || 'Customer'}</p>
                    <p className="text-caption text-text-soft">
                        {receipt.receipt_number} · {formatDate(receipt.payment_date)} · {label(receipt.payment_method)}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Money amountMinor={receipt.amount_paid_minor} currency={receipt.currency} variant="paid" className="font-extrabold" hideCurrencyCode />
                    <span
                        className={cn(
                            'rounded-full px-2 py-0.5 text-caption font-extrabold',
                            receipt.is_verified ? 'bg-leaf text-[#052E1B]' : 'bg-sun text-[#4A3200]',
                        )}
                    >
            {receipt.is_verified ? 'Verified' : 'Unverified'}
          </span>
                </div>
            </Link>
            <Link
                href={`/invoices/${encodeURIComponent(receipt.invoice_id)}`}
                className="flex min-h-11 items-center justify-between border-t border-line-subtle px-3 text-body font-bold"
            >
                <span>For invoice {receipt.invoice_number}</span>
                <ArrowUpRight aria-hidden className="h-4 w-4" />
            </Link>
        </div>
    );
}
