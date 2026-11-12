
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    BellRing,
    FileCheck2,
    FileText,
    ReceiptText,
    Wallet,
} from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { buttonStyles } from '@/components/ui/button';
import { AudienceSubnav } from '@/components/marketing/audience-subnav';

type Audience = 'freelancers' | 'consultants' | 'studios';

type AudienceConfig = {
    eyebrow: string;
    title: string;
    emphasis: string;
    description: string;
    problemTitle: string;
    problemCopy: string;
    workflows: {
        title: string;
        copy: string;
        icon: ReactNode;
        href: string;
    }[];
    benefits: string[];
    closingTitle: string;
    closingCopy: string;
};

const audienceContent: Record<Audience, AudienceConfig> = {
    freelancers: {
        eyebrow: 'For independent professionals',
        title: 'Do the work. Send the invoice.',
        emphasis: 'Leave the chasing to Bagg.',
        description:
            'You run the business, deliver the work and manage the client relationship. Bagg helps you invoice professionally, share one clear payment link and keep track of what has been paid.',
        problemTitle: 'Your work is already a full-time job.',
        problemCopy:
            'An invoice should not become another project. Keep the amount, payment details, client status and receipt connected without rebuilding the story across messages and spreadsheets.',
        workflows: [
            {
                title: 'Create a professional invoice',
                copy: 'Set out your services, line items, due date, currency and payment details.',
                icon: <FileText className="h-6 w-6" />,
                href: '/features/invoicing',
            },
            {
                title: 'Share and track payment',
                copy: 'Send one client link and follow its status from sent to viewed, part-paid or paid.',
                icon: <Wallet className="h-6 w-6" />,
                href: '/features/payments',
            },
            {
                title: 'Keep the payment record',
                copy: 'Confirm payment claims and share the receipt when payment is verified.',
                icon: <ReceiptText className="h-6 w-6" />,
                href: '/features/receipts',
            },
        ],
        benefits: [
            'Present a consistent, professional invoice to every client.',
            'Bill in the currencies you work with.',
            'Share invoices through WhatsApp, email or a link.',
            'See outstanding balances and payment progress.',
            'Use reminders to reduce manual follow-up.',
        ],
        closingTitle: 'Spend less time following up.',
        closingCopy:
            'Create your next invoice in Bagg and give your client one clear way to pay.',
    },

    consultants: {
        eyebrow: 'For independent consultants and advisors',
        title: 'Make the commercial side',
        emphasis: 'as clear as your advice.',
        description:
            'From a strategy engagement to a monthly advisory retainer, Bagg helps you present fees clearly, issue invoices and maintain a reliable record of client payments.',
        problemTitle: 'Good advisory work deserves clear commercial records.',
        problemCopy:
            'Your client should understand the fee, currency, due date and payment instructions. You should be able to see what is outstanding, what has been received and what remains to be settled.',
        workflows: [
            {
                title: 'Set out the engagement fee',
                copy: 'Use a quote to present proposed work and pricing before converting an accepted quote into an invoice.',
                icon: <FileCheck2 className="h-6 w-6" />,
                href: '/features/quotes',
            },
            {
                title: 'Invoice with clarity',
                copy: 'Make fees, line items, due dates and payment instructions explicit.',
                icon: <FileText className="h-6 w-6" />,
                href: '/features/invoicing',
            },
            {
                title: 'Track what has been collected',
                copy: 'Follow payment claims, part-payments and outstanding balances.',
                icon: <Wallet className="h-6 w-6" />,
                href: '/features/payments',
            },
        ],
        benefits: [
            'Present proposals and fees in a structured quote.',
            'Keep invoice amounts and payment terms clear.',
            'Manage invoices across supported currencies.',
            'Track partial payments and remaining balances.',
            'Maintain receipts for confirmed payments.',
        ],
        closingTitle: 'Keep the engagement clear from fee to payment.',
        closingCopy:
            'Use Bagg to manage the invoice and payment record around your advisory work.',
    },

    studios: {
        eyebrow: 'For creative studios and small teams',
        title: 'Make great work.',
        emphasis: 'Keep the money organised.',
        description:
            'A studio has clients to serve, work to deliver and payments to track. Bagg gives your business a consistent way to quote, invoice, follow up and record what comes in.',
        problemTitle: 'More clients should not mean more payment confusion.',
        problemCopy:
            'When several engagements are moving at once, it is easy to lose track of what was quoted, which invoice is outstanding or whether a payment has been confirmed. Bagg keeps the get-paid records together.',
        workflows: [
            {
                title: 'Agree the commercial scope',
                copy: 'Prepare a quote with line items, pricing and validity before the client accepts.',
                icon: <FileCheck2 className="h-6 w-6" />,
                href: '/features/quotes',
            },
            {
                title: 'Issue consistent invoices',
                copy: 'Use your business identity and payment details across client invoices.',
                icon: <FileText className="h-6 w-6" />,
                href: '/features/invoicing',
            },
            {
                title: 'Keep payments visible',
                copy: 'Track claims, confirmed payments, balances and receipts in one workspace.',
                icon: <ReceiptText className="h-6 w-6" />,
                href: '/features/receipts',
            },
        ],
        benefits: [
            'Give clients a consistent billing experience.',
            'Keep quotes and invoices connected to the commercial conversation.',
            'See payment status and outstanding balances.',
            'Record partial and full payments.',
            'Share receipts after payment confirmation.',
        ],
        closingTitle: 'Give every client a clearer payment experience.',
        closingCopy:
            'Bring your studio invoicing and payment records into Bagg.',
    },
};

