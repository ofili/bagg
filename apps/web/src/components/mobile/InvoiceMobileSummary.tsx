'use client';

/*
 * Phone-only summary at the top of the invoice detail page.
 * The balance is the biggest thing on screen, with a progress bar once any
 * payment has been confirmed. Hidden from the sm breakpoint up, where the
 * existing layout already shows this information.
 */
import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

export function InvoiceMobileSummary({
                                         clientName,
                                         dueDate,
                                         currency,
                                         netPayableMinor,
                                         paidMinor,
                                         overdue,
                                     }: {
    clientName?: string | null;
    dueDate: string;
    currency: string;
    /** Amount the client owes in total (net payable, or the total when there is no net figure). */
    netPayableMinor: number;
    paidMinor: number;
    overdue: boolean;
}) {
    const balance = Math.max(0, netPayableMinor - paidMinor);
    const pct = netPayableMinor > 0 ? Math.min(100, Math.round((paidMinor / netPayableMinor) * 100)) : 0;
    const settled = balance === 0 && netPayableMinor > 0;

    return (
        <section
            aria-label="Invoice summary"
            className="space-y-2 rounded-card border-brut border-ink bg-surface p-4 shadow-brut-sm sm:hidden"
        >
            <p className="truncate text-body-l font-extrabold">{clientName || 'Client'}</p>
            <p className={cn('text-caption', overdue ? 'font-bold text-danger' : 'text-text-soft')}>
                {overdue ? 'Overdue · was due ' : 'Due '}
                {formatDate(dueDate)}
            </p>

            <p className="pt-1 text-caption text-text-soft">{settled ? 'Paid in full' : 'Balance due'}</p>
            <Money
                amountMinor={settled ? netPayableMinor : balance}
                currency={currency}
                variant={settled ? 'paid' : 'total'}
                className="block text-amount-l"
                hideCurrencyCode
            />

            {paidMinor > 0 && !settled && (
                <div className="space-y-1.5 pt-1">
                    <div
                        role="progressbar"
                        aria-label="Amount paid so far"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                        className="h-3.5 overflow-hidden rounded-full border-brut-thin border-ink bg-cream"
                    >
                        <div className="h-full bg-leaf" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-caption text-text-soft">
                        <Money amountMinor={paidMinor} currency={currency} variant="inherit" hideCurrencyCode /> paid of{' '}
                        <Money amountMinor={netPayableMinor} currency={currency} variant="inherit" hideCurrencyCode />
                    </p>
                </div>
            )}
        </section>
    );
}
