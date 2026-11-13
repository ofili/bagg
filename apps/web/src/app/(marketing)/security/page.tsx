
import Link from 'next/link';
import {
    ArrowRight,
    CircleAlert,
    CircleCheck,
    CreditCard,
    ExternalLink,
    Flag,
    KeyRound,
    Link2,
    Lock,
    Mail,
    ShieldCheck,
    TriangleAlert,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { buttonStyles } from '@/components/ui/button';
import { marketingMetadata } from '@/lib/metadata';
import { securityEmail } from '@/lib/site';
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
    title: 'Security and Account Protection',
    description:
        'What Bagg does today to protect your account, your share links and your payment details.',
    path: '/security',
});

const safeguards = [
    {
        number: '01',
        icon: KeyRound,
        label: 'ACCOUNT ACCESS',
        title: 'No password to lose.',
        copy: 'You sign in with a one-time code sent to your email. The code expires after ten minutes, and there is no password to reuse or reset.',
        tone: 'bg-pink text-on-pink',
    },
    {
        number: '02',
        icon: Link2,
        label: 'SHARE LINKS',
        title: 'Links are made to be shared, not guessed.',
        copy: 'Share links use long random tokens. Treat the link like the invoice itself: send it to your client, not to a public group.',
        tone: 'bg-sun text-on-sun',
    },
    {
        number: '03',
        icon: CreditCard,
        label: 'CARD PAYMENTS',
        title: 'Card details stay with the payment processor.',
        copy: 'When card payment is enabled, card details are entered on our payment partner’s checkout. Bagg does not store your card number.',
        tone: 'bg-mango text-on-mango',
    },
    {
        number: '04',
        icon: CircleCheck,
        label: 'PAYMENT CLAIMS',
        title: 'You decide when a manual claim is paid.',
        copy: 'A client can say they have paid, but the invoice only moves to paid when you confirm the claim or the payment gateway confirms the money.',
        tone: 'bg-surface-tint text-text',
    },
    {
        number: '05',
        icon: Lock,
        label: 'PAYMENT CONFIRMATION',
        title: 'A redirect is not proof of payment.',
        copy: 'Automated payments are confirmed by the signed gateway webhook, not just by a browser redirect or a success screen.',
        tone: 'bg-pink text-on-pink',
    },
    {
        number: '06',
        icon: Flag,
        label: 'ABUSE REPORTING',
        title: 'Suspicious invoices can be reported.',
        copy: 'Every client invoice has a report-abuse action. If something looks wrong, report it and verify the request with the business directly before sending money.',
        tone: 'bg-sun text-on-sun',
    },
];

const plannedSafeguards = [
    {
        title: 'Encryption at rest',
        copy: 'Additional protection for stored business and payment details.',
    },
    {
        title: 'Account-name checks',
        copy: 'Checks to help verify payment destinations before money is sent.',
    },
    {
        title: 'Sensitive-change alerts',
        copy: 'Notifications when important account details are changed.',
    },
    {
        title: 'Independent security reviews',
        copy: 'External audits and certifications as the product and its operating requirements mature.',
    },
];

const safePractices = [
    'Share invoice links only with the intended client.',
    'Verify unusual payment instructions with the business directly.',
    'Never share your one-time sign-in code.',
    'Report suspicious invoices rather than interacting with them.',
];