export function AudiencePage({ audience }: { audience: Audience }) {
    const content = audienceContent[audience];
    const currentPath =
        audience === 'freelancers'
            ? '/freelancers'
            : audience === 'consultants'
                ? '/consultants'
                : '/studios';

    return (
        <>
            <AudienceSubnav currentPath={currentPath} />

            <section className="overflow-hidden bg-cream">
                <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                        <p className="text-label font-extrabold uppercase tracking-wide text-ink-soft">
                            {content.eyebrow}
                        </p>
                        <h1 className="mt-5 max-w-3xl text-title-l text-ink sm:text-[3.5rem] sm:leading-[1.02]">
                            {content.title}{' '}
                            <span className="inline-block bg-mango px-2">{content.emphasis}</span>
                        </h1>
                        <p className="mt-6 max-w-2xl text-body-l text-text-soft">
                            {content.description}
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href="/signup" className={buttonStyles({ size: 'lg' })}>
                                Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            <Link
                                href="/features"
                                className="inline-flex min-h-11 items-center border-2 border-ink bg-surface px-5 text-label font-extrabold text-ink hover:bg-surface-tint"
                            >
                                Explore features
                            </Link>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-3 translate-x-3 translate-y-3 border-2 border-ink bg-pink" />
                        <div className="relative border-2 border-ink bg-surface p-6 shadow-brut-lg sm:p-8">
                            <div className="flex items-center justify-between border-b-2 border-ink pb-4">
                                <div>
                                    <p className="text-caption font-extrabold uppercase text-text-muted">
                                        Bagg workspace
                                    </p>
                                    <h2 className="mt-1 text-heading text-ink">Payment overview</h2>
                                </div>
                                <Wallet className="h-7 w-7 text-ink" aria-hidden="true" />
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="border-2 border-ink bg-cream p-4">
                                    <p className="text-caption font-bold text-text-soft">Invoice status</p>
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <span className="text-body font-extrabold text-ink">Payment tracked</span>
                                        <span className="border-2 border-ink bg-mango px-2 py-1 text-caption font-extrabold text-ink">
                      LIVE
                    </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="border-2 border-ink bg-surface-tint p-3">
                                        <FileText className="h-5 w-5 text-ink" aria-hidden="true" />
                                        <p className="mt-3 text-caption font-bold text-text-soft">Invoices</p>
                                        <p className="mt-1 text-body font-extrabold text-ink">Created</p>
                                    </div>
                                    <div className="border-2 border-ink bg-surface-tint p-3">
                                        <BellRing className="h-5 w-5 text-ink" aria-hidden="true" />
                                        <p className="mt-3 text-caption font-bold text-text-soft">Reminders</p>
                                        <p className="mt-1 text-body font-extrabold text-ink">Scheduled</p>
                                    </div>
                                </div>
                                <div className="border-2 border-ink bg-mango p-4">
                                    <p className="text-caption font-extrabold text-ink">The record stays connected</p>
                                    <p className="mt-1 text-body text-ink">
                                        Invoice → Payment → Receipt
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            <section className="border-y-2 border-ink bg-surface">
                <Container className="grid gap-5 py-14 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                    <div>
                        <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                            The problem
                        </p>
                        <h2 className="mt-3 text-title-l text-ink">{content.problemTitle}</h2>
                    </div>
                    <p className="max-w-3xl text-body-l text-text-soft">{content.problemCopy}</p>
                </Container>
            </section>

            <section className="bg-cream">
                <Container className="py-16 sm:py-20">
                    <div className="max-w-2xl">
                        <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                            The workflow
                        </p>
                        <h2 className="mt-3 text-title-l text-ink">
                            The parts of getting paid, connected.
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                        {content.workflows.map((workflow, index) => (
                            <Link
                                key={workflow.title}
                                href={workflow.href}
                                className="group border-2 border-ink bg-surface p-5 shadow-brut transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
                            >
                                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-mango text-ink">
                    {workflow.icon}
                  </span>
                                    <span className="text-caption font-extrabold text-text-muted">
                    0{index + 1}
                  </span>
                                </div>
                                <h3 className="mt-5 text-heading text-ink">{workflow.title}</h3>
                                <p className="mt-2 text-body text-text-soft">{workflow.copy}</p>
                                <span className="mt-5 inline-flex items-center gap-2 text-label font-extrabold text-ink">
                  Explore feature <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
                            </Link>
                        ))}
                    </div>
                </Container>
            </section>

            <section className="border-y-2 border-ink bg-pink">
                <Container className="py-16 sm:py-20">
                    <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
                        <div>
                            <p className="text-caption font-extrabold uppercase tracking-wide text-ink">
                                Why Bagg
                            </p>
                            <h2 className="mt-3 text-title-l text-ink">
                                A more dependable way to handle the get-paid work.
                            </h2>
                        </div>
                        <ul className="grid gap-3 sm:grid-cols-2">
                            {content.benefits.map((benefit) => (
                                <li
                                    key={benefit}
                                    className="flex gap-3 border-2 border-ink bg-surface p-4 text-body font-semibold text-ink"
                                >
                                    <span className="mt-0.5 font-black" aria-hidden="true">+</span>
                                    {benefit}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Container>
            </section>

            <section className="bg-cream">
                <Container className="py-16 sm:py-20">
                    <div className="border-2 border-ink bg-mango p-7 shadow-brut-lg sm:p-10">
                        <h2 className="max-w-3xl text-title-l text-ink">{content.closingTitle}</h2>
                        <p className="mt-3 max-w-2xl text-body-l text-ink">
                            {content.closingCopy}
                        </p>
                        <Link href="/signup" className={`${buttonStyles()} mt-6`}>
                            Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                </Container>
            </section>
        </>
    );
}
