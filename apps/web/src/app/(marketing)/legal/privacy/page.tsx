
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Database, Eye, ShieldCheck } from 'lucide-react';

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
    title: 'Privacy',
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
            <LegalDocumentHeader
                eyebrow="Privacy"
                title={<>Your business.<br /><span className="text-pink">Your information.</span></>}
                description="A straightforward explanation of the information bagg handles, why we use it and the choices available to you."
                icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
                tone="pink"
            />

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

            <div className="mt-8 border-brut border-ink bg-surface p-5 shadow-brut">
                <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
                    On this page
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {contents.map(([number, label, id]) => (
                        <a
                            key={id}
                            href={`#${id}`}
                            className="flex items-center gap-3 text-body font-bold text-text-soft hover:text-ink"
                        >
                            <span className="text-caption tabular-nums text-text-muted">{number}</span>
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
                        <p className="text-body leading-relaxed text-text-soft">
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

            <LegalDocumentFooter
                current="privacy"
                eyebrow="Your browser, too"
                copy="We explain the cookies and local browser storage used by bagg separately, so you can understand what stays on your device."
                tone="sun"
            />
        </article>
    );
}

function PrivacyPrinciple({
                              icon,
                              title,
                              copy,
                          }: {
    icon: ReactNode;
    title: string;
    copy: string;
}) {
    return (
        <div className="border-brut border-ink bg-surface p-4">
            <div className="flex items-center gap-2 text-ink">
                {icon}
                <h2 className="font-extrabold">{title}</h2>
            </div>
            <p className="mt-2 text-body leading-relaxed text-text-soft">{copy}</p>
        </div>
    );
}
