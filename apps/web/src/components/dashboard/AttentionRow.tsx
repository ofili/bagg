'use client';

import Link from 'next/link';
import { CaretRight } from '@phosphor-icons/react';
import { MoneyAmount, StatusPill } from '@/components/ui';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

export interface AttentionInvoice {
  id: string;
  invoice_number: string;
  client_name?: string | null;
  currency: string;
  total_minor: number;
  amount_paid_minor: number;
  due_date: string;
  days_overdue?: number;
}

interface AttentionRowProps {
  invoice: AttentionInvoice;
  status: 'payment_claimed' | 'overdue';
  actionLabel: string;
}

export function AttentionRow({
  invoice,
  status,
  actionLabel,
}: AttentionRowProps) {
  const outstanding = Math.max(
    0,
    invoice.total_minor - invoice.amount_paid_minor,
  );

  return (
    <Link
      href={`/invoices/${encodeURIComponent(invoice.id)}`}
      className={cn(
        'flex min-h-16 items-center justify-between gap-3 border-b border-line-subtle last:border-0 p-3.5',
        'transition-colors hover:bg-surface-tint',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
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

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex flex-col items-end gap-1">
          <MoneyAmount
            amountMinor={outstanding}
            currency={invoice.currency}
            size="sm"
            className="font-extrabold"
          />
          <StatusPill
            status={status === 'overdue' ? 'overdue' : 'payment_claimed'}
            labelOverride={actionLabel}
          />
        </div>

        <CaretRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-text-muted"
        />
      </div>
    </Link>
  );
}
