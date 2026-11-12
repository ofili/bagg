
import Link from 'next/link';
import {
    ArrowRight,
    ArrowUpRight,
    BellRing,
    Check,
    CircleAlert,
    Clock3,
    CreditCard,
    FileCheck2,
    Landmark,
    ReceiptText,
    ShieldCheck,
    Smartphone,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { FeaturePageLink, FeatureSubnav} from "@/components/marketing/feature-sub-nav";
import { buttonStyles } from '@/components/ui/button';
import { currencies } from '@/content/marketing';
import { marketingMetadata } from '@/lib/metadata';
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
    title: 'Payments and reminders',
    description:
        'Track payments, confirm transfers, manage partial payments and follow up on outstanding invoices with Bagg.',
    path: '/features/payments',
});

const paymentMethods = [
    {
        icon: Landmark,
        title: 'Bank transfer',
        copy: 'Show the bank and account details saved for the invoice currency.',
        tone: 'bg-mango',
    },
    {
        icon: Smartphone,
        title: 'Mobile money',
        copy: 'Include supported mobile money details and instructions.',
        tone: 'bg-pink',
    },
    {
        icon: CreditCard,
        title: 'Payment links',
        copy: 'Share an external payment link when you use a supported provider.',
        tone: 'bg-sun',
    },
];

const reminderSteps = [
    {
        label: 'Before it is due',
        timing: '3 days before',
        copy: 'A friendly heads-up while there is still time to pay.',
    },
    {
        label: 'Due date',
        timing: 'On the due date',
        copy: 'A clear reminder that payment is now due.',
    },
    {
        label: 'First follow-up',
        timing: '3 days after',
        copy: 'A polite follow-up when the balance is still outstanding.',
    },
    {
        label: 'Final scheduled nudge',
        timing: '7 days after',
        copy: 'One more reminder to bring the open invoice back to attention.',
    },
];

const paymentStages = [
    {
        number: '01',
        title: 'Payment reported',
        copy: 'Your client submits a payment claim with the amount, date and optional reference.',
        status: 'CLAIM SUBMITTED',
        tone: 'bg-sun',
    },
    {
        number: '02',
        title: 'You review it',
        copy: 'Check the claim against your bank or payment provider before confirming it.',
        status: 'AWAITING REVIEW',
        tone: 'bg-pink',
    },
    {
        number: '03',
        title: 'Payment confirmed',
        copy: 'Bagg records the confirmed amount and updates the invoice balance.',
        status: 'CONFIRMED',
        tone: 'bg-mango',
    },
    {
        number: '04',
        title: 'Receipt created',
        copy: 'A verified receipt is generated and linked to the invoice.',
        status: 'RECEIPT READY',
        tone: 'bg-surface-tint',
    },
];

