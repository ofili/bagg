
import Link from 'next/link';
import {
    ArrowRight,
    ArrowUpRight,
    Check,
    FileText,
    MessageSquare,
    RefreshCw,
    ShieldCheck,
    Wallet,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { FeaturePageLink, FeatureSubnav} from "@/components/marketing/feature-sub-nav";
import { buttonStyles } from '@/components/ui/button';
import { currencies } from '@/content/marketing';
import { marketingMetadata } from '@/lib/metadata';
import {Metadata} from "next";
import {MarketingBreadcrumbStructuredData} from "@/components/marketing/marketing-structured-data";

export const metadata: Metadata = marketingMetadata({
    title: 'Quotation Software for Freelancers',
    description:
        'Prepare professional quotes, agree commercial terms with clients, manage revisions and convert accepted quotes into invoices.',
    path: '/features/quotes',
});

const quoteContents = [
    'Client and business details',
    'Scope and line items',
    'Currency and commercial terms',
    'Discounts and applicable taxes',
    'Deposit requirements',
    'Issue and expiry dates',
    'Notes and additional context',
];

export default function QuotesPage() {
    return (
        <>
            <MarketingBreadcrumbStructuredData items={[
                { name: 'Home', path: '/' },
                { name: 'Features', path: '/features' },
                { name: 'Quotes', path: '/features/quotes' },
            ]} />

            <FeatureSubnav currentPath="/features/quotes" />
            <main>
                {/* HERO */}
                <section className="overflow-hidden border-b-2 border-ink bg-cream">
                    <Container className="py-12 sm:py-16 lg:py-20">
                        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                            <div>
              <span className="inline-flex -rotate-2 border-brut border-ink bg-sun px-3 py-1.5 text-caption font-extrabold uppercase tracking-[0.14em] text-on-sun shadow-brut">
                Quotes and proposals
              </span>

                                <h1 className="mt-7 text-[3.2rem] font-extrabold leading-[0.98] tracking-[-0.065em] text-ink sm:text-[4.5rem]">
                                    Agree on the work.
                                    <span className="block text-mango">Then get started.</span>
                                </h1>

                                <p className="mt-6 max-w-xl text-body-l leading-relaxed text-text-soft sm:text-lg">
                                    Put the scope, price and payment expectations in writing.
                                    Share a quote your client can review and respond to, then
                                    turn the accepted work into an invoice.
                                </p>

                                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                                    <Link href="/signup" className={buttonStyles({ size: 'lg' })}>
                                        Create a quote <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        href="/features/invoicing"
                                        className="inline-flex min-h-11 items-center gap-2 font-extrabold text-link underline decoration-2 underline-offset-4 hover:no-underline"
                                    >
                                        Explore invoicing
                                        <ArrowUpRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>

                            {/* Quote document composition */}
                            <div className="relative mx-auto w-full max-w-[36rem] pb-5 pr-5">
                                <div className="absolute inset-0 -rotate-3 border-brut border-ink bg-pink" />

                                <div className="relative border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                                    <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-5">
                                        <div>
                                            <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-text-muted">
                                                Commercial document
                                            </p>
                                            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
                                                QUOTATION
                                            </h2>
                                            <p className="mt-1 font-mono text-caption text-text-muted">
                                                QT-0001
                                            </p>
                                        </div>
                                        <span className="border-brut border-ink bg-sun px-3 py-2 text-caption font-extrabold uppercase shadow-brut">
                    For review
                  </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-5 py-5">
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                                Prepared by
                                            </p>
                                            <p className="mt-1 font-extrabold text-ink">
                                                Your business
                                            </p>
                                            <p className="text-caption text-text-muted">
                                                Your business details
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                                Prepared for
                                            </p>
                                            <p className="mt-1 font-extrabold text-ink">
                                                Your client
                                            </p>
                                            <p className="text-caption text-text-muted">
                                                Client details
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border-y border-ink/20 py-3">
                                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">
                                            Proposed work
                                        </p>
                                        <div className="mt-4 space-y-4">
                                            <QuoteLine
                                                title="Project scope"
                                                description="Deliverables and agreed work"
                                            />
                                            <QuoteLine
                                                title="Additional services"
                                                description="Optional or supporting work"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-end justify-between gap-4">
                                        <div>
                                            <p className="text-caption font-bold text-text-muted">
                                                Proposed total
                                            </p>
                                            <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
                                                NGN 000,000
                                            </p>
                                        </div>
                                        <div className="border-brut border-ink bg-pink px-3 py-2 text-caption font-extrabold uppercase text-on-pink shadow-brut">
                                            14 days validity
                                        </div>
                                    </div>

                                    <div className="mt-5 border-t-2 border-ink pt-4">
                                        <p className="text-caption font-bold text-text-muted">
                                            Client response
                                        </p>
                                        <div className="mt-3 grid grid-cols-2 gap-3">
                                            <div className="border-brut border-ink bg-mango px-3 py-3 text-center text-caption font-extrabold uppercase text-on-mango shadow-brut">
                                                Accept quote
                                            </div>
                                            <div className="border-brut border-ink bg-surface px-3 py-3 text-center text-caption font-extrabold uppercase text-ink shadow-brut">
                                                Request review
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute -bottom-1 -left-2 -rotate-6 border-brut border-ink bg-sun px-3 py-2 text-caption font-extrabold uppercase text-on-sun shadow-brut">
                                    Agree before delivery.
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* QUOTE STRUCTURE */}
                <section className="bg-surface py-16 sm:py-20">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                                    Make the agreement visible
                                </p>
                                <h2 className="mt-3 text-title-l font-extrabold tracking-tight text-ink sm:text-4xl">
                                    A clear quote prevents unclear expectations.
                                </h2>
                                <p className="mt-4 text-body-l text-text-soft">
                                    Set out what you are offering, what it costs and the terms
                                    attached to the work. Your client gets a document they can
                                    review before you move to invoicing.
                                </p>
                            </div>

                            <div className="border-brut border-ink bg-cream p-5 shadow-brut-lg sm:p-7">
                                <div className="flex items-center justify-between border-b-2 border-ink pb-4">
                <span className="font-extrabold text-ink">
                  What's in your quote
                </span>
                                    <span className="border-brut border-ink bg-pink px-2 py-1 text-[10px] font-extrabold uppercase text-on-pink shadow-brut">
                  Commercial terms
                </span>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {quoteContents.map((item) => (
                                        <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border-brut border-ink bg-mango text-on-mango">
                      <Check className="h-3 w-3" />
                    </span>
                                            <span className="text-body font-semibold text-text">
                      {item}
                    </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* CLIENT RESPONSE */}
                <section className="border-y-2 border-ink bg-pink py-16 text-on-pink sm:py-20">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.16em]">
                                    A useful client experience
                                </p>
                                <h2 className="mt-3 text-title-l font-extrabold tracking-tight sm:text-4xl">
                                    Give the client a way to respond.
                                </h2>
                                <p className="mt-4 max-w-xl text-body-l text-on-pink/80">
                                    Your client can review the quote, accept it, decline it or
                                    request changes. Comments help keep the conversation attached
                                    to the commercial document.
                                </p>
                            </div>

                            <div className="border-brut border-ink bg-surface p-5 text-text shadow-brut-lg sm:p-7">
                                <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                    Client response options
                                </p>

                                <div className="mt-5 space-y-3">
                                    <ResponseOption
                                        icon={<Check className="h-5 w-5" />}
                                        title="Accept the quote"
                                        copy="Confirm the proposed commercial terms."
                                        tone="bg-mango"
                                    />
                                    <ResponseOption
                                        icon={<MessageSquare className="h-5 w-5" />}
                                        title="Request a review"
                                        copy="Ask for a change or clarification."
                                        tone="bg-sun"
                                    />
                                    <ResponseOption
                                        icon={<ArrowRight className="h-5 w-5" />}
                                        title="Decline the quote"
                                        copy="Record that the offer will not proceed."
                                        tone="bg-pink"
                                    />
                                </div>

                                <div className="mt-5 border-t-2 border-ink pt-4">
                                    <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink bg-surface-tint">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                                        <div>
                                            <p className="font-extrabold text-ink">
                                                Keep the conversation with the quote.
                                            </p>
                                            <p className="mt-1 text-caption text-text-muted">
                                                Comments and review requests stay connected to the
                                                document.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* REVISIONS */}
                <section className="bg-cream py-16 sm:py-20">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                                    When the scope changes
                                </p>
                                <h2 className="mt-3 text-title-l font-extrabold tracking-tight text-ink sm:text-4xl">
                                    Revise the quote. Keep the history.
                                </h2>
                                <p className="mt-4 text-body-l text-text-soft">
                                    Commercial terms can change as a project takes shape. Bagg
                                    preserves the previous version when you revise an issued
                                    quote, so the earlier agreement does not disappear.
                                </p>
                            </div>

                            <div className="border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                                <div className="flex items-center justify-between gap-4">
                <span className="font-extrabold text-ink">
                  Quote revision history
                </span>
                                    <RefreshCw className="h-5 w-5" />
                                </div>

                                <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                    <div className="border-brut border-ink bg-surface-tint p-4">
                                        <p className="text-caption font-extrabold uppercase text-text-muted">
                                            Previous version
                                        </p>
                                        <p className="mt-2 text-xl font-extrabold text-ink">
                                            Version 1
                                        </p>
                                        <p className="mt-2 text-caption text-text-soft">
                                            Original terms preserved
                                        </p>
                                        <span className="mt-4 inline-flex border border-ink px-2 py-1 text-[10px] font-extrabold uppercase">
                    History
                  </span>
                                    </div>

                                    <div className="flex justify-center">
                                        <ArrowRight className="h-6 w-6 rotate-90 sm:rotate-0" />
                                    </div>

                                    <div className="border-brut border-ink bg-mango p-4 text-on-mango shadow-brut">
                                        <p className="text-caption font-extrabold uppercase">
                                            Revised version
                                        </p>
                                        <p className="mt-2 text-xl font-extrabold">
                                            Version 2
                                        </p>
                                        <p className="mt-2 text-caption text-on-mango/80">
                                            Updated terms for review
                                        </p>
                                        <span className="mt-4 inline-flex border border-ink px-2 py-1 text-[10px] font-extrabold uppercase">
                    New draft
                  </span>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-start gap-3 border-t-2 border-ink pt-4">
                                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                                    <p className="text-caption text-text-soft">
                                        The previous client link is invalidated when a revision is
                                        created. The revised draft must be finalised and shared
                                        again.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* CONVERSION */}
                <section className="border-y-2 border-ink bg-mango py-16 text-on-mango sm:py-20">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.16em]">
                                    From agreement to payment
                                </p>
                                <h2 className="mt-3 text-title-l font-extrabold tracking-tight sm:text-4xl">
                                    Accepted? Move to invoicing.
                                </h2>
                                <p className="mt-4 max-w-xl text-body-l text-on-mango/80">
                                    Once a quote is accepted, you can convert it into an invoice.
                                    The conversion is a deliberate next step, so you remain in
                                    control of when billing begins.
                                </p>
                            </div>

                            <div className="border-brut border-ink bg-surface p-5 text-text shadow-brut-lg sm:p-7">
                                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                    <div className="border-brut border-ink bg-pink p-4 text-on-pink">
                                        <FileText className="h-6 w-6" />
                                        <p className="mt-4 font-extrabold">Accepted quote</p>
                                        <p className="mt-1 text-caption text-on-pink/80">
                                            Commercial terms agreed
                                        </p>
                                    </div>

                                    <div className="flex justify-center">
                                        <ArrowRight className="h-6 w-6 rotate-90 sm:rotate-0" />
                                    </div>

                                    <div className="border-brut border-ink bg-sun p-4 text-on-sun">
                                        <Wallet className="h-6 w-6" />
                                        <p className="mt-4 font-extrabold">Invoice</p>
                                        <p className="mt-1 text-caption text-on-sun/80">
                                            Ready for billing
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 border-t-2 border-ink pt-4">
                                    <p className="font-extrabold text-ink">
                                        Acceptance is not automatic invoicing.
                                    </p>
                                    <p className="mt-1 text-caption text-text-muted">
                                        You decide when to convert the accepted quote into an
                                        invoice.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* CURRENCY */}
                <section className="bg-surface py-16 sm:py-20">
                    <Container>
                        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                                    Work across borders
                                </p>
                                <h2 className="mt-3 text-title-l font-extrabold tracking-tight text-ink sm:text-4xl">
                                    Quote in the currency you agreed.
                                </h2>
                                <p className="mt-4 text-body-l text-text-soft">
                                    Use the currency that makes sense for the client and the work.
                                    Your quote carries its own commercial totals and payment
                                    expectations.
                                </p>
                            </div>

                            <div className="border-brut border-ink bg-cream p-5 shadow-brut-lg sm:p-7">
                                <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                    Supported currencies
                                </p>
                                <div className="mt-5 flex flex-wrap gap-3">
                                    {currencies.map((currency, index) => (
                                        <span
                                            key={currency}
                                            className={`border-brut border-ink px-4 py-3 font-extrabold shadow-brut ${
                                                index % 3 === 0
                                                    ? 'bg-mango text-on-mango'
                                                    : index % 3 === 1
                                                        ? 'bg-pink text-on-pink'
                                                        : 'bg-sun text-on-sun'
                                            }`}
                                        >
                    {currency}
                  </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>

                {/* CTA */}
                <section className="bg-cream py-16 sm:py-20">
                    <Container>
                        <div className="relative border-brut border-ink bg-sun p-7 shadow-brut-lg sm:p-10">
            <span className="absolute -right-2 -top-3 rotate-3 border-brut border-ink bg-pink px-3 py-2 text-caption font-extrabold uppercase text-on-pink shadow-brut">
              Start with clarity
            </span>

                            <div className="max-w-2xl">
                                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-on-sun">
                                    Before the work begins
                                </p>
                                <h2 className="mt-3 text-[2.5rem] font-extrabold leading-[1] tracking-[-0.055em] text-on-sun sm:text-5xl">
                                    Put the agreement in writing.
                                </h2>
                                <p className="mt-4 max-w-xl text-body-l text-on-sun/80">
                                    Create a quote, share it with your client and keep the
                                    commercial conversation connected to the work.
                                </p>
                                <Link
                                    href="/signup"
                                    className={`${buttonStyles({ size: 'lg', variant: 'outline' })} mt-7`}
                                >
                                    Create a quote <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </Container>
                </section>
            </main>
        </>
    );
}

function QuoteLine({
                       title,
                       description,
                   }: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="font-extrabold text-ink">{title}</p>
                <p className="text-caption text-text-muted">{description}</p>
            </div>
            <span className="font-mono text-caption font-bold text-text">
        000,000
      </span>
        </div>
    );
}

function ResponseOption({
                            icon,
                            title,
                            copy,
                            tone,
                        }: {
    icon: React.ReactNode;
    title: string;
    copy: string;
    tone: string;
}) {
    return (
        <div className="flex items-center gap-3 border-brut border-ink bg-cream p-3">
      <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink shadow-brut ${tone}`}
      >
        {icon}
      </span>
            <div>
                <p className="font-extrabold text-ink">{title}</p>
                <p className="text-caption text-text-muted">{copy}</p>
            </div>
        </div>
    );
}
