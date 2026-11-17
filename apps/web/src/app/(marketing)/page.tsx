
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  Check,
  FileText,
  Globe2,
  Link2,
  ReceiptText,
  Wallet,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { CtaBand } from '@/components/marketing/cta-band';
import { FaqList } from '@/components/marketing/faq-list';
import { MarketingCard } from '@/components/marketing/marketing-card';
import { MarketingFrame } from '@/components/marketing/marketing-frame';
import { MarketingGrid } from '@/components/marketing/marketing-grid';
import { MarketingSticker } from '@/components/marketing/marketing-sticker';
import { ProductPreview } from '@/components/marketing/product-preview';
import { SectionHeading } from '@/components/marketing/section-heading';
import { buttonStyles } from '@/components/ui/button';

import {
  currencies,
  homeFaqs,
} from '@/content/marketing';

import { defaultMarketingMetadata } from '@/lib/metadata';
import { demoInvoiceHref } from '@/lib/site';
import { Metadata } from 'next';

export const metadata: Metadata = defaultMarketingMetadata;

export default function MarketingPage() {
  return (
      <>
        {/* HERO */}
        <section className="relative overflow-hidden border-b-2 border-ink bg-cream">
          <Container className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_0.9fr] lg:gap-10 lg:py-24">
            <div className="relative z-10">
              <MarketingSticker tone="pink" tilt="left">
                Built for independent work
              </MarketingSticker>

              <h1 className="mt-6 max-w-2xl text-[clamp(3rem,7vw,5.5rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-ink">
                Your work is done.
                <span className="block text-ink">
                Getting paid shouldn&apos;t be another job.
              </span>
              </h1>

              <p className="mt-6 max-w-xl text-body-l text-text-soft sm:text-[1.1rem] sm:leading-8">
                Create professional invoices, send one simple link, track
                payments and let reminders do the chasing. Keep the business
                side moving while you focus on the work.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                    href="/signup"
                    className={buttonStyles({ size: 'lg' })}
                >
                  Start free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>

                <Link
                    href={demoInvoiceHref}
                    className={buttonStyles({
                      variant: 'outline',
                      size: 'lg',
                    })}
                >
                  See a client invoice
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption font-bold text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                No card needed
              </span>
                <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Three free sends
              </span>
                <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                No client account required
              </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[29rem] lg:ml-auto">
              <div
                  className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-sun"
                  aria-hidden="true"
              />
              <div
                  className="absolute -bottom-5 -left-5 h-24 w-24 rotate-12 border-brut border-ink bg-pink"
                  aria-hidden="true"
              />

              <div className="relative">
                <MarketingFrame
                    label="A client payment journey"
                    meta="Invoice 0041"
                    caption="From sending the invoice to recording payment."
                >
                  <ProductPreview />
                </MarketingFrame>
              </div>
            </div>
          </Container>

          <div className="border-t border-line bg-surface">
            <Container className="flex flex-wrap items-center justify-between gap-4 py-4">
              <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                Made for people who work independently
              </p>
              <div className="flex flex-wrap gap-2">
                {['Freelancers', 'Consultants', 'Creators', 'Small studios'].map(
                    (item) => (
                        <span
                            key={item}
                            className="rounded-full border-brut-thin border-ink bg-cream px-3 py-1.5 text-caption font-bold text-text-soft"
                        >
                    {item}
                  </span>
                    ),
                )}
              </div>
            </Container>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
            id="how-it-works"
            className="scroll-mt-24 bg-cream"
        >
          <Container className="py-20 sm:py-28 lg:py-32">
            <SectionHeading
                title="Three steps. One less thing to chase."
                copy="A straightforward process for you and an easy experience for your client."
            />

            <MarketingGrid columns={3} gap="lg" className="mt-10">
              <WorkflowCard
                  number="01"
                  label="Create"
                  title="Make an invoice that looks like you."
                  copy="Add your business details, client, line items, currency and payment instructions."
                  tone="surface"
              />
              <WorkflowCard
                  number="02"
                  label="Share"
                  title="Send one link to your client."
                  copy="Share through WhatsApp, email or any channel. Your client can open the invoice without creating an account."
                  tone="mango"
                  featured
              />
              <WorkflowCard
                  number="03"
                  label="Collect"
                  title="Track the money and close the loop."
                  copy="Follow invoice activity, record confirmed payments, issue receipts and stop reminders when paid."
                  tone="surface"
              />
            </MarketingGrid>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                  href={demoInvoiceHref}
                  className={buttonStyles({ variant: 'link' })}
              >
                Explore the client experience
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <span className="text-caption text-text-muted">
              No app download or client password required.
            </span>
            </div>
          </Container>
        </section>

        {/* PRODUCT CAPABILITIES */}
        <section className="border-y border-line bg-surface">
          <Container className="py-20 sm:py-28 lg:py-32">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <SectionHeading
                  title="Tools built for getting paid."
                  copy="Invoicing, reminders, payment claims and receipts — without extra business suite clutter."
              />
              <div className="flex justify-start lg:justify-end">
                <Link
                    href="/features"
                    className={buttonStyles({ variant: 'link' })}
                >
                  Explore all features
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <MarketingGrid columns={2} gap="md" className="mt-10">
              <CapabilityCard
                  icon={<FileText className="h-5 w-5" />}
                  title="Professional invoices"
                  copy="Create clear, branded invoices with line items, due dates, client details and the right payment instructions."
                  tag="Create"
              />
              <CapabilityCard
                  icon={<Link2 className="h-5 w-5" />}
                  title="Shareable invoice links"
                  copy="Give clients one simple page to view the invoice, understand the amount due and see how to pay."
                  tag="Share"
              />
              <CapabilityCard
                  icon={<BellRing className="h-5 w-5" />}
                  title="Payment reminders"
                  copy="Use scheduled reminders to follow up before and after the due date, without writing every message yourself."
                  tag="Follow up"
              />
              <CapabilityCard
                  icon={<Wallet className="h-5 w-5" />}
                  title="Payment tracking"
                  copy="See invoice progress, review client payment claims and keep confirmed payment activity connected to the invoice."
                  tag="Track"
              />
              <CapabilityCard
                  icon={<ReceiptText className="h-5 w-5" />}
                  title="Receipts and records"
                  copy="Keep a payment record and share a receipt when payment has been confirmed."
                  tag="Record"
              />
              <CapabilityCard
                  icon={<Globe2 className="h-5 w-5" />}
                  title="Multiple currencies"
                  copy="Create invoices in the currencies you work with and maintain the corresponding payment details."
                  tag="Across borders"
              />
            </MarketingGrid>
          </Container>
        </section>

        {/* CURRENCY */}
        <section className="bg-cream">
          <Container className="grid gap-10 py-20 sm:py-28 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-32">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                Local work. Global clients.
              </p>

              <h2 className="mt-3 text-title-l text-ink sm:text-[2.5rem] sm:leading-[2.7rem]">
                Work across currencies without losing the details.
              </h2>

              <p className="mt-4 max-w-xl text-body-l text-text-soft">
                Whether you work with clients at home or abroad, your invoice
                should show the agreed currency and the correct payment
                instructions.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {currencies.map((currency) => (
                    <span
                        key={currency}
                        className="border-brut border-ink bg-surface px-3 py-2 text-label font-extrabold text-ink shadow-brut-sm"
                    >
                  {currency}
                </span>
                ))}
              </div>
            </div>

            <MarketingFrame
                label="One workspace"
                meta="Multiple currencies"
                caption="Keep the payment instructions appropriate to each invoice."
            >
              <div className="grid gap-px bg-line sm:grid-cols-2">
                <div className="bg-surface p-6">
                  <p className="text-caption font-extrabold uppercase text-text-muted">
                    Your client sees
                  </p>
                  <p className="mt-3 text-title text-ink">
                    One clear amount.
                  </p>
                  <p className="mt-2 text-body text-text-soft">
                    The agreed currency, invoice balance and payment
                    instructions.
                  </p>
                  <div className="mt-5 border-brut border-ink bg-cream p-4 shadow-brut-sm">
                    <p className="text-caption font-bold text-text-muted">
                      Invoice total
                    </p>
                    <p className="mt-1 text-title text-ink">
                      NGN 450,000
                    </p>
                  </div>
                </div>

                <div className="bg-surface p-6">
                  <p className="text-caption font-extrabold uppercase text-text-muted">
                    You keep
                  </p>
                  <p className="mt-3 text-title text-ink">
                    The full record.
                  </p>
                  <p className="mt-2 text-body text-text-soft">
                    Invoice status, payment activity, client details and
                    receipts in one workspace.
                  </p>
                  <div className="mt-5 border-brut border-ink bg-mango p-4 shadow-brut-sm">
                    <p className="text-caption font-extrabold text-on-mango/85">
                      Payment status
                    </p>
                    <p className="mt-1 text-heading text-on-mango">
                      Part paid
                    </p>
                  </div>
                </div>
              </div>
            </MarketingFrame>
          </Container>
        </section>

        {/* AUDIENCES */}
        <section className="bg-surface">
          <Container className="py-20 sm:py-28 lg:py-32">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <SectionHeading
                  title="Built for independent professionals."
                  copy="Freelancers, consultants and creative studios — all in one place."
              />
              <div className="flex justify-start lg:justify-end">
                <Link
                    href="/creatives"
                    className={buttonStyles({ variant: 'link' })}
                >
                  See how Bagg fits your work
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <MarketingGrid columns={3} gap="md" className="mt-10">
              {['Freelancers', 'Consultants', 'Creative studios'].map((role) => (
                <MarketingCard key={role} tone="surface">
                  <p className="text-title text-ink">{role}</p>
                </MarketingCard>
              ))}
            </MarketingGrid>
          </Container>
        </section>

        {/* FAQ */}
        <section className="border-t border-line bg-cream">
          <Container className="py-20 sm:py-28 lg:py-32">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <SectionHeading
                    title="Good questions. Straight answers."
                    copy="A few things worth knowing before you get started."
                />
                <Link
                    href="/help"
                    className={`${buttonStyles({ variant: 'link' })} mt-5`}
                >
                  Visit the help centre
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <FaqList items={homeFaqs} />
            </div>
          </Container>
        </section>

        {/* FINAL CTA */}
        <CtaBand
            title="Your next invoice can be easier."
            copy="Create your workspace, prepare an invoice and give your client one clear way to pay."
            href="/signup"
            label="Start free"
        />
      </>
  );
}

