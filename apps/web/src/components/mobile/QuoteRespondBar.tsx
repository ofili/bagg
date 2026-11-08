'use client';

/*
 * Sticky Accept / Decline bar for the public quote page (/q/[token]) on phones.
 * Accepting is the main action and always in reach while the client reads the
 * scope. Only rendered while the quote can still be answered (the page already
 * works that out as `canRespond`). Hidden from sm up, where the inline buttons stay.
 */
import { Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { Money } from '@/components/money/Money';

export function QuoteRespondBar({
                                    netPayableMinor,
                                    currency,
                                    onAccept,
                                    onDecline,
                                }: {
    netPayableMinor: number;
    currency: string;
    onAccept: () => void;
    onDecline: () => void;
}) {
    return (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 space-y-2 border-t-brut border-ink bg-surface px-4 pt-3 sm:hidden">
            <div className="flex items-baseline justify-between">
                <span className="text-body text-text-soft">Net payable</span>
                <Money amountMinor={netPayableMinor} currency={currency} className="text-amount-m" hideCurrencyCode />
            </div>
            <div className="flex gap-3 pb-3">
                <Button variant="outline" zone="calm" size="lg" onClick={onDecline}>
                    Decline
                </Button>
                <Button zone="calm" size="lg" fullWidth onClick={onAccept}>
                    <Check aria-hidden className="h-4 w-4" /> Accept quote
                </Button>
            </div>
        </div>
    );
}
