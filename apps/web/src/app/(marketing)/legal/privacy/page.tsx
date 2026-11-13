
import Link from 'next/link';
import {
    ArrowRight,
    Database,
    Eye,
    FileText,
    LockKeyhole,
    ShieldCheck,
} from 'lucide-react';

import { LegalNotice } from '@/components/marketing/legal-notice';
import { marketingMetadata } from '@/lib/metadata';
import { contactEmail } from '@/lib/site';
import React from "react";
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
    title: 'privacy',
    description: 'The plain-language summary of how bagg handles personal information.',
    path: '/legal/privacy',
    noIndex: true,
});

const contents = [
    ['01', 'Information we collect', 'information'],
    ['02', 'How we use information', 'use'],
    ['03', 'Who we share it with', 'sharing'],
    ['04', 'Storage and retention', 'retention'],
    ['05', 'Your rights and choices', 'rights'],
    ['06', 'Contact', 'contact'],
];

export default function PrivacyPage() {
    return (
        <article>
            <header className="mb-8">
                <div className="mb-5 inline-flex items-center gap-2 border-2 border-ink bg-pink px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink shadow-[3px_3px_0_0_#171717]">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    Privacy
                </div>

                <h1 className="text-4xl font-black leading-[0.98] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                    Your business.
                    <br />
                    <span className="text-pink">Your information.</span>
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
                    A straightforward explanation of the information bagg handles,
                    why we use it and the choices available to you.
                </p>
            </header>

            <LegalNotice />

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <PrivacyPrinciple
                    icon={<Database className="h-5 w-5" />}
                    title="Purpose-led"
                    copy="Information is used to operate and support the service."
                />
                <PrivacyPrinciple
                    icon={<Eye className="h-5 w-5" />}
                    title="No data sales"
                    copy="We do not sell your personal information."
                />
            </div>

            <div className="mt-8 border-2 border-ink bg-surface p-5 shadow-[4px_4px_0_0_#171717]">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">
                    On this page
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {contents.map(([number, label, id]) => (
                        <a
                            key={id}
                            href={`#${id}`}
                            className="flex items-center gap-3 text-sm font-bold text-ink-soft hover:text-ink"
                        >
                            <span className="font-mono text-xs text-ink-muted">{number}</span>
                            <span className="underline decoration-transparent underline-offset-4 hover:decoration-ink">
                {label}
              </span>
                        </a>
                    ))}
                </div>
            </div>

            <div className="mt-10 space-y-10">
                <LegalSection id="information" number="01" title="Information we collect">
                    <p>
                        Your email address and sign-in details. The business name, logo,
                        payment details and workspace settings you add. Client names,
                        contact details, invoices, quotes, line items, reminders and
                        receipts you create.
                    </p>
                    <p>
                        Technical information needed to operate the service, such as
                        delivery events, error logs and the basic device information sent
                        by your browser.
                    </p>
                </LegalSection>

                <LegalSection id="use" number="02" title="How we use information">
                    <p>
                        To create and maintain your workspace, generate documents, send
                        the emails you ask us to send, show payment status, provide
                        support and protect the service from abuse.
                    </p>
                    <p>
                        We do not sell your personal information. We do not use
                        advertising cookies on the marketing site.
                    </p>
                </LegalSection>

                <LegalSection id="sharing" number="03" title="Who we share it with">
                    <p>
                        We use service providers for email delivery, file storage and
                        payment processing. They receive only what they need to perform
                        that service.
                    </p>
                    <p>
                        We may also disclose information where the law requires it or
                        where it is necessary to protect a person from harm.
                    </p>
                </LegalSection>

                <LegalSection id="retention" number="04" title="Storage and retention">
                    <p>
                        We keep workspace and document records while your account is
                        active. If you close your account, we will delete or anonymise
                        the information unless we need to keep it for a legal, tax or
                        security reason.
                    </p>
                </LegalSection>

                <LegalSection id="rights" number="05" title="Your rights and choices">
                    <p>
                        You can ask to see, correct or delete the personal information
                        we hold about you. You can also ask how we use it.
                    </p>
                    <p>
                        Email{' '}
                        <a
                            href={`mailto:${contactEmail}`}
                            className="font-extrabold text-link underline underline-offset-4"
                        >
                            {contactEmail}
                        </a>{' '}
                        and tell us what you need.
                    </p>
                    <div className="border-l-4 border-pink bg-surface p-4">
                        <p className="text-sm leading-relaxed text-ink-soft">
                            For browser cookies and local storage, read the{' '}
                            <Link
                                href="/legal/cookies"
                                className="font-extrabold text-link underline underline-offset-4"
                            >
                                cookie notice
                            </Link>
                            .
                        </p>
                    </div>
                </LegalSection>

                <LegalSection id="contact" number="06" title="Contact">
                    <p>
                        Questions about privacy can go to the same address:{' '}
                        <a
                            href={`mailto:${contactEmail}`}
                            className="font-extrabold text-link underline underline-offset-4"
                        >
                            {contactEmail}
                        </a>
                        .
                    </p>
                </LegalSection>
            </div>

            <div className="mt-14 border-2 border-ink bg-sun p-5 shadow-[5px_5px_0_0_#171717] sm:p-6">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink">
                    <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                    Your browser, too
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    We explain the cookies and local browser storage used by bagg
                    separately, so you can understand what stays on your device.
                </p>
                <Link
                    href="/legal/cookies"
                    className="mt-5 inline-flex items-center gap-2 border-2 border-ink bg-surface px-4 py-3 text-sm font-extrabold text-ink shadow-[3px_3px_0_0_#171717] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                >
                    Read the cookie notice
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
}

function PrivacyPrinciple({
                              icon,
                              title,
                              copy,
                          }: {
    icon: React.ReactNode;
    title: string;
    copy: string;
}) {
    return (
        <div className="border-2 border-ink bg-surface p-4">
            <div className="flex items-center gap-2 text-ink">
                {icon}
                <h2 className="font-extrabold">{title}</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{copy}</p>
        </div>
    );
}

function LegalSection({
                          id,
                          number,
                          title,
                          children,
                      }: {
    id: string;
    number: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-28 border-t-2 border-ink pt-6">
            <div className="flex items-start gap-4">
        <span className="border-2 border-ink bg-pink px-2 py-1 font-mono text-xs font-bold text-ink">
          {number}
        </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-black tracking-tight text-ink">
                        {title}
                    </h2>
                    <div className="mt-4 space-y-4 text-base leading-8 text-ink-soft">
                        {children}
                    </div>
                </div>
            </div>
        </section>
    );
}
