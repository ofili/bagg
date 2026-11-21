
'use client';

import Link from 'next/link';
import { Building2, ChevronRight, MessageCircle } from 'lucide-react';

import { Money } from '@/components/money/Money';
import { cn } from '@/lib/cn';

export interface ClientRowData {
  id: string;
  name: string;
  client_type: 'PERSON' | 'BUSINESS';
  preferred_currency: string;
  total_outstanding_minor: number;
  invoice_count: number;
  phone?: string | null;
}

const COLORS = [
  'bg-mango text-on-mango',
  'bg-pink text-on-pink',
  'bg-sun text-on-sun',
  'bg-leaf text-on-leaf',
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);

  return (
    (parts[0]?.[0] ?? '?') +
    (parts.length > 1 ? parts[parts.length - 1][0] : '')
  ).toUpperCase();
}

function colorFor(name: string) {
  let hash = 0;

  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) % COLORS.length;
  }

  return COLORS[hash];
}

export function ClientRow({ client }: { client: ClientRowData }) {
  const phone = client.phone
    ? client.phone.replace(/\D/g, '')
    : '';

  const hasOutstandingBalance = client.total_outstanding_minor > 0;

  return (
    <article className="flex items-stretch overflow-hidden border-brut border-ink bg-surface shadow-brut-sm">
      <Link
        href={`/clients/${encodeURIComponent(client.id)}`}
        className="flex min-h-[76px] min-w-0 flex-1 items-center gap-3 p-3 transition-colors hover:bg-surface-tint focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mango"
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink font-extrabold',
            colorFor(client.name),
          )}
        >
          {client.client_type === 'BUSINESS' ? (
            <Building2 className="h-5 w-5" />
          ) : (
            initials(client.name)
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold text-ink">
            {client.name}
          </span>

          <span className="block text-caption text-text-soft">
            {client.invoice_count}{' '}
            {client.invoice_count === 1 ? 'invoice' : 'invoices'}
            {' · '}
            {client.preferred_currency}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end">
          {hasOutstandingBalance ? (
            <>
              <Money
                amountMinor={client.total_outstanding_minor}
                currency={client.preferred_currency}
                className="font-extrabold"
                hideCurrencyCode
              />
              <span className="text-caption text-text-soft">
                outstanding
              </span>
            </>
          ) : (
            <span className="rounded-full bg-surface-tint px-2 py-1 text-caption font-bold text-text-soft">
              No balance due
            </span>
          )}
        </span>

        <ChevronRight
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-text-muted"
        />
      </Link>

      {phone && (
        <a
          href={`https://wa.me/${phone}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Message ${client.name} on WhatsApp`}
          className="flex min-h-[76px] w-14 shrink-0 items-center justify-center border-l-brut border-ink bg-mango text-on-mango transition-colors hover:bg-mango/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
        >
          <MessageCircle aria-hidden="true" className="h-5 w-5" />
        </a>
      )}
    </article>
  );
}
