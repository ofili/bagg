'use client';

/*
 * Phone-only summary at the top of the quote detail page.
 *
 * Displays:
 * - Client name
 * - Quote expiry date and status
 * - Net payable amount
 * - Deposit amount, where applicable
 *
 * Hidden on tablet and desktop.
 */

import { Money } from '@/components/money/Money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';

interface QuoteMobileSummaryProps {
    clientName?: string | null;
    currency: string;
    netPayableMinor: number;
    depositMinor?: number | null;
    depositPercent?: number | null;
    expiresAt: string;
    expired: boolean;
}

export function QuoteMobileSummary({
                                       clientName,
                                       currency,
                                       netPayableMinor,
                                       depositMinor,
                                       depositPercent,
                                       expiresAt,
                                       expired,
                                   }: QuoteMobileSummaryProps) {
    return (
        <section
            aria-label="Quote summary"
            className="space-y-2 rounded-card border-brut border-ink bg-surface p-4 shadow-brut-sm sm:hidden"
        >
            <p className="truncate text-body-l font-extrabold">
                {clientName || 'Client'}
            </p>

            <p
                className={cn(
                    'text-caption',
                    expired
                        ? 'font-bold text-danger'
                        : 'text-text-soft',
                )}
            >
                {expired ? 'Expired ' : 'Valid until '}
                {formatDate(expiresAt)}
            </p>

            <p className="pt-1 text-caption text-text-soft">
                Net payable
            </p>

            <Money
                amountMinor={netPayableMinor}
                currency={currency}
                variant="total"
                className="block text-amount-l"
                hideCurrencyCode
            />

            {depositMinor != null && depositMinor > 0 && (
                <p className="text-body">
                    Deposit
                    {depositPercent != null
                        ? ` (${depositPercent}%)`
                        : ''}
                    :{' '}
                    <Money
                        amountMinor={depositMinor}
                        currency={currency}
                        variant="inherit"
                        className="font-extrabold"
                        hideCurrencyCode
                    />
                </p>
            )}
        </section>
    );
}