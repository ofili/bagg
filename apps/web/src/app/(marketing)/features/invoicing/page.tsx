
import Link from 'next/link';
import {
    ArrowRight,
    ArrowUpRight,
    Download,
    FileText,
    Globe2,
    Link2,
    Send,
    Smartphone,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { MarketingSection } from '@/components/marketing/marketing-section';
import { SectionHeading } from '@/components/marketing/section-heading';
import { PageHero } from '@/components/marketing/page-hero';
import { FeatureSubnav } from '@/components/marketing/feature-sub-nav';
import { MarketingBreadcrumbStructuredData } from "@/components/marketing/marketing-structured-data";
import { buttonStyles } from '@/components/ui/button';
import { marketingMetadata } from '@/lib/metadata';
import { demoInvoiceHref } from '@/lib/site';
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
    title: 'Invoice Software for Freelancers',
    description:
        'Create professional invoices, add line items and payment details, share invoice links and track outstanding balances with Bagg.',
    path: '/features/invoicing',
});

export default function InvoicingPage() {
    return (
        <>
            <MarketingBreadcrumbStructuredData items={[
                { name: 'Home', path: '/' },
                { name: 'Features', path: '/features' },
                { name: 'Invoicing', path: '/features/invoicing' },
            ]} />

            <FeatureSubnav currentPath="/features/invoicing" />

            <div>
                {/* HERO */}
                <PageHero
                    layout="split"
                    containerClassName="gap-12 lg:grid-cols-[0.9fr_1.1fr]"
                    kicker={
                        <span className="inline-flex -rotate-2 border-brut border-ink bg-pink px-3 py-1.5 text-caption font-extrabold uppercase tracking-[0.14em] text-on-pink shadow-brut">
                        Invoicing
                        </span>
                    }
                    title={
                        <>
                        Send an invoice.
                        <span className="block text-mango">Not a spreadsheet.</span>
                        </>
                    }
                    titleClassName="text-[3.2rem] leading-[0.98] tracking-[-0.065em] sm:text-[4.5rem]"
                    copy={
                        <>
                        Create a professional invoice with the details your client needs to pay
                        you. Share one link, send a PDF and keep the payment status in view.
                        </>
                    }
                    visual={
                        /* Move the existing Invoice artefact div here unchanged. */
                        <div className="relative mx-auto w-full max-w-[36rem] pb-5 pr-5">
                        <div className="absolute inset-0 rotate-3 border-brut border-ink bg-mango" />
                        <div className="relative border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                            <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-5">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-text-muted">
                                Invoice preview
                                </p>
                                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
                                INVOICE
                                </h2>
                                <p className="mt-1 font-mono text-caption text-text-muted">
                                INV-0001
                                </p>
                            </div>
                            <span className="border-brut border-ink bg-sun px-3 py-2 text-caption font-extrabold uppercase text-on-sun shadow-brut">
                                Sent
                            </span>
                            </div>
                            <div className="grid grid-cols-2 gap-5 py-5">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                From
                                </p>
                                <p className="mt-1 font-extrabold text-ink">Your business</p>
                                <p className="text-caption text-text-muted">Your business details</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-muted">
                                Bill to
                                </p>
                                <p className="mt-1 font-extrabold text-ink">Your client</p>
                                <p className="text-caption text-text-muted">Client details</p>
                            </div>
                            </div>
                            <div className="border-y border-ink/20 py-3">
                            <div className="flex justify-between text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">
                                <span>Description</span>
                                <span>Amount</span>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-4">
                                <div>
                                <p className="font-extrabold text-ink">Project work</p>
                                <p className="text-caption text-text-muted">Professional services</p>
                                </div>
                                <span className="font-mono font-extrabold text-ink">000,000</span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-4">
                                <div>
                                <p className="font-extrabold text-ink">Additional work</p>
                                <p className="text-caption text-text-muted">As agreed</p>
                                </div>
                                <span className="font-mono font-extrabold text-ink">000,000</span>
                            </div>
                            </div>
                            <div className="ml-auto mt-5 max-w-[13rem]">
                            <p className="text-caption font-bold text-text-muted">Total due</p>
                            <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
                                NGN 000,000
                            </p>
                            </div>
                            <div className="mt-5 flex items-center justify-between border-t-2 border-ink pt-4">
                            <span className="text-caption font-bold text-text-muted">
                                Payment details included
                            </span>
                            <FileText className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="absolute -bottom-1 -left-2 -rotate-6 border-brut border-ink bg-pink px-3 py-2 text-caption font-extrabold uppercase text-on-pink shadow-brut">
                            Clear. Professional. Yours.
                        </div>
                        </div>
                    }
                    >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Link
                        href="/signup"
                        className={buttonStyles({
                            size: 'lg',
                            mobileFullWidth: true,
                        })}
                        >
                        Create your first invoice
                        <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                        href={demoInvoiceHref}
                        className="inline-flex min-h-11 items-center gap-2 font-extrabold text-link underline decoration-2 underline-offset-4 hover:no-underline"
                        >
                        View client invoice
                        <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>
                    </PageHero>

                {/* SHARE */}
                <section className="border-y-2 border-ink bg-pink py-20 text-on-pink sm:py-28 lg:py-32">
                    <Container>
                        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
                            <div>
                                <p className="text-caption font-extrabold uppercase tracking-[0.16em]">
                                    One link. Multiple ways to share.
                                </p>
                                <h2 className="mt-3 text-title-l font-extrabold tracking-tight sm:text-4xl">
                                    Your client doesn&apos;t need another account.
                                </h2>
                                <p className="mt-4 max-w-xl text-body-l text-on-pink/80">
                                    Share the invoice through WhatsApp, email or any channel you
                                    already use. Your client opens the link and sees the invoice
                                    without having to sign up for Bagg.
                                </p>
                            </div>

                            <div className="border-brut border-ink bg-surface p-5 text-text shadow-brut-lg sm:p-7">
                                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center border-brut border-ink bg-mango text-on-mango">
                      <Link2 className="h-5 w-5" />
                    </span>
                                    <div>
                                        <p className="font-extrabold text-ink">Client invoice link</p>
                                        <p className="text-caption text-text-muted">
                                            A shareable invoice page
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center justify-between gap-3 border-brut border-ink bg-cream p-3">
                    <span className="truncate font-mono text-caption text-text-soft">
                      bagg.app/i/your-invoice
                    </span>
                                    <span className="shrink-0 border-brut border-ink bg-sun px-2 py-1 text-[10px] font-extrabold uppercase text-on-sun">
                      Link
                    </span>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <ShareOption icon={<Smartphone className="h-5 w-5" />} label="WhatsApp" />
                                    <ShareOption icon={<Send className="h-5 w-5" />} label="Email" />
                                    <ShareOption icon={<Download className="h-5 w-5" />} label="PDF" />
                                    <ShareOption icon={<Globe2 className="h-5 w-5" />} label="Any channel" />
                                </div>
                            </div>
                        </div>
                    </Container>
                </section>
                
                {/* STATUS */}
                <MarketingSection spacing="large" className="bg-cream">
                <div className="mb-9">
                    <SectionHeading
                    eyebrow="Know where things stand"
                    title="From sent to settled. No guesswork."
                    copy="Bagg keeps the invoice status and outstanding balance visible as the client views the invoice and payments are recorded."
                    titleClassName="text-title-l tracking-tight sm:text-4xl"
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <StatusStep
                    label="Draft"
                    copy="Still being prepared"
                    tone="bg-surface-tint text-text"
                    />
                    <StatusStep
                    label="Sent"
                    copy="The invoice link is live"
                    tone="bg-sun text-on-sun"
                    />
                    <StatusStep
                    label="Viewed"
                    copy="The client opened it"
                    tone="bg-pink text-on-pink"
                    />
                    <StatusStep
                    label="Part paid"
                    copy="Some money received"
                    tone="bg-mango text-on-mango"
                    />
                    <StatusStep
                    label="Paid"
                    copy="The balance is settled"
                    tone="bg-status-paid text-status-paid-fg"
                    />
                </div>

                <div className="mt-5 border-brut border-ink bg-surface p-5 shadow-brut sm:flex sm:items-center sm:justify-between sm:gap-6">
                    <div>
                    <p className="font-extrabold text-ink">
                        An overdue invoice stays visible.
                    </p>
                    <p className="mt-1 text-body text-text-soft">
                        When the due date passes with a balance remaining, the invoice is marked late.
                    </p>
                    </div>
                    <span className="mt-4 inline-flex border-brut border-ink bg-status-late px-3 py-2 text-caption font-extrabold uppercase text-status-late-fg shadow-brut sm:mt-0">
                    Late
                    </span>
                </div>
                </MarketingSection>

                {/* CTA */}
                <section className="bg-cream py-20 sm:py-28 lg:py-32">
                    <Container>
                        <div className="grid gap-8 border-brut border-ink bg-mango p-7 text-on-mango shadow-brut-lg sm:p-10 md:grid-cols-[1fr_auto] md:items-end">
                            <div className="max-w-2xl">
                                <p className="text-caption font-extrabold uppercase tracking-[0.16em]">
                                    Make the next ask
                                </p>
                                <h2 className="mt-3 text-[2.5rem] font-extrabold leading-[1] tracking-[-0.055em] sm:text-5xl">
                                    Your work deserves a proper invoice.
                                </h2>
                                <p className="mt-4 max-w-xl text-body-l text-on-mango/80">
                                    Create it, share it and keep the payment status in one place.
                                </p>
                            </div>
                            <Link
                                href="/signup"
                                className={`${buttonStyles({ size: 'lg', variant: 'outline' })} shrink-0`}
                            >
                                Start free <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </Container>
                </section>
            </div>
        </>
    );
}

function ShareOption({
                         icon,
                         label,
                     }: {
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <div className="flex items-center gap-3 border-brut border-ink bg-cream p-3">
            {icon}
            <span className="text-body font-extrabold text-ink">{label}</span>
        </div>
    );
}

function StatusStep({
                        label,
                        copy,
                        tone,
                    }: {
    label: string;
    copy: string;
    tone: string;
}) {
    return (
        <div className={`min-h-32 border-brut border-ink p-4 shadow-brut ${tone}`}>
            <p className="text-lg font-extrabold">{label}</p>
            <p className="mt-2 text-caption font-semibold opacity-75">{copy}</p>
        </div>
    );
}