function WorkflowCard({
                        number,
                        label,
                        title,
                        copy,
                        tone,
                        featured = false,
                      }: {
  number: string;
  label: string;
  title: string;
  copy: string;
  tone: 'surface' | 'mango';
  featured?: boolean;
}) {
  return (
      <MarketingCard tone={tone} featured={featured}>
        <span className="inline-flex h-9 w-9 items-center justify-center border-brut-thin border-ink bg-surface-tint text-caption font-extrabold text-text">
          {number}
        </span>
        <p className="mt-5 text-caption font-extrabold uppercase tracking-widest opacity-70">
          {label}
        </p>
        <h3 className="mt-2 text-title text-current">{title}</h3>
        <p className="mt-3 text-body text-current opacity-80">{copy}</p>
      </MarketingCard>
  );
}

function CapabilityCard({
                          icon,
                          title,
                          copy,
                          tag,
                        }: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  tag: string;
}) {
  return (
      <MarketingCard tone="surface" className="flex gap-4 sm:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center border-brut border-ink bg-mango text-on-mango shadow-brut-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <span className="border-brut-thin border-ink bg-cream px-2 py-0.5 text-caption font-bold text-text-soft">
            {tag}
          </span>
          <h3 className="mt-2 text-heading text-ink">{title}</h3>
          <p className="mt-2 text-body text-text-soft">{copy}</p>
        </div>
      </MarketingCard>
  );
}

