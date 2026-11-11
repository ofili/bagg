
'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { CheckCircle2, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

export interface InvoiceRowData {
  id: string;
  invoice_number: string;
  client_name?: string | null;
  currency: string;
  total_minor: number;
  amount_paid_minor: number;
  due_date: string;
  status: string;
  effective_status?: string | null;
  share_token?: string | null;
  latest_claim?: { status: string } | null;
}

const ACTION_W = 88;
const COLORS = ['bg-mango', 'bg-pink', 'bg-sun', 'bg-leaf'];

function safeAmount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function initials(name?: string | null) {
  const parts = (name ?? '?').trim().split(/\s+/);

  return (
    (parts[0]?.[0] ?? '?') +
    (parts.length > 1 ? parts[parts.length - 1][0] : '')
  ).toUpperCase();
}

function colorFor(name?: string | null) {
  let hash = 0;

  for (const character of name ?? '') {
    hash = (hash * 31 + character.charCodeAt(0)) % COLORS.length;
  }

  return COLORS[hash];
}

function statusChip(inv: InvoiceRowData, overdue: boolean) {
  if (overdue) {
    return {
      label: 'Overdue',
      cls: 'bg-[#FFB3B3] text-[#5A1010]',
    };
  }

  const status = inv.effective_status || inv.status;

  if (status === 'paid') {
    return { label: 'Paid', cls: 'bg-leaf text-[#052E1B]' };
  }

  if (status === 'payment_claimed') {
    return { label: 'Claimed', cls: 'bg-sun text-[#4A3200]' };
  }

  if (status === 'partially_paid') {
    return {
      label: 'Partially paid',
      cls: 'bg-[#FFF1C2] text-[#8A6200]',
    };
  }

  if (status === 'issued') {
    return { label: 'Issued', cls: 'bg-peach-chip text-text' };
  }

  return {
    label: status.replaceAll('_', ' '),
    cls: 'bg-surface-tint text-ink',
  };
}

export function InvoiceRow({
  inv,
  overdue,
  onReview,
}: {
  inv: InvoiceRowData;
  overdue: boolean;
  onReview: (inv: InvoiceRowData) => void;
}) {
  const total = safeAmount(inv.total_minor);
  const paid = safeAmount(inv.amount_paid_minor);
  const balance = Math.max(0, total - paid);

  const canReview = inv.latest_claim?.status === 'pending';

  const canRemind =
    !!inv.share_token &&
    balance > 0 &&
    !['draft', 'cancelled', 'paid'].includes(inv.status);

  const count = Number(canReview) + Number(canRemind);
  const width = count * ACTION_W;

  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const start = useRef<{ x: number; base: number } | null>(null);
  const moved = useRef(false);

  const chip = statusChip(inv, overdue);

  function remindHref() {
    const amount = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: inv.currency,
    }).format(balance / 100);

    const link = `${window.location.origin}/i/${inv.share_token}`;

    const message =
      `Hi ${inv.client_name ?? ''}, a friendly reminder that invoice ` +
      `${inv.invoice_number} (${amount}) ` +
      `${overdue ? 'was due on' : 'is due on'} ${formatDate(inv.due_date)}. ` +
      `You can view and pay here: ${link}`;

    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  const row = (
    <div className="flex min-h-[72px] items-center gap-3 p-3">
      <span
        aria-hidden
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink font-extrabold',
          colorFor(inv.client_name),
        )}
      >
        {initials(inv.client_name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold">
          {inv.client_name || 'Unnamed client'}
        </p>

        <p
          className={cn(
            'text-caption',
            overdue ? 'font-bold text-danger' : 'text-text-soft',
          )}
        >
          {inv.invoice_number} · due {formatDate(inv.due_date)}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <Money
          amountMinor={balance}
          currency={inv.currency}
          className="font-extrabold"
          hideCurrencyCode
        />

        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-caption font-extrabold capitalize',
            chip.cls,
          )}
        >
          {chip.label}
        </span>
      </div>
    </div>
  );

  if (count === 0) {
    return (
      <Link
        href={`/invoices/${encodeURIComponent(inv.id)}`}
        className="block overflow-hidden rounded-card border-brut border-ink bg-surface shadow-brut-sm"
      >
        {row}
      </Link>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-card border-brut border-ink bg-surface shadow-brut-sm">
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width }}
        aria-hidden={offset === 0}
      >
        {canReview && (
          <button
            type="button"
            tabIndex={offset === 0 ? -1 : 0}
            onClick={() => onReview(inv)}
            className="flex flex-1 flex-col items-center justify-center gap-1 border-l-brut border-ink bg-sun text-caption font-extrabold text-ink"
          >
            <CheckCircle2 aria-hidden className="h-5 w-5" />
            Review
          </button>
        )}

        {canRemind && (
          <a
            href={remindHref()}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={offset === 0 ? -1 : 0}
            className="flex flex-1 flex-col items-center justify-center gap-1 border-l-brut border-ink bg-mango text-caption font-extrabold text-on-mango"
          >
            <MessageCircle aria-hidden className="h-5 w-5" />
            Remind
          </a>
        )}
      </div>

      <div
        className={cn(
          'relative flex items-stretch bg-surface motion-reduce:transition-none',
          !dragging && 'transition-transform duration-200',
        )}
        style={{
          transform: `translateX(${offset}px)`,
          touchAction: 'pan-y',
        }}
        onPointerDown={(event) => {
          start.current = {
            x: event.clientX,
            base: offset,
          };
          moved.current = false;
        }}
        onPointerMove={(event) => {
          if (!start.current) return;

          const dx = event.clientX - start.current.x;

          if (Math.abs(dx) > 6) {
            moved.current = true;
          }

          if (moved.current) {
            setDragging(true);
            setOffset(
              Math.min(
                0,
                Math.max(-width, start.current.base + dx),
              ),
            );
          }
        }}
        onPointerUp={() => {
          if (dragging) {
            setOffset(offset < -width / 2 ? -width : 0);
          }

          start.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          setOffset(0);
          start.current = null;
          setDragging(false);
        }}
        onClickCapture={(event) => {
          if (moved.current) {
            event.preventDefault();
            event.stopPropagation();
            moved.current = false;
          } else if (offset !== 0) {
            event.preventDefault();
            event.stopPropagation();
            setOffset(0);
          }
        }}
      >
        <Link
          href={`/invoices/${encodeURIComponent(inv.id)}`}
          className="min-w-0 flex-1"
        >
          {row}
        </Link>

        <button
          type="button"
          aria-label={
            offset === 0 ? 'Show quick actions' : 'Hide quick actions'
          }
          aria-expanded={offset !== 0}
          onClick={() => setOffset((value) => (value === 0 ? -width : 0))}
          className="flex w-11 shrink-0 items-center justify-center text-text-muted"
        >
          <MoreHorizontal aria-hidden className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
