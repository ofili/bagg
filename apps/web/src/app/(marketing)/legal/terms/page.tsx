
import Link from 'next/link';
import { ArrowRight, FileText, Scale } from 'lucide-react';

import { LegalNotice } from '@/components/marketing/legal-notice';
import { marketingMetadata } from '@/lib/metadata';
import { contactEmail } from '@/lib/site';
import React from "react";
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
    title: 'terms of service',
    description: 'The plain-language summary of the terms for using bagg.',
    path: '/legal/terms',
    noIndex: true,
});

const sections = [
    { id: 'using-bagg', number: '01', title: 'Using bagg' },
    { id: 'your-account', number: '02', title: 'Your account' },
    { id: 'invoices-payments', number: '03', title: 'Invoices and payments' },
    { id: 'your-content', number: '04', title: 'Your content' },
    { id: 'availability', number: '05', title: 'Availability and changes' },
    { id: 'ending-use', number: '06', title: 'Ending use' },
    { id: 'questions', number: '07', title: 'Questions' },
];

export default function TermsPage() {
    return (
        <article>
            <DocumentHeader
                eyebrow="Terms of service"
                title={<>Clear expectations.<br /><span className="text-pink">Better work.</span></>}
                description="The rules for using bagg, managing your workspace and working with your clients through the service."
                icon={<FileText className="h-6 w-6" />}
            />

            <LegalNotice />

            <div className="mt-8 border-2 border-ink bg-surface p-5 shadow-[4px_4px_0_0_#171717]">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">
                    In this document
                </p>
                <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {sections.map((section) => (
                        <a
                            key={section.id}
                            href={`#${section.id}`}
                            className="flex items-center gap-3 text-sm font-bold text-ink-soft transition hover:text-ink"
                        >
              <span className="font-mono text-xs text-ink-muted">
                {section.number}
              </span>
                            <span className="underline decoration-transparent underline-offset-4 hover:decoration-ink">
                {section.title}
              </span>
                        </a>
                    ))}
                </div>
            </div>

            <div className="mt-10 space-y-10">
                <LegalSection id="using-bagg" number="01" title="Using bagg">
                    <p>
                        bagg is a workspace for creating invoices, quotes, payment records
                        and receipts. You can use it for your own business or a business
                        you are authorised to represent.
                    </p>
                    <p>
                        bagg is not a bank, a payment processor or a tax adviser. We do not
                        hold your client’s money and we do not decide how much tax you owe.
                    </p>
                </LegalSection>

                <LegalSection id="your-account" number="02" title="Your account">
                    <p>
                        You need a working email address to sign in. Keep access to that
                        email secure. You are responsible for the activity in your
                        workspace and for the accuracy of the details you add to an
                        invoice or quote.
                    </p>
                    <p>
                        Do not use bagg to impersonate someone else, send fraudulent
                        documents or break the law. We may suspend an account if we
                        believe it is being used to harm someone.
                    </p>
                </LegalSection>

                <LegalSection
                    id="invoices-payments"
                    number="03"
                    title="Invoices and payments"
                >
                    <p>
                        You decide what to charge, which currency to use and which payment
                        details to share. Your client pays you directly using those
                        details, unless an integrated payment option is explicitly enabled
                        for that invoice.
                    </p>
                    <p>
                        A client marking an invoice as paid is a claim, not proof. You
                        should confirm the payment in your own account before relying on
                        it. Automated payments are confirmed by the payment provider’s
                        signed notification.
                    </p>
                    <p>
                        You remain responsible for the underlying commercial agreement
                        with your client, including the work delivered, amounts charged,
                        applicable taxes and any refund or dispute obligations.
                    </p>
                </LegalSection>

                <LegalSection id="your-content" number="04" title="Your content">
                    <p>
                        You keep ownership of the business details, client information,
                        line items and files you add to bagg. You give us permission to
                        store and process that content so we can provide the service.
                    </p>
                    <p>
                        Do not upload content you do not have the right to use. We may
                        remove content that violates someone else’s rights or the law.
                    </p>
                </LegalSection>

                <LegalSection
                    id="availability"
                    number="05"
                    title="Availability and changes"
                >
                    <p>
                        We work to keep bagg available, but we cannot promise uninterrupted
                        access. We may change or remove features as the product develops.
                        If a change affects a paid feature or a payment you have already
                        made, we will explain it clearly.
                    </p>
                </LegalSection>

                <LegalSection id="ending-use" number="06" title="Ending use">
                    <p>
                        You can stop using bagg at any time. We may suspend or close an
                        account for misuse, for security reasons or where the law requires
                        it. Before closing an account, we will try to give you a way to
                        retrieve the records you need.
                    </p>
                </LegalSection>

                <LegalSection id="questions" number="07" title="Questions">
                    <p>
                        If something here is unclear, email{' '}
                        <a
                            href={`mailto:${contactEmail}`}
                            className="font-extrabold text-link underline underline-offset-4"
                        >
                            {contactEmail}
                        </a>
                        . The final agreement will replace this summary when it is ready.
                    </p>
                </LegalSection>
            </div>

            <DocumentFooter
                current="terms"
                copy="Understand how bagg handles your information and browser storage."
            />
        </article>
    );
}

function DocumentHeader({
                            eyebrow,
                            title,
                            description,
                            icon,
                        }: {
    eyebrow: string;
    title: React.ReactNode;
    description: string;
    icon: React.ReactNode;
}) {
    return (
        <header className="mb-8">
            <div className="mb-5 inline-flex items-center gap-2 border-2 border-ink bg-sun px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink shadow-[3px_3px_0_0_#171717]">
                {icon}
                {eyebrow}
            </div>

            <h1 className="text-4xl font-black leading-[0.98] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                {title}
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
                {description}
            </p>
        </header>
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
        <span className="border-2 border-ink bg-peach px-2 py-1 font-mono text-xs font-bold text-ink">
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

function DocumentFooter({
                            current,
                            copy,
                        }: {
    current: 'terms' | 'privacy' | 'cookies';
    copy: string;
}) {
    const next = {
        terms: { label: 'Privacy', href: '/legal/privacy' },
        privacy: { label: 'Cookies', href: '/legal/cookies' },
        cookies: { label: 'Terms', href: '/legal/terms' },
    }[current];

    return (
        <div className="mt-14 border-2 border-ink bg-sun p-5 shadow-[5px_5px_0_0_#171717] sm:p-6">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink">
                <Scale className="h-4 w-4" aria-hidden="true" />
                Keep reading
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{copy}</p>
            <Link
                href={next.href}
                className="mt-5 inline-flex items-center gap-2 border-2 border-ink bg-surface px-4 py-3 text-sm font-extrabold text-ink shadow-[3px_3px_0_0_#171717] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
                Read {next.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
        </div>
    );
}
