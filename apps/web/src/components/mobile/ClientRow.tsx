'use client';

/*
 * Phone row for the clients tab. Replaces the tall client card on phones.
 * Tap the row to open the client. WhatsApp is a separate 44px button.
 * No edit or delete icons here: edit lives on the client page, and delete
 * stays on tablet and desktop so it can't be hit by accident on a phone.
 */
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

const COLORS = ['bg-mango', 'bg-pink', 'bg-sun', 'bg-leaf'];
const initials = (n: string) => {
    const p = n.trim().split(/\s+/);
    return ((p[0]?.[0] ?? '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};
const colorFor = (n: string) => {
    let h = 0;
    for (const ch of n) h = (h * 31 + ch.charCodeAt(0)) % COLORS.length;
    return COLORS[h];
};

export function ClientRow({ client }: { client: ClientRowData }) {
    const phone = client.phone ? client.phone.replace(/[^0-9]/g, '') : '';
    const owes = client.total_outstanding_minor > 0;

    return (
        <div className="flex items-stretch overflow-hidden rounded-card border-brut border-ink bg-surface shadow-brut-sm">
            <Link href={`/clients/${client.id}`} className="flex min-h-[72px] min-w-0 flex-1 items-center gap-3 p-3">
        <span
            aria-hidden
            className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink font-extrabold',
                colorFor(client.name),
            )}
        >
          {client.client_type === 'BUSINESS' ? <Building2 className="h-5 w-5" /> : initials(client.name)}
        </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{client.name}</p>
                    <p className="text-caption text-text-soft">
                        {client.invoice_count} {client.invoice_count === 1 ? 'invoice' : 'invoices'} · {client.preferred_currency}
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    {owes ? (
                        <>
                            <Money
                                amountMinor={client.total_outstanding_minor}
                                currency={client.preferred_currency}
                                className="font-extrabold"
                                hideCurrencyCode
                            />
                            <span className="text-caption text-text-soft">owes</span>
                        </>
                    ) : (
                        <span className="rounded-full bg-leaf px-2 py-0.5 text-caption font-extrabold text-[#052E1B]">All paid</span>
                    )}
                </div>
                <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-text-muted" />
            </Link>
            {phone && (
                <a
                    href={`https://wa.me/${phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Message ${client.name} on WhatsApp`}
                    className="flex w-14 shrink-0 items-center justify-center border-l-brut border-ink bg-mango text-on-mango"
                >
                    <MessageCircle aria-hidden className="h-5 w-5" />
                </a>
            )}
        </div>
    );
}
