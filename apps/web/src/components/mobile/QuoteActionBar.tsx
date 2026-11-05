'use client';

/*
 * Sticky action bar for the quote detail page on phones. One main action by state:
 *   draft                             -> Approve & issue (opens your existing dialog)
 *   issued / sent / viewed / review   -> Share quote (WhatsApp, link copied as a fallback)
 *   accepted                          -> Convert to invoice
 *   declined                          -> Create revision
 *   converted                         -> View invoice
 * Edit draft, Create revision, Copy link and Preview live in the More sheet.
 * Issuing and sharing stay separate actions.
 */
import Link from 'next/link';
import { Copy, ExternalLink, MoreHorizontal, Pencil, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button, buttonStyles } from '@/components/ui';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';

export interface QuoteActionBarProps {
    status: string;
    canEditDraft: boolean;
    canRevise: boolean;
    busy: boolean;
    invoiceHref?: string;
    publicUrl?: string | null;
    onIssue: () => void;
    onShare: () => void;
    onConvert: () => void;
    onEdit: () => void;
    onRevise: () => void;
    onCopy: () => void;
}

const row = 'flex min-h-14 w-full items-center gap-3 rounded-row px-3 text-left text-body-l font-extrabold hover:bg-surface-tint';

export function QuoteActionBar(p: QuoteActionBarProps) {
    const [more, setMore] = useState(false);
    const shareable = ['issued', 'sent', 'viewed', 'review_requested'].includes(p.status);

    let primary: { label: string; run: () => void } | null = null;
    if (p.status === 'draft') primary = { label: 'Approve & issue', run: p.onIssue };
    else if (shareable) primary = { label: 'Share quote', run: p.onShare };
    else if (p.status === 'accepted') primary = { label: 'Convert to invoice', run: p.onConvert };
    else if (p.status === 'declined' && p.canRevise) primary = { label: 'Create revision', run: p.onRevise };

    const hasMore = p.canEditDraft || (p.canRevise && p.status !== 'declined') || !!p.publicUrl;

    return (
        <>
            <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-brut border-ink bg-surface px-4 pt-3 sm:hidden">
                <div className="flex items-center gap-3 pb-3">
                    {hasMore && (
                        <button
                            type="button"
                            aria-label="More actions"
                            aria-haspopup="dialog"
                            onClick={() => setMore(true)}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-btn border-brut border-ink bg-surface"
                        >
                            <MoreHorizontal aria-hidden className="h-5 w-5" />
                        </button>
                    )}
                    {primary && (
                        <Button size="lg" fullWidth loading={p.busy} onClick={primary.run}>
                            {primary.label}
                        </Button>
                    )}
                    {p.status === 'converted' && p.invoiceHref && (
                        <Link href={p.invoiceHref} className={cn(buttonStyles({ size: 'lg' }), 'flex-1')}>
                            View invoice
                        </Link>
                    )}
                </div>
            </div>

            <Sheet open={more} onOpenChange={setMore}>
                <SheetContent title="More actions">
                    <div className="space-y-1 p-4 pb-8">
                        <h2 className="px-2 pb-2 text-title">more</h2>
                        {p.canEditDraft && (
                            <button type="button" className={row} onClick={() => { setMore(false); p.onEdit(); }}>
                                <Pencil aria-hidden className="h-5 w-5" /> Edit draft
                            </button>
                        )}
                        {p.canRevise && p.status !== 'declined' && (
                            <button type="button" className={row} onClick={() => { setMore(false); p.onRevise(); }}>
                                <RotateCcw aria-hidden className="h-5 w-5" /> Create revision
                            </button>
                        )}
                        {p.publicUrl && (
                            <>
                                <button type="button" className={row} onClick={p.onCopy}>
                                    <Copy aria-hidden className="h-5 w-5" /> Copy client link
                                </button>
                                {shareable && (
                                    <a href={p.publicUrl} target="_blank" rel="noreferrer" className={row}>
                                        <ExternalLink aria-hidden className="h-5 w-5" /> Preview as client
                                    </a>
                                )}
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
