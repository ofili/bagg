
import Link from 'next/link';
import {
    ArrowRight,
    ArrowUpRight,
    BadgeCheck,
    Check,
    ClipboardList,
    FileCheck2,
    MessageCircle,
    ReceiptText,
    ShieldCheck,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { FeaturePageLink, FeatureSubnav} from "@/components/marketing/feature-sub-nav";
import { buttonStyles } from '@/components/ui/button';
import { marketingMetadata } from '@/lib/metadata';
import {Metadata} from "next";
import {MarketingBreadcrumbStructuredData} from "@/components/marketing/marketing-structured-data";

export const metadata: Metadata = marketingMetadata({
    title: 'Payment Receipt Generator for Freelancers',
    description:
        'Create verified payment receipts, share them with clients and keep every receipt connected to its original invoice.',
    path: '/features/receipts',
});

const receiptFields = [
    {
        label: 'Receipt number',
        value: 'Unique record',
        description: 'A numbered receipt for each confirmed payment.',
    },
    {
        label: 'Payment received',
        value: 'Amount and currency',
        description: 'The exact amount recorded against the invoice.',
    },
    {
        label: 'Payment details',
        value: 'Date and method',
        description: 'When the payment was made and how it was received.',
    },
    {
        label: 'Verification',
        value: 'Code and status',
        description: 'A verification code and confirmation details.',
    },
];

const sharingOptions = [
    {
        icon: MessageCircle,
        title: 'WhatsApp',
        copy: 'Share the receipt link with your client when their phone number is available.',
        tone: 'bg-mango',
    },
    {
        icon: ArrowUpRight,
        title: 'Public receipt link',
        copy: 'Give your client a link to view the receipt without signing in to Bagg.',
        tone: 'bg-pink',
    },
    {
        icon: ClipboardList,
        title: 'Printable record',
        copy: 'Open the receipt in a clean, printable format for your records.',
        tone: 'bg-sun',
    },
];

export default function ReceiptsFeaturePage() {
    return (
        <>
            <MarketingBreadcrumbStructuredData items={[
                { name: 'Home', path: '/' },
                { name: 'Features', path: '/features' },
                { name: 'Receipts', path: '/features/receipts' },
            ]} />

            <FeatureSubnav currentPath="/features/receipts" />
            <main className="overflow-hidden bg-cream">
                <section className="relative pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
                    <Container>
                        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.95fr] lg:gap-16">
                            <div className="relative z-10">
                                <div className="mb-6 inline-flex items-center gap-2 border-brut border-ink bg-sun px-3 py-2 text-caption font-extrabold uppercase tracking-[0.12em] shadow-brut">
                                    <ReceiptText aria-hidden className="h-4 w-4" />
                                    Receipts and records
                                </div>

                                <h1 className="max-w-3xl text-title-l font-extrabold leading-[0.98] tracking-[-0.055em] text-ink">
                                    Payment received.
                                    <span className="mt-2 block text-pink">
                  Proof provided.
                </span>
                                </h1>

                                <p className="mt-7 max-w-xl text-body-l leading-relaxed text-text-soft">
                                    Every confirmed payment gets a numbered, verified receipt.
                                    Share it with your client and keep it connected to the invoice
                                    it belongs to.
                                </p>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <Link
                                        href="/signup"
                                        className={buttonStyles({ size: 'lg', variant: 'primary' })}
                                    >
                                        Start free
                                        <ArrowRight aria-hidden className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        href="/features/payments"
                                        className={buttonStyles({ size: 'lg', variant: 'outline' })}
                                    >
                                        How payments work
                                        <ArrowUpRight aria-hidden className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>

                            <div className="relative mx-auto w-full max-w-xl">
                                <div
                                    aria-hidden
                                    className="absolute -right-3 -top-3 h-full w-full -rotate-2 border-brut border-ink bg-mango"
                                />

                                <div className="relative border-brut border-ink bg-surface shadow-brut-lg">
                                    <div className="flex items-center justify-between gap-4 border-b-brut border-ink bg-pink p-5">
                                        <div>
                                            <p className="text-caption font-extrabold uppercase tracking-[0.12em] text-on-pink">
                                                Payment record
                                            </p>
                                            <h2 className="mt-1 text-heading font-extrabold text-on-pink">
                                                Official receipt
                                            </h2>
                                        </div>
                                        <div className="flex h-12 w-12 items-center justify-center border-brut border-ink bg-surface text-ink">
                                            <ReceiptText aria-hidden className="h-6 w-6" />
                                        </div>
                                    </div>

                                    <div className="p-5 sm:p-7">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-caption font-extrabold uppercase tracking-[0.12em] text-text-muted">
                                                    Receipt number
                                                </p>
                                                <p className="mt-1 text-heading font-extrabold text-ink">
                                                    Numbered record
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 border-brut border-ink bg-mango px-3 py-2 text-caption font-extrabold text-on-mango">
                                                <BadgeCheck aria-hidden className="h-4 w-4" />
                                                VERIFIED
                                            </div>
                                        </div>

                                        <div className="my-6 border-y-2 border-dashed border-line py-6">
                                            <p className="text-caption font-bold uppercase tracking-[0.1em] text-text-muted">
                                                Amount received
                                            </p>
                                            <p className="mt-2 text-title-l font-extrabold tracking-[-0.05em] text-ink">
                                                Payment recorded
                                            </p>
                                            <p className="mt-2 text-caption text-text-muted">
                                                Currency and amount shown on the issued receipt
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                                            <div>
                                                <p className="text-caption font-bold text-text-muted">
                                                    Paid by
                                                </p>
                                                <p className="mt-1 text-body font-extrabold text-ink">
                                                    Client
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-caption font-bold text-text-muted">
                                                    Payment date
                                                </p>
                                                <p className="mt-1 text-body font-extrabold text-ink">
                                                    Recorded date
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-caption font-bold text-text-muted">
                                                    Payment method
                                                </p>
                                                <p className="mt-1 text-body font-extrabold text-ink">
                                                    Recorded method
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-caption font-bold text-text-muted">
                                                    Invoice
                                                </p>
                                                <p className="mt-1 text-body font-extrabold text-ink">
                                                    Linked invoice
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-6 border-brut border-ink bg-surface-tint p-4">
                                            <p className="text-caption font-extrabold uppercase tracking-[0.1em] text-text-muted">
                                                Remaining balance
                                            </p>
                                            <p className="mt-2 text-body font-extrabold text-ink">
                                                Balance recorded on receipt
                                            </p>
                                        </div>

                                        <div className="mt-5 flex items-center justify-between gap-3 border-t-2 border-ink pt-4">
                                            <div>
                                                <p className="text-caption font-bold text-text-muted">
                                                    Verification code
                                                </p>
                                                <p className="mt-1 text-body font-extrabold tracking-[0.08em] text-ink">
                                                    BAGG-XXXXXXXX
                                                </p>
                                            </div>
                                            <ShieldCheck
                                                aria-hidden
                                                className="h-8 w-8 text-ink"
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t-brut border-ink bg-sun px-5 py-3 text-center text-caption font-extrabold uppercase tracking-[0.12em] text-on-sun">
                                        A clear record of money received
                                    </div>
                                </div>

                                <div className="absolute -bottom-6 -left-4 hidden -rotate-3 border-brut border-ink bg-pink px-4 py-3 text-caption font-extrabold uppercase text-on-pink shadow-brut sm:block">
                                    Every payment has a paper trail
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                <section className="border-y-2 border-ink bg-mango py-16 sm:py-20">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-on-mango">
                                    What goes on a receipt
                                </p>
                                <h2 className="mt-4 text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-on-mango">
                                    The details that make a payment record useful.
                                </h2>
                                <p className="mt-5 max-w-lg text-body leading-relaxed text-on-mango">
                                    A receipt should do more than say thank you. It should show
                                    what was received, what it relates to and how the payment was
                                    confirmed.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {receiptFields.map((field, index) => (
                                    <div
                                        key={field.label}
                                        className="border-brut border-ink bg-surface p-5 shadow-brut"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                    <span className="text-caption font-extrabold uppercase tracking-[0.1em] text-text-muted">
                      {field.label}
                    </span>
                                            <span className="text-caption font-extrabold text-ink">
                      0{index + 1}
                    </span>
                                        </div>
                                        <h3 className="mt-5 text-heading font-extrabold text-ink">
                                            {field.value}
                                        </h3>
                                        <p className="mt-2 text-body leading-relaxed text-text-soft">
                                            {field.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Container>
                </section>

                <section className="py-16 sm:py-20 lg:py-24">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                    One payment, one connected record
                                </p>
                                <h2 className="mt-4 text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-ink">
                                    Your receipt belongs to its invoice.
                                </h2>
                                <p className="mt-5 text-body-l leading-relaxed text-text-soft">
                                    Bagg keeps confirmed payments connected to the invoice they
                                    settle. That means you can follow the history without piecing
                                    together separate messages and spreadsheets.
                                </p>
                                <Link
                                    href="/features/payments"
                                    className={`${buttonStyles({ variant: 'link' })} mt-6`}
                                >
                                    See payment tracking
                                    <ArrowRight aria-hidden className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                                <div className="flex items-center justify-between gap-4 border-b-2 border-ink pb-5">
                                    <div>
                                        <p className="text-caption font-extrabold uppercase tracking-[0.12em] text-text-muted">
                                            Connected records
                                        </p>
                                        <h3 className="mt-2 text-heading font-extrabold text-ink">
                                            Invoice payment history
                                        </h3>
                                    </div>
                                    <FileCheck2 aria-hidden className="h-8 w-8 text-ink" />
                                </div>

                                <div className="mt-6 space-y-3">
                                    <div className="flex items-center gap-4 border-brut border-ink bg-cream p-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink bg-sun">
                                            <ClipboardList
                                                aria-hidden
                                                className="h-5 w-5 text-ink"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-body font-extrabold text-ink">
                                                Issued invoice
                                            </p>
                                            <p className="text-caption text-text-muted">
                                                Original amount and terms
                                            </p>
                                        </div>
                                        <span className="text-caption font-extrabold text-ink">
                    INVOICE
                  </span>
                                    </div>

                                    <div className="ml-5 h-5 border-l-2 border-dashed border-ink" />

                                    <div className="flex items-center gap-4 border-brut border-ink bg-mango p-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink bg-surface">
                                            <Check
                                                aria-hidden
                                                className="h-5 w-5 text-ink"
                                                strokeWidth={3}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-body font-extrabold text-on-mango">
                                                Confirmed payment
                                            </p>
                                            <p className="text-caption text-on-mango">
                                                Amount received and balance updated
                                            </p>
                                        </div>
                                        <span className="text-caption font-extrabold text-on-mango">
                    PAYMENT
                  </span>
                                    </div>

                                    <div className="ml-5 h-5 border-l-2 border-dashed border-ink" />

                                    <div className="flex items-center gap-4 border-brut border-ink bg-pink p-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink bg-surface">
                                            <ReceiptText
                                                aria-hidden
                                                className="h-5 w-5 text-ink"
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-body font-extrabold text-on-pink">
                                                Verified receipt
                                            </p>
                                            <p className="text-caption text-on-pink">
                                                Shareable proof of payment
                                            </p>
                                        </div>
                                        <span className="text-caption font-extrabold text-on-pink">
                    RECEIPT
                  </span>
                                    </div>
                                </div>

                                <p className="mt-5 text-caption leading-relaxed text-text-muted">
                                    Each confirmed payment has its own receipt. An invoice with
                                    multiple payments can therefore have multiple receipt records.
                                </p>
                            </div>
                        </div>
                    </Container>
                </section>

                <section className="border-y-2 border-ink bg-surface-sunken py-16 sm:py-20">
                    <Container>
                        <div className="max-w-3xl">
                            <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                Share with your client
                            </p>
                            <h2 className="mt-4 text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-ink">
                                A receipt they can actually find again.
                            </h2>
                            <p className="mt-5 text-body-l leading-relaxed text-text-soft">
                                Give your client a direct way to view their payment record.
                                They do not need to create a Bagg account to open a public
                                receipt link.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-4 md:grid-cols-3">
                            {sharingOptions.map((option, index) => {
                                const Icon = option.icon;

                                return (
                                    <div
                                        key={option.title}
                                        className="border-brut border-ink bg-surface shadow-brut"
                                    >
                                        <div
                                            className={`flex min-h-28 items-center justify-between border-b-2 border-ink p-5 ${option.tone}`}
                                        >
                                            <Icon
                                                aria-hidden
                                                className="h-9 w-9 text-ink"
                                                strokeWidth={2.2}
                                            />
                                            <span className="text-title-l font-extrabold text-ink">
                      0{index + 1}
                    </span>
                                        </div>
                                        <div className="p-5">
                                            <h3 className="text-heading font-extrabold text-ink">
                                                {option.title}
                                            </h3>
                                            <p className="mt-2 text-body leading-relaxed text-text-soft">
                                                {option.copy}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Container>
                </section>

                <section className="py-16 sm:py-20">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                    Client statements
                                </p>
                                <h2 className="mt-4 text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-ink">
                                    See the bigger picture, client by client.
                                </h2>
                                <p className="mt-5 text-body-l leading-relaxed text-text-soft">
                                    When you need more than one receipt, Bagg can produce a client
                                    statement showing invoices, payments and the running balance.
                                </p>
                                <ul className="mt-6 space-y-3">
                                    {[
                                        'Filter by currency',
                                        'Choose a date range',
                                        'See invoices and receipt entries',
                                        'Review total invoiced, paid and outstanding',
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-3 text-body font-bold text-ink"
                                        >
                                            <Check
                                                aria-hidden
                                                className="mt-0.5 h-5 w-5 shrink-0"
                                                strokeWidth={3}
                                            />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="relative">
                                <div
                                    aria-hidden
                                    className="absolute -right-2 -top-2 h-full w-full rotate-2 border-brut border-ink bg-pink"
                                />
                                <div className="relative border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                                    <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-5">
                                        <div>
                                            <p className="text-caption font-extrabold uppercase tracking-[0.12em] text-text-muted">
                                                Client account
                                            </p>
                                            <h3 className="mt-2 text-heading font-extrabold text-ink">
                                                Statement overview
                                            </h3>
                                        </div>
                                        <ClipboardList
                                            aria-hidden
                                            className="h-8 w-8 text-ink"
                                        />
                                    </div>

                                    <div className="mt-5 grid grid-cols-2 gap-3">
                                        <div className="border-brut border-ink bg-mango p-4">
                                            <p className="text-caption font-extrabold uppercase text-on-mango">
                                                Total invoiced
                                            </p>
                                            <p className="mt-3 text-body font-extrabold text-on-mango">
                                                All invoices
                                            </p>
                                        </div>
                                        <div className="border-brut border-ink bg-sun p-4">
                                            <p className="text-caption font-extrabold uppercase text-on-sun">
                                                Total paid
                                            </p>
                                            <p className="mt-3 text-body font-extrabold text-on-sun">
                                                All receipts
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        <div className="flex items-center justify-between border-b border-line py-3">
                    <span className="text-body font-bold text-ink">
                      Opening balance
                    </span>
                                            <span className="text-caption font-extrabold text-text-soft">
                      Starting position
                    </span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-line py-3">
                    <span className="text-body font-bold text-ink">
                      Invoice entries
                    </span>
                                            <span className="text-caption font-extrabold text-text-soft">
                      Amount billed
                    </span>
                                        </div>
                                        <div className="flex items-center justify-between border-b border-line py-3">
                    <span className="text-body font-bold text-ink">
                      Receipt entries
                    </span>
                                            <span className="text-caption font-extrabold text-text-soft">
                      Amount received
                    </span>
                                        </div>
                                    </div>

                                    <div className="mt-5 border-brut border-ink bg-pink p-4">
                                        <p className="text-caption font-extrabold uppercase text-on-pink">
                                            Closing balance
                                        </p>
                                        <p className="mt-2 text-body font-extrabold text-on-pink">
                                            Outstanding position
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                <section className="pb-16 sm:pb-20">
                    <Container>
                        <div className="border-brut border-ink bg-mango p-7 shadow-brut-lg sm:p-10 lg:p-12">
                            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                                <div className="max-w-3xl">
                                    <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-on-mango">
                                        Close the loop
                                    </p>
                                    <h2 className="mt-4 text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-on-mango">
                                        From invoice sent to payment recorded.
                                    </h2>
                                    <p className="mt-5 max-w-2xl text-body-l leading-relaxed text-on-mango">
                                        Create the invoice, track the payment and give your client a
                                        verified record when the money arrives.
                                    </p>
                                </div>
                                <Link
                                    href="/features"
                                    className={buttonStyles({ size: 'lg', variant: 'outline' })}
                                >
                                    Explore all features
                                    <ArrowUpRight aria-hidden className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </Container>
                </section>
            </main>
        </>
    );
}
