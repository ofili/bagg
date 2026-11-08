'use client';

/*
 * Phone row for the contacts list. Replaces the renderMobileCard body.
 * Tap the row to edit the contact. Call and WhatsApp are 44px buttons on the
 * right. There is no delete here: it stays on tablet and desktop, and the edit
 * page is the place for it on a phone.
 */
import Link from 'next/link';
import { MessageCircle, Phone, UserRound } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ContactRowData {
    id: string;
    name: string;
    job_title?: string | null;
    email?: string | null;
    phone?: string | null;
    is_primary: boolean;
}

const clean = (p?: string | null) => (p ? p.replace(/[^0-9+]/g, '') : '');

export function ContactRow({ contact, clientName }: { contact: ContactRowData; clientName: string }) {
    const phone = clean(contact.phone);
    const sub = [contact.job_title, clientName].filter(Boolean).join(' · ');

    return (
        <div className="flex items-stretch overflow-hidden rounded-card border-brut border-ink bg-surface shadow-brut-sm">
            <Link
                href={`/clients/contacts/${encodeURIComponent(contact.id)}/edit`}
                className="flex min-h-[72px] min-w-0 flex-1 items-center gap-3 p-3"
            >
        <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink bg-sun"
        >
          <UserRound className="h-5 w-5" />
        </span>
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                        <span className="truncate font-extrabold">{contact.name}</span>
                        {contact.is_primary && (
                            <span className="shrink-0 rounded-full bg-surface-tint px-2 py-0.5 text-caption font-extrabold">Primary</span>
                        )}
                    </p>
                    <p className="truncate text-caption text-text-soft">{sub || contact.email || 'No details yet'}</p>
                </div>
            </Link>
            {phone && (
                <>
                    <a
                        href={`tel:${phone}`}
                        aria-label={`Call ${contact.name}`}
                        className={cn('flex w-12 shrink-0 items-center justify-center border-l-brut border-ink bg-surface')}
                    >
                        <Phone aria-hidden className="h-5 w-5" />
                    </a>
                    <a
                        href={`https://wa.me/${phone.replace(/\+/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Message ${contact.name} on WhatsApp`}
                        className="flex w-12 shrink-0 items-center justify-center border-l-brut border-ink bg-mango text-on-mango"
                    >
                        <MessageCircle aria-hidden className="h-5 w-5" />
                    </a>
                </>
            )}
        </div>
    );
}