export default function PaymentsFeaturePage() {
    return (
        <>
            <FeatureSubnav currentPath="/features/payments" />
            <main className="overflow-hidden bg-cream">
                <section className="relative pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
                    <Container>
                        <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
                            <div className="relative z-10">
                                <div className="mb-6 inline-flex items-center gap-2 border-brut border-ink bg-sun px-3 py-2 text-caption font-extrabold uppercase tracking-[0.12em] shadow-brut">
                                    <CreditCard aria-hidden className="h-4 w-4" />
                                    Payments and reminders
                                </div>

                                <h1 className="max-w-3xl text-title-l font-extrabold leading-[0.98] tracking-[-0.055em] text-ink">
                                    Know what came in.
                                    <span className="mt-2 block text-pink">
                  Know what is still owed.
                </span>
                                </h1>

                                <p className="mt-7 max-w-xl text-body-l leading-relaxed text-text-soft">
                                    Bagg helps you track money against the invoice, review payment
                                    claims, keep the remaining balance visible and follow up when
                                    payment is late.
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
                                        href="/features/receipts"
                                        className={buttonStyles({ size: 'lg', variant: 'outline' })}
                                    >
                                        Explore receipts
                                        <ArrowUpRight aria-hidden className="h-4 w-4" />
                                    </Link>
                                </div>

                                <p className="mt-5 max-w-lg text-caption leading-relaxed text-text-muted">
                                    Bagg records and tracks payments. Your client pays you directly;
                                    Bagg does not hold your money.
                                </p>
                            </div>

                            <div className="relative mx-auto w-full max-w-xl">
                                <div
                                    aria-hidden
                                    className="absolute -right-3 -top-3 h-full w-full rotate-2 border-brut border-ink bg-pink"
                                />

                                <div className="relative border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                                    <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-5">
                                        <div>
                                            <p className="text-caption font-extrabold uppercase tracking-[0.12em] text-text-muted">
                                                Invoice balance
                                            </p>
                                            <p className="mt-2 text-heading font-extrabold text-ink">
                                                Payment overview
                                            </p>
                                        </div>
                                        <span className="border-brut border-ink bg-mango px-3 py-1.5 text-caption font-extrabold text-on-mango">
                    LIVE STATUS
                  </span>
                                    </div>

                                    <div className="py-7">
                                        <p className="text-caption font-bold uppercase tracking-[0.1em] text-text-muted">
                                            Outstanding balance
                                        </p>
                                        <p className="mt-2 text-title-l font-extrabold tracking-[-0.05em] text-ink">
                                            Balance open
                                        </p>
                                        <div className="mt-5 h-4 overflow-hidden border-brut border-ink bg-surface-sunken">
                                            <div className="h-full w-[62%] border-r-2 border-ink bg-mango" />
                                        </div>
                                        <div className="mt-2 flex justify-between text-caption font-bold text-text-soft">
                                            <span>Payment received</span>
                                            <span>Balance remaining</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="border-brut border-ink bg-mango p-4">
                                            <p className="text-caption font-extrabold uppercase text-on-mango">
                                                Confirmed
                                            </p>
                                            <div className="mt-3 flex items-center gap-2 text-on-mango">
                                                <Check aria-hidden className="h-5 w-5" />
                                                <span className="text-body font-extrabold">Recorded</span>
                                            </div>
                                        </div>
                                        <div className="border-brut border-ink bg-surface-tint p-4">
                                            <p className="text-caption font-extrabold uppercase text-text-soft">
                                                Still owed
                                            </p>
                                            <div className="mt-3 flex items-center gap-2 text-ink">
                                                <Clock3 aria-hidden className="h-5 w-5" />
                                                <span className="text-body font-extrabold">Open</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-start gap-3 border-brut border-ink bg-cream p-4">
                                        <ReceiptText
                                            aria-hidden
                                            className="mt-0.5 h-5 w-5 shrink-0 text-ink"
                                        />
                                        <div>
                                            <p className="text-body font-extrabold text-ink">
                                                Payment records stay connected
                                            </p>
                                            <p className="mt-1 text-caption leading-relaxed text-text-soft">
                                                Confirmed payments, balances and receipts belong to the
                                                same invoice record.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-between border-t-2 border-ink pt-4">
                  <span className="text-caption font-bold text-text-muted">
                    Your money. Your account.
                  </span>
                                        <span className="text-caption font-extrabold text-ink">
                    BAGG
                  </span>
                                    </div>
                                </div>

                                <div className="absolute -bottom-6 -left-5 hidden rotate-[-5deg] border-brut border-ink bg-sun px-4 py-3 text-caption font-extrabold uppercase text-on-sun shadow-brut sm:block">
                                    No more guesswork
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                <section className="border-y-brut border-ink bg-mango py-16 sm:py-20">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-on-mango">
                                    Payment visibility
                                </p>
                                <h2 className="mt-4 max-w-xl text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-on-mango">
                                    A payment is more than a message saying “I have paid”.
                                </h2>
                                <p className="mt-5 max-w-lg text-body leading-relaxed text-on-mango">
                                    Keep the claim, your review, the confirmed amount and the
                                    resulting receipt connected to the invoice.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {[
                                    {
                                        title: 'A claim is not confirmation',
                                        copy: 'A client can report a transfer, but you remain in control of confirming it.',
                                    },
                                    {
                                        title: 'Partial payments count',
                                        copy: 'Confirm the amount received without pretending the full invoice is settled.',
                                    },
                                    {
                                        title: 'The balance stays visible',
                                        copy: 'The invoice reflects what has been received and what remains outstanding.',
                                    },
                                    {
                                        title: 'A receipt follows confirmation',
                                        copy: 'A verified receipt gives both sides a record of the confirmed payment.',
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.title}
                                        className="border-brut border-ink bg-surface p-5 shadow-brut"
                                    >
                                        <Check
                                            aria-hidden
                                            className="h-5 w-5 text-ink"
                                            strokeWidth={3}
                                        />
                                        <h3 className="mt-4 text-heading font-extrabold text-ink">
                                            {item.title}
                                        </h3>
                                        <p className="mt-2 text-body text-text-soft">{item.copy}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Container>
                </section>

                <section className="py-16 sm:py-20 lg:py-24">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                    How payment confirmation works
                                </p>
                                <h2 className="mt-4 text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-ink">
                                    From payment claim to verified record.
                                </h2>
                                <p className="mt-5 text-body leading-relaxed text-text-soft">
                                    When a client reports a manual payment, Bagg gives you a review
                                    step before the payment becomes part of your confirmed records.
                                </p>
                                <div className="mt-7 border-brut border-ink bg-pink p-5 shadow-brut">
                                    <ShieldCheck
                                        aria-hidden
                                        className="h-7 w-7 text-on-pink"
                                    />
                                    <p className="mt-4 text-heading font-extrabold text-on-pink">
                                        You stay in control.
                                    </p>
                                    <p className="mt-2 text-body text-on-pink">
                                        Verify the money in your bank or payment provider before
                                        confirming a client&apos;s claim.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {paymentStages.map((stage) => (
                                    <div
                                        key={stage.number}
                                        className="relative border-brut border-ink bg-surface p-5 shadow-brut"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                    <span className="text-title-l font-extrabold tracking-[-0.06em] text-ink">
                      {stage.number}
                    </span>
                                            <span
                                                className={`border-brut border-ink px-2 py-1 text-[0.65rem] font-extrabold tracking-[0.08em] text-ink ${stage.tone}`}
                                            >
                      {stage.status}
                    </span>
                                        </div>
                                        <h3 className="mt-6 text-heading font-extrabold text-ink">
                                            {stage.title}
                                        </h3>
                                        <p className="mt-2 text-body leading-relaxed text-text-soft">
                                            {stage.copy}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Container>
                </section>

                <section className="border-y-brut border-ink bg-surface-sunken py-16 sm:py-20">
                    <Container>
                        <div className="max-w-3xl">
                            <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                Payment options
                            </p>
                            <h2 className="mt-4 text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-ink">
                                Give clients clear ways to pay you.
                            </h2>
                            <p className="mt-5 text-body-l leading-relaxed text-text-soft">
                                Add payment instructions that match the currency and payment
                                method you use. Your client sees the relevant details on the
                                invoice.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-4 md:grid-cols-3">
                            {paymentMethods.map((method, index) => {
                                const Icon = method.icon;

                                return (
                                    <div
                                        key={method.title}
                                        className="border-brut border-ink bg-surface shadow-brut"
                                    >
                                        <div
                                            className={`flex min-h-28 items-center justify-between border-b-brut border-ink p-5 ${method.tone}`}
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
                                                {method.title}
                                            </h3>
                                            <p className="mt-2 text-body leading-relaxed text-text-soft">
                                                {method.copy}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-7 flex items-start gap-3 border-brut border-ink bg-cream p-5">
                            <CircleAlert
                                aria-hidden
                                className="mt-0.5 h-5 w-5 shrink-0 text-ink"
                            />
                            <p className="text-body text-text-soft">
                                Where direct Paystack checkout is enabled, clients can pay
                                through that flow. Other payment methods are completed with the
                                provider or account details you supply. Bagg does not act as a
                                wallet or hold client funds.
                            </p>
                        </div>
                    </Container>
                </section>

                <section className="py-16 sm:py-20 lg:py-24">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                            <div>
                                <div className="inline-flex items-center gap-2 border-brut border-ink bg-sun px-3 py-2 text-caption font-extrabold uppercase text-on-sun shadow-brut">
                                    <BellRing aria-hidden className="h-4 w-4" />
                                    Automatic follow-up
                                </div>
                                <h2 className="mt-6 text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-ink">
                                    Follow up without making it your full-time job.
                                </h2>
                                <p className="mt-5 text-body-l leading-relaxed text-text-soft">
                                    Bagg schedules a small, predictable set of email reminders
                                    around the invoice due date. You do not have to remember every
                                    follow-up yourself.
                                </p>
                                <p className="mt-5 text-caption leading-relaxed text-text-muted">
                                    Scheduled reminders require a client email address. They are
                                    cancelled when the invoice is paid or a payment claim is
                                    submitted.
                                </p>
                            </div>

                            <div className="relative">
                                <div
                                    aria-hidden
                                    className="absolute -right-2 -top-2 h-full w-full -rotate-1 border-brut border-ink bg-mango"
                                />
                                <div className="relative border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                                    <div className="flex items-center justify-between gap-4 border-b-2 border-ink pb-5">
                                        <div>
                                            <p className="text-caption font-extrabold uppercase tracking-[0.12em] text-text-muted">
                                                Reminder schedule
                                            </p>
                                            <h3 className="mt-2 text-heading font-extrabold text-ink">
                                                Four scheduled touchpoints
                                            </h3>
                                        </div>
                                        <BellRing aria-hidden className="h-7 w-7 text-ink" />
                                    </div>

                                    <div className="mt-6 space-y-0">
                                        {reminderSteps.map((step, index) => (
                                            <div
                                                key={step.timing}
                                                className="relative flex gap-4 pb-7 last:pb-0"
                                            >
                                                {index !== reminderSteps.length - 1 && (
                                                    <div
                                                        aria-hidden
                                                        className="absolute bottom-0 left-[1.1rem] top-10 w-0.5 bg-ink"
                                                    />
                                                )}
                                                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center border-brut border-ink bg-sun text-caption font-extrabold text-ink">
                                                    {index + 1}
                                                </div>
                                                <div className="min-w-0 flex-1 border-b border-line pb-5 last:border-0 last:pb-0">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <h4 className="text-body font-extrabold text-ink">
                                                            {step.label}
                                                        </h4>
                                                        <span className="border-brut border-ink bg-surface-tint px-2 py-1 text-caption font-extrabold text-ink">
                            {step.timing}
                          </span>
                                                    </div>
                                                    <p className="mt-2 text-body text-text-soft">
                                                        {step.copy}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 flex items-start gap-3 border-brut border-ink bg-pink p-4">
                                        <Check
                                            aria-hidden
                                            className="mt-0.5 h-5 w-5 shrink-0 text-on-pink"
                                            strokeWidth={3}
                                        />
                                        <p className="text-body font-bold text-on-pink">
                                            When a payment is claimed or the invoice is paid, scheduled
                                            reminders stop.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                <section className="border-y-brut border-ink bg-pink py-16 sm:py-20">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-on-pink">
                                    Work across currencies
                                </p>
                                <h2 className="mt-4 text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-on-pink">
                                    The right payment details for the right invoice.
                                </h2>
                                <p className="mt-5 max-w-xl text-body leading-relaxed text-on-pink">
                                    Keep payment profiles for the currencies you work in. Select
                                    the matching details when you create an invoice.
                                </p>
                            </div>

                            <div className="border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                                <p className="text-caption font-extrabold uppercase tracking-[0.12em] text-text-muted">
                                    Supported invoice currencies
                                </p>
                                <div className="mt-5 flex flex-wrap gap-2">
                                    {currencies.map((currency, index) => (
                                        <span
                                            key={currency}
                                            className={`border-brut border-ink px-4 py-3 text-body font-extrabold text-ink ${
                                                index % 3 === 0
                                                    ? 'bg-mango'
                                                    : index % 3 === 1
                                                        ? 'bg-sun'
                                                        : 'bg-pink'
                                            }`}
                                        >
                    {currency}
                  </span>
                                    ))}
                                </div>
                                <p className="mt-5 text-caption leading-relaxed text-text-muted">
                                    NGN · USD · GBP · EUR · GHS · KES · ZAR
                                </p>
                            </div>
                        </div>
                    </Container>
                </section>

                <section className="py-16 sm:py-20">
                    <Container>
                        <div className="border-brut border-ink bg-mango p-7 shadow-brut-lg sm:p-10 lg:p-12">
                            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                                <div className="max-w-3xl">
                                    <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-on-mango">
                                        Keep the money trail clear
                                    </p>
                                    <h2 className="mt-4 text-title-l font-extrabold leading-[1.02] tracking-[-0.05em] text-on-mango">
                                        Every confirmed payment deserves a proper record.
                                    </h2>
                                    <p className="mt-5 max-w-2xl text-body-l leading-relaxed text-on-mango">
                                        See how Bagg turns a confirmed payment into a receipt that
                                        stays connected to the invoice.
                                    </p>
                                </div>
                                <Link
                                    href="/features/receipts"
                                    className={buttonStyles({ size: 'lg', variant: 'outline' })}
                                >
                                    Explore receipts
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
