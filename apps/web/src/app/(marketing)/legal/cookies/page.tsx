
import Link from 'next/link';
import { Cookie, Monitor, ShieldCheck, Trash2 } from 'lucide-react';

import {
    LegalDocumentFooter,
    LegalDocumentHeader,
    LegalSection,
} from '@/components/marketing/legal-document';
import { LegalNotice } from '@/components/marketing/legal-notice';
import { marketingMetadata } from '@/lib/metadata';
import { contactEmail } from '@/lib/site';
import { Metadata } from 'next';

export const metadata: Metadata = marketingMetadata({
    title: 'Cookies',
    description: 'What bagg stores in your browser and why.',
    path: '/legal/cookies',
    noIndex: true,
});

export default function CookiesPage() {
    return (
        <article>
            <LegalDocumentHeader
                eyebrow="Cookies and browser storage"
                title={<>Small files.<br /><span className="text-link">Clear purpose.</span></>}
                description="We keep browser storage to a minimum. Here is what bagg stores, why it is there and how to remove it."
                icon={<Cookie className="h-5 w-5" aria-hidden="true" />}
                tone="mango"
            />

            <LegalNotice />

            <div className="mt-8 border-brut border-ink bg-surface p-5 shadow-brut">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-ink" aria-hidden="true" />
                    <div>
                        <p className="font-extrabold text-ink">Essential storage only</p>
                        <p className="mt-1 text-body leading-relaxed text-text-soft">
                            The current notice describes essential sign-in storage and
                            remembering your cookie-notice choice. It does not describe
                            advertising cookies or third-party tracking pixels.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-10 space-y-10">
                <LegalSection
                    number="01"
                    title="Essential sign-in cookie"
                    icon={<Monitor className="h-5 w-5" />}
                    tone="mango"
                >
                    <p>
                        When you sign in, bagg sets an essential session cookie so the
                        server can recognise your workspace. Without it, you would have
                        to sign in again on every page.
                    </p>
                    <StorageCard
                        name="Session cookie"
                        purpose="Keeps your authenticated session available."
                        type="Essential"
                    />
                </LegalSection>

                <LegalSection
                    number="02"
                    title="Your cookie notice choice"
                    icon={<Cookie className="h-5 w-5" />}
                    tone="mango"
                >
                    <p>
                        When you dismiss the cookie notice, we store that choice in your
                        browser’s local storage. It is not sent to us with every request.
                        It only stops the notice from appearing again on this device.
                    </p>
                    <StorageCard
                        name="bagg-cookie-notice"
                        purpose="Remembers that you dismissed the cookie notice."
                        type="Local storage"
                    />
                </LegalSection>

                <LegalSection
                    number="03"
                    title="What we do not use"
                    icon={<ShieldCheck className="h-5 w-5" />}
                    tone="mango"
                >
                    <p>
                        The marketing site does not use advertising cookies or
                        third-party tracking pixels. If that changes, this page and
                        the notice will be updated before the new storage is used.
                    </p>
                </LegalSection>

                <LegalSection
                    number="04"
                    title="Managing browser storage"
                    icon={<Trash2 className="h-5 w-5" />}
                    tone="mango"
                >
                    <p>
                        You can clear cookies and local storage in your browser settings.
                        Clearing the sign-in cookie will sign you out. Clearing the
                        notice choice will make the notice appear again.
                    </p>

                    <div className="border-brut border-ink bg-peach p-5">
                        <h3 className="font-extrabold text-ink">What happens if you clear it?</h3>
                        <ul className="mt-3 space-y-3 text-body leading-relaxed text-text-soft">
                            <li className="flex items-start gap-3">
                                <span className="mt-2 h-2.5 w-2.5 shrink-0 border-brut border-ink bg-mango" />
                                <span>
                                    <strong className="text-ink">Session cookie:</strong>{' '}
                                    You will be signed out and need to sign in again.
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-2 h-2.5 w-2.5 shrink-0 border-brut border-ink bg-mango" />
                                <span>
                                    <strong className="text-ink">Notice choice:</strong>{' '}
                                    The cookie notice will appear again.
                                </span>
                            </li>
                        </ul>
                    </div>

                    <p>
                        For more on how we handle personal information, read the{' '}
                        <Link
                            href="/legal/privacy"
                            className="font-extrabold text-link underline underline-offset-4"
                        >
                            privacy summary
                        </Link>
                        .
                    </p>
                </LegalSection>

                <LegalSection
                    number="05"
                    title="Questions"
                    icon={<Cookie className="h-5 w-5" />}
                    tone="mango"
                >
                    <p>
                        Email{' '}
                        <a
                            href={`mailto:${contactEmail}`}
                            className="font-extrabold text-link underline underline-offset-4"
                        >
                            {contactEmail}
                        </a>{' '}
                        if something here is unclear.
                    </p>
                </LegalSection>
            </div>

            <LegalDocumentFooter
                current="cookies"
                eyebrow="The bigger picture"
                title="Browser storage is only one part of privacy."
                copy="Your workspace information, client records and documents are covered by our privacy summary."
                tone="mango"
                nextLabel="Privacy"
                nextHref="/legal/privacy"
                nextIcon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            />
        </article>
    );
}

function StorageCard({
                         name,
                         purpose,
                         type,
                     }: {
    name: string;
    purpose: string;
    type: string;
}) {
    return (
        <div className="border-brut border-ink bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <code className="break-all text-body font-bold text-ink">{name}</code>
                <span className="rounded-full border-brut border-ink bg-peach px-2 py-1 text-caption font-extrabold uppercase tracking-wider text-ink">
                    {type}
                </span>
            </div>
            <p className="mt-2 text-body leading-relaxed text-text-soft">{purpose}</p>
        </div>
    );
}
