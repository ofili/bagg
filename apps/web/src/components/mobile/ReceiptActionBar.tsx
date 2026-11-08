'use client';

/*
 * Sticky action bar for the receipt detail page on phones: Share is the main
 * action (the share sheet is what people want from a receipt), Copy link is
 * beside it. Print stays on tablet and desktop. Hidden from sm up.
 */
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui';

export function ReceiptActionBar({
                                     canShare,
                                     copied,
                                     onShare,
                                     onCopy,
                                 }: {
    canShare: boolean;
    copied: boolean;
    onShare: () => void;
    onCopy: () => void;
}) {
    if (!canShare) return null;
    return (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-brut border-ink bg-surface px-4 pt-3 sm:hidden print:hidden">
            <div className="flex gap-3 pb-3">
                <Button variant="outline" zone="calm" size="lg" onClick={onCopy}>
                    {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button size="lg" fullWidth onClick={onShare}>
                    <Share2 aria-hidden className="h-4 w-4" /> Share receipt
                </Button>
            </div>
        </div>
    );
}
