
import Link from 'next/link';
import {
    ArrowRight,
    Cookie,
    Monitor,
    ShieldCheck,
    Trash2,
} from 'lucide-react';

import { LegalNotice } from '@/components/marketing/legal-notice';
import { marketingMetadata } from '@/lib/metadata';
import { contactEmail } from '@/lib/site';
import React from "react";
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
    title: 'cookies',
    description: 'What bagg stores in your browser and why.',
    path: '/legal/cookies',
    noIndex: true,
});

export default function CookiesPage() {
    return (
        <article>
            <header className="mb-8">
                <div className="mb-5 inline-flex items-center gap-2 border-2 border-ink bg-mango px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink shadow-[3px_3px_0_0_#171717]">
                    <Cookie className="h-5 w-5" aria-hidden="true" />
                    Cookies and browser storage
                </div>

                <h1 className="text-4xl font-black leading-[0.98] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                    Small files.
                    <br />
                    <span className="text-mango">Clear purpose.</span>
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
                    We keep browser storage to a minimum. Here is what bagg stores,
                    why it is there and how to remove it.
                </p>
            </header>

            <LegalNotice />

            <div className="mt-8 border-2 border-ink bg-surface p-5 shadow-[4px_4px_0_0_#171717]">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-ink" aria-hidden="true" />
                    <div>
                        <p className="font-black text-ink">Essential storage only</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
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
                >
                    <p>
                        You can clear cookies and local storage in your browser settings.
                        Clearing the sign-in cookie will sign you out. Clearing the
                        notice choice will make the notice appear again.
                    </p>

                    <div className="border-2 border-ink bg-peach p-5">
                        <h3 className="font-black text-ink">What happens if you clear it?</h3>
                        <ul className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
                            <li className="flex items-start gap-3">
                                <span className="mt-0.5 h-2.5 w-2.5 shrink-0 border-2 border-ink bg-mango" />
                                <span>
                  <strong className="text-ink">Session cookie:</strong>{' '}
                                    You will be signed out and need to sign in again.
                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="mt-0.5 h-2.5 w-2.5 shrink-0 border-2 border-ink bg-mango" />
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

            <div className="mt-14 border-2 border-ink bg-mango p-5 shadow-[5px_5px_0_0_#171717] sm:p-6">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink">
                    The bigger picture
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-ink">
                    Browser storage is only one part of privacy.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
                    Your workspace information, client records and documents are
                    covered by our privacy summary.
                </p>
                <Link
                    href="/legal/privacy"
                    className="mt-5 inline-flex items-center gap-2 border-2 border-ink bg-surface px-4 py-3 text-sm font-extrabold text-ink shadow-[3px_3px_0_0_#171717] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                >
                    Read privacy
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

function LegalSection({
                          number,
                          title,
                          icon,
                          children,
                      }: {
    number: string;
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="border-t-2 border-ink pt-6">
            <div className="flex items-start gap-4">
        <span className="border-2 border-ink bg-mango px-2 py-1 font-mono text-xs font-bold text-ink">
          {number}
        </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-ink">
                        {icon}
                        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
                    </div>
                    <div className="mt-4 space-y-4 text-base leading-8 text-ink-soft">
                        {children}
                    </div>
                </div>
            </div>
        </section>
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
        <div className="border-2 border-ink bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <code className="break-all text-sm font-bold text-ink">{name}</code>
                <span className="border border-ink bg-peach px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-ink">
          {type}
        </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{purpose}</p>
        </div>
    );
}