export default function SecurityPage() {
    return (
        <>
            {/* HERO */}
            <section className="overflow-hidden border-b-2 border-ink bg-cream">
                <Container className="py-12 sm:py-16 lg:py-20">
                    <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                        <div className="min-w-0">
                            <div className="inline-flex -rotate-2 items-center border-brut border-ink bg-sun px-3 py-1.5 text-caption font-extrabold uppercase tracking-[0.14em] shadow-brut">
                                Trust, in plain words
                            </div>

                            <h1 className="mt-7 max-w-3xl text-[3.2rem] font-extrabold leading-[0.98] tracking-[-0.065em] text-ink sm:text-[4.5rem] lg:text-[5.25rem]">
                                Your money details
                                <span className="block text-mango">
                  are not content.
                </span>
                            </h1>

                            <p className="mt-6 max-w-xl text-body-l leading-relaxed text-text-soft sm:text-lg">
                                Security pages are easy to fill with big claims. We would
                                rather tell you what Bagg does today, what you should do
                                to stay safe, and what we will only claim when it is built
                                and tested.
                            </p>

                            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                                <a
                                    href="#current-safeguards"
                                    className={buttonStyles({ size: 'lg' })}
                                >
                                    See current safeguards
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </a>

                                <Link
                                    href="/help"
                                    className="inline-flex min-h-11 items-center gap-2 font-extrabold text-link underline decoration-2 underline-offset-4 hover:no-underline"
                                >
                                    Visit the help centre
                                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                                </Link>
                            </div>

                            <p className="mt-7 text-caption font-bold uppercase tracking-[0.12em] text-text-muted">
                                Clear claims · Practical safeguards · No invented badges
                            </p>
                        </div>

                        {/* SECURITY PRINCIPLE COMPOSITION */}
                        <div className="relative mx-auto w-full max-w-[34rem] pb-5 pr-5">
                            <div className="absolute right-0 top-0 h-full w-full rotate-3 border-brut border-ink bg-pink" />

                            <div className="relative border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                                <div className="flex items-center justify-between gap-3 border-b-2 border-ink pb-4">
                  <span className="text-caption font-extrabold uppercase tracking-[0.14em]">
                    Our security approach
                  </span>
                                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                                </div>

                                <div className="py-5">
                                    <div className="flex items-start gap-4 border-b-2 border-ink/15 pb-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border-brut border-ink bg-sun shadow-brut">
                      <Lock className="h-5 w-5" aria-hidden="true" />
                    </span>
                                        <div>
                                            <p className="font-extrabold text-ink">
                                                Protect access
                                            </p>
                                            <p className="mt-1 text-caption leading-relaxed text-text-muted">
                                                Account access and share-link safeguards.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 border-b-2 border-ink/15 py-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border-brut border-ink bg-mango shadow-brut">
                      <CreditCard className="h-5 w-5" aria-hidden="true" />
                    </span>
                                        <div>
                                            <p className="font-extrabold text-ink">
                                                Verify payments
                                            </p>
                                            <p className="mt-1 text-caption leading-relaxed text-text-muted">
                                                Payment claims and gateway confirmation.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4 pt-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center border-brut border-ink bg-pink shadow-brut">
                      <Flag className="h-5 w-5" aria-hidden="true" />
                    </span>
                                        <div>
                                            <p className="font-extrabold text-ink">
                                                Respond to abuse
                                            </p>
                                            <p className="mt-1 text-caption leading-relaxed text-text-muted">
                                                Reporting paths for suspicious invoices.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t-2 border-ink pt-4">
                                    <div className="flex items-center gap-2">
                                        <CircleCheck className="h-4 w-4" aria-hidden="true" />
                                        <p className="text-caption font-extrabold uppercase tracking-[0.1em]">
                                            Be precise about what is live.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -bottom-1 -left-2 -rotate-3 border-brut border-ink bg-sun px-3 py-2 text-caption font-extrabold uppercase shadow-brut">
                                Trust through clarity.
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* CURRENT SAFEGUARDS */}
            <section
                id="current-safeguards"
                className="scroll-mt-20 border-b-2 border-ink bg-surface"
            >
                <Container className="py-16 sm:py-20">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                                Built into Bagg today
                            </p>

                            <h2 className="mt-3 text-[2.3rem] font-extrabold leading-[1.02] tracking-[-0.055em] text-ink sm:text-4xl">
                                What is true today.
                            </h2>
                        </div>

                        <p className="max-w-sm text-body text-text-soft">
                            These are the safeguards currently described by the
                            product. We do not present planned work as a live feature.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-5 md:grid-cols-2">
                        {safeguards.map((item) => {
                            const Icon = item.icon;

                            return (
                                <article
                                    key={item.number}
                                    className="border-brut border-ink bg-cream p-5 shadow-brut sm:p-6"
                                >
                                    <div className="flex items-start justify-between gap-4">
                    <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center border-brut border-ink shadow-brut ${item.tone}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>

                                        <span className="text-3xl font-extrabold leading-none tracking-[-0.06em] text-ink/20">
                      {item.number}
                    </span>
                                    </div>

                                    <p className="mt-5 text-caption font-extrabold uppercase tracking-[0.13em] text-link">
                                        {item.label}
                                    </p>

                                    <h3 className="mt-2 text-title font-extrabold tracking-tight text-ink">
                                        {item.title}
                                    </h3>

                                    <p className="mt-2 text-body leading-relaxed text-text-soft">
                                        {item.copy}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                </Container>
            </section>

            {/* CUSTOMER RESPONSIBILITIES */}
            <section className="border-b-2 border-ink bg-sun">
                <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                    <div>
                        <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-on-sun">
                            Your part matters too
                        </p>

                        <h2 className="mt-3 max-w-lg text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.055em] text-on-sun sm:text-4xl">
                            A few habits that protect your business.
                        </h2>

                        <p className="mt-4 max-w-md text-body-l leading-relaxed text-on-sun/80">
                            Bagg can provide safeguards, but you should still verify
                            unusual requests and protect the information you share.
                        </p>
                    </div>

                    <div className="border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                        <div className="flex items-center justify-between gap-4 border-b-2 border-ink pb-4">
                            <h3 className="text-title font-extrabold text-ink">
                                Your safety checklist
                            </h3>
                            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                        </div>

                        <ul className="mt-5 space-y-4">
                            {safePractices.map((practice, index) => (
                                <li
                                    key={practice}
                                    className="flex items-start gap-3 text-body-l text-text-soft"
                                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border-brut border-ink bg-sun text-caption font-extrabold text-on-sun shadow-brut">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                                    <span>{practice}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-6 flex items-start gap-3 border-t-2 border-ink pt-5">
                            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
                            <p className="text-caption leading-relaxed text-text-muted">
                                Bagg will never need you to disclose your one-time
                                sign-in code to investigate an issue.
                            </p>
                        </div>
                    </div>
                </Container>
            </section>

            {/* TRANSPARENCY / ROADMAP */}
            <section className="border-b-2 border-ink bg-cream">
                <Container className="py-16 sm:py-20">
                    <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                        <div>
                            <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                                Product transparency
                            </p>

                            <h2 className="mt-3 text-[2.3rem] font-extrabold leading-[1.02] tracking-[-0.055em] text-ink sm:text-4xl">
                                What we are not claiming yet.
                            </h2>

                            <p className="mt-4 max-w-lg text-body-l leading-relaxed text-text-soft">
                                Security is ongoing work. These are areas we intend to
                                strengthen, but they should not be interpreted as
                                capabilities already available in Bagg.
                            </p>

                            <div className="mt-6 flex items-start gap-3 border-brut border-ink bg-sun p-4 shadow-brut">
                                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-on-sun" aria-hidden="true" />
                                <p className="text-body text-on-sun">
                                    We will update this page when a safeguard has been
                                    implemented and tested.
                                </p>
                            </div>
                        </div>

                        <div className="border-brut border-ink bg-surface shadow-brut-lg">
                            <div className="flex items-center justify-between gap-4 border-b-2 border-ink bg-pink p-5 text-on-pink">
                                <div>
                                    <p className="text-caption font-extrabold uppercase tracking-[0.14em]">
                                        Areas of further work
                                    </p>
                                    <h3 className="mt-1 text-title font-extrabold">
                                        On the roadmap
                                    </h3>
                                </div>

                                <Lock className="h-6 w-6" aria-hidden="true" />
                            </div>

                            <div className="divide-y-2 divide-ink/15 px-5">
                                {plannedSafeguards.map((item, index) => (
                                    <div
                                        key={item.title}
                                        className="flex gap-4 py-5"
                                    >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border-brut border-ink bg-surface-tint text-caption font-extrabold text-text">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                                        <div>
                                            <h4 className="font-extrabold text-ink">
                                                {item.title}
                                            </h4>
                                            <p className="mt-1 text-body text-text-soft">
                                                {item.copy}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Container>
            </section>

            {/* REPORT SECURITY CONCERNS */}
            <section className="border-b-2 border-ink bg-surface">
                <Container className="py-16 sm:py-20">
                    <div className="relative border-brut border-ink bg-mango p-6 text-on-mango shadow-brut-lg sm:p-8 lg:p-10">
                        <div className="absolute -right-2 -top-3 rotate-3 border-brut border-ink bg-pink px-3 py-2 text-caption font-extrabold uppercase text-on-pink shadow-brut">
                            Report a concern
                        </div>

                        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div className="max-w-2xl">
                                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center border-brut border-on-mango bg-transparent">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </span>

                                    <p className="text-caption font-extrabold uppercase tracking-[0.14em]">
                                        Something does not look right?
                                    </p>
                                </div>

                                <h2 className="mt-5 text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.055em] sm:text-4xl">
                                    Tell us what happened.
                                </h2>

                                <p className="mt-4 text-body-l leading-relaxed text-on-mango/80">
                                    Send us the invoice link and explain what looked wrong.
                                    For a suspicious payment request, do not send money
                                    until you have verified it with the business directly.
                                </p>
                            </div>

                            <a
                                href={`mailto:${securityEmail}`}
                                className={`${buttonStyles({ variant: 'outline', size: 'lg' })} shrink-0 border-2 border-on-mango bg-transparent text-on-mango hover:bg-on-mango/10`}
                            >
                                <Mail className="h-4 w-4" aria-hidden="true" />
                                Contact security
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </a>
                        </div>

                        <p className="mt-7 border-t-2 border-on-mango/20 pt-4 text-caption font-bold text-on-mango/75">
                            {securityEmail}
                        </p>
                    </div>
                </Container>
            </section>

            {/* HELP CENTRE */}
            <section className="bg-cream py-12 sm:py-16">
                <Container>
                    <div className="flex flex-col gap-5 border-brut border-ink bg-surface p-6 shadow-brut sm:flex-row sm:items-center sm:justify-between sm:p-8">
                        <div>
                            <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-link">
                                Need help using Bagg?
                            </p>

                            <h2 className="mt-2 text-title-l font-extrabold text-ink">
                                Find an answer in the help centre.
                            </h2>

                            <p className="mt-2 max-w-xl text-body text-text-soft">
                                Get practical guidance on account access, invoices,
                                payment claims, reminders and receipts.
                            </p>
                        </div>

                        <Link
                            href="/help"
                            className={`${buttonStyles({ size: 'lg', variant: 'outline' })} shrink-0`}
                        >
                            Visit help centre
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                </Container>
            </section>
        </>
    );
}
