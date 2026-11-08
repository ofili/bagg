'use client';

/*
 * Phone row for the quotes list. Replaces the renderMobileCard body.
 *
 * The row opens the quotes. The next step for each state sits right under it,
 * because quotes have one obvious next action:
 *   issued   -> Send quotes            sent / viewed -> Send again
 *   accepted -> Convert to invoice    converted     -> View invoice
 *   draft    -> (tap the row to finish it)
 * The button is a sibling of the link, never nested inside it.
 */
import Link from 'next/link';
import { Button, buttonStyles } from '@/components/ui';
import { Money } from '@/components/money/Money';
import { StatusPill } from '@/components/status';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import type { QuoteCardData } from '@/components/mobile/QuoteCard';

const COLORS = ['bg-mango', 'bg-pink', 'bg-sun', 'bg-leaf'];
const initials = (n?: string | null) => {
    const p = (n ?? '?').trim().split(/\s+/);
    return ((p[0]?.[0] ?? '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
};
const colorFor = (n?: string | null) => {
    let h = 0;
    for (const ch of n ?? '') h = (h * 31 + ch.charCodeAt(0)) % COLORS.length;
    return COLORS[h];
};

export function QuoteRow({
                             quote,
                             sending,
                             converting,
                             onSend,
                             onConvert,
                         }: {
    quote: QuoteCardData;
    sending: boolean;
    converting: boolean;
    onSend: (q: QuoteCardData) => void;
    onConvert: (q: QuoteCardData) => void;
}) {
    const expired =
        (quote.is_expired || quote.effective_status === 'expired') && !['accepted', 'converted'].includes(quote.status);

    return (
        <div className="overflow-hidden rounded-card border-brut border-ink bg-surface shadow-brut-sm">
            <Link href={`/quotes/${quote.id}`} className="flex min-h-[72px] items-center gap-3 p-3">
        <span
            aria-hidden
            className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink font-extrabold',
                colorFor(quote.client_name),
            )}
        >
          {initials(quote.client_name)}
        </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{quote.client_name || 'Unnamed client'}</p>
                    <p className={cn('text-caption', expired ? 'font-bold text-danger' : 'text-text-soft')}>
                        {quote.quote_number} · {expired ? 'expired' : 'expires'} {formatDate(quote.expires_at)}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Money amountMinor={quote.net_payable_minor} currency={quote.currency} className="font-extrabold" hideCurrencyCode />
                    <StatusPill status={expired ? 'expired' : quote.effective_status || quote.status} />
                </div>
            </Link>

            {['issued', 'sent', 'viewed'].includes(quote.status) && (
                <div className="border-t border-line-subtle p-2">
                    <Button
                        zone="calm"
                        variant={quote.status === 'issued' ? undefined : 'outline'}
                        fullWidth
                        loading={sending}
                        onClick={() => onSend(quote)}
                    >
                        {quote.status === 'issued' ? 'Send quotes' : 'Send again'}
                    </Button>
                </div>
            )}
            {quote.status === 'accepted' && (
                <div className="border-t border-line-subtle p-2">
                    <Button zone="calm" fullWidth loading={converting} onClick={() => onConvert(quote)}>
                        Convert to invoice
                    </Button>
                </div>
            )}
            {quote.status === 'converted' && (
                <div className="border-t border-line-subtle p-2">
                    <Link
                        href={quote.invoice_id ? `/invoices/${quote.invoice_id}` : '/invoices'}
                        className={buttonStyles({ variant: 'outline', zone: 'calm', fullWidth: true })}
                    >
                        View invoice
                    </Link>
                </div>
            )}
        </div>
    );
}
