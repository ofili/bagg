
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  BellRing,
  Check,
  FileText,
  Globe2,
  Link2,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

import { BagCharacter } from '@/components/brand';
import { Money } from '@/components/money/Money';
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
                Getting paid shouldn't be another job.
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
                <div className="absolute -right-2 -top-4 z-10">
                  <MarketingSticker tone="mango" tilt="right">
                    Less chasing
                  </MarketingSticker>
                </div>

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

        {/* PROBLEM */}
        <section className="bg-surface">
          <Container className="py-16 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <MarketingSticker tone="pink" tilt="left" size="sm">
                  The admin problem
                </MarketingSticker>

                <h2 className="mt-5 text-title-l text-ink sm:text-[2.5rem] sm:leading-[2.7rem]">
                  Doing the work is one thing. Getting paid is another.
                </h2>

                <p className="mt-4 text-body-l text-text-soft">
                  The project may be finished, but the invoice still needs
                  sending. The client needs a reminder. The payment needs
                  confirming. And someone needs to issue the receipt.
                </p>

                <p className="mt-4 text-body font-bold text-ink">
                  Bagg brings those payment-administration tasks together.
                </p>
              </div>

              <MarketingGrid columns={2} gap="md">
                <ProblemCard
                    icon={<FileText className="h-5 w-5" />}
                    title="Invoices scattered everywhere"
                    copy="Documents, messages and payment details spread across different places."
                />
                <ProblemCard
                    icon={<MessageCircle className="h-5 w-5" />}
                    title="The uncomfortable follow-up"
                    copy="You have to remember who owes what and when to ask again."
                />
                <ProblemCard
                    icon={<Wallet className="h-5 w-5" />}
                    title="Unclear payment status"
                    copy="A client says they paid. You still need to verify and record it."
                />
                <ProblemCard
                    icon={<ReceiptText className="h-5 w-5" />}
                    title="Missing payment records"
                    copy="Receipts and payment history should not disappear into chat threads."
                />
              </MarketingGrid>
            </div>
          </Container>
        </section>

        {/* CORE PROMISE */}
        <section className="border-y-2 border-ink bg-mango">
          <Container className="grid gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-caption font-extrabold uppercase tracking-widest text-on-mango/70">
                The Bagg approach
              </p>
              <h2 className="mt-3 text-title-l text-on-mango sm:text-[2.75rem] sm:leading-[2.9rem]">
                One clear path from invoice to payment.
              </h2>
              <p className="mt-3 max-w-2xl text-body-l text-on-mango/85">
                Create the document. Share the link. Know what is happening.
                Follow up. Keep the record.
              </p>
            </div>

            <Link
                href="/signup"
                className={buttonStyles({ variant: 'ink', size: 'lg' })}
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Container>
        </section>

        {/* HOW IT WORKS */}
        <section
            id="how-it-works"
            className="scroll-mt-24 bg-cream"
        >
          <Container className="py-16 sm:py-20">
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
          <Container className="py-16 sm:py-20">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <SectionHeading
                  title="The tools behind getting paid."
                  copy="Not another complicated business suite. Just the capabilities you need to invoice and manage payment follow-through."
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
                  number="01"
                  title="Professional invoices"
                  copy="Create clear, branded invoices with line items, due dates, client details and the right payment instructions."
                  tag="Create"
              />
              <CapabilityCard
                  icon={<Link2 className="h-5 w-5" />}
                  number="02"
                  title="Shareable invoice links"
                  copy="Give clients one simple page to view the invoice, understand the amount due and see how to pay."
                  tag="Share"
              />
              <CapabilityCard
                  icon={<BellRing className="h-5 w-5" />}
                  number="03"
                  title="Payment reminders"
                  copy="Use scheduled reminders to follow up before and after the due date, without writing every message yourself."
                  tag="Follow up"
              />
              <CapabilityCard
                  icon={<Wallet className="h-5 w-5" />}
                  number="04"
                  title="Payment tracking"
                  copy="See invoice progress, review client payment claims and keep confirmed payment activity connected to the invoice."
                  tag="Track"
              />
              <CapabilityCard
                  icon={<ReceiptText className="h-5 w-5" />}
                  number="05"
                  title="Receipts and records"
                  copy="Keep a payment record and share a receipt when payment has been confirmed."
                  tag="Record"
              />
              <CapabilityCard
                  icon={<Globe2 className="h-5 w-5" />}
                  number="06"
                  title="Multiple currencies"
                  copy="Create invoices in the currencies you work with and maintain the corresponding payment details."
                  tag="Across borders"
              />
            </MarketingGrid>
          </Container>
        </section>

        {/* CURRENCY */}
        <section className="bg-cream">
          <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <MarketingSticker tone="sun" tilt="left">
                Local work. Global clients.
              </MarketingSticker>

              <h2 className="mt-5 text-title-l text-ink sm:text-[2.5rem] sm:leading-[2.7rem]">
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
                    <p className="text-caption font-extrabold text-on-mango/70">
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

        {/* TRUST */}
        <section className="border-y border-line bg-peach">
          <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <MarketingSticker tone="ink" tilt="left">
                Your money. Your client.
              </MarketingSticker>

              <h2 className="mt-5 text-title-l text-ink sm:text-[2.5rem] sm:leading-[2.7rem]">
                Clear records. No confusion about who holds the money.
              </h2>

              <p className="mt-4 text-body-l text-text-soft">
                Bagg helps you create invoices, communicate payment
                instructions, track payment activity and keep records.
                Your client pays you directly using the payment method
                provided.
              </p>

              <Link
                  href="/security"
                  className={`${buttonStyles({ variant: 'link' })} mt-6`}
              >
                Learn about security
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <MarketingCard tone="surface" featured>
              <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border-brut border-ink bg-mango text-on-mango shadow-brut-sm">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </span>
                <div>
                  <h3 className="text-heading text-ink">
                    Payment transparency
                  </h3>
                  <p className="mt-1 text-body text-text-soft">
                    Keep the difference between a client saying they have
                    paid and a payment being confirmed.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-t border-line pt-5">
                <TrustRow
                    title="Payment claims"
                    copy="A client can report a payment for your review."
                />
                <TrustRow
                    title="Payment confirmation"
                    copy="Confirmed payments update the invoice record."
                />
                <TrustRow
                    title="Receipts"
                    copy="Keep a receipt connected to the payment record."
                />
                <TrustRow
                    title="Reminders"
                    copy="Reminders stop when payment is recorded as paid."
                />
              </div>
            </MarketingCard>
          </Container>
        </section>

        {/* AUDIENCES */}
        <section className="bg-surface">
          <Container className="py-16 sm:py-20">
            <SectionHeading
                title="Built around the way independent people work."
                copy="Different kinds of work. The same need for clear invoices and dependable payment follow-through."
            />

            <MarketingGrid columns={3} gap="md" className="mt-10">
              <AudienceCard
                  title="Freelancers"
                  copy="For independent professionals managing clients, projects and payments on their own."
                  label="Independent work"
                  href="/freelancers"
              />
              <AudienceCard
                  title="Consultants"
                  copy="For advisory, strategy and professional services where clear commercial records matter."
                  label="Professional services"
                  href="/consultants"
              />
              <AudienceCard
                  title="Creative studios"
                  copy="For small teams coordinating client work, invoices and payment administration."
                  label="Creative businesses"
                  href="/studios"
              />
            </MarketingGrid>
          </Container>
        </section>

        {/* WHAT'S NEXT */}
        <section className="border-y border-line bg-cream">
          <Container className="py-16 sm:py-20">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <MarketingSticker tone="pink" tilt="left">
                  The bigger picture
                </MarketingSticker>
                <h2 className="mt-5 text-title-l text-ink sm:text-[2.5rem] sm:leading-[2.7rem]">
                  More of the client journey, over time.
                </h2>
                <p className="mt-4 text-body-l text-text-soft">
                  Bagg is evolving beyond invoice creation. Our direction
                  is to help independent businesses manage the commercial
                  journey from agreeing work to getting paid.
                </p>
                <p className="mt-3 text-caption font-bold text-text-muted">
                  These capabilities are planned, not currently available.
                </p>
              </div>

              <MarketingGrid columns={2} gap="md">
                <RoadmapCard
                    number="01"
                    title="Projects and milestones"
                    copy="Organise client work and connect milestones to payment."
                />
                <RoadmapCard
                    number="02"
                    title="Contracts and agreements"
                    copy="Keep agreed scope and commercial terms connected to the work."
                />
                <RoadmapCard
                    number="03"
                    title="Client delivery"
                    copy="Manage previews, feedback, revisions and final handover."
                />
                <RoadmapCard
                    number="04"
                    title="A connected workspace"
                    copy="Bring more of the client relationship into one coherent workflow."
                />
              </MarketingGrid>
            </div>
          </Container>
        </section>

        {/* PRICING ENTRY */}
        <section className="bg-surface">
          <Container className="grid gap-6 py-14 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-title-l text-ink">
                Start free. Understand the cost before you commit.
              </h2>
              <p className="mt-2 max-w-2xl text-body-l text-text-soft">
                Start with three free PDF or email sends. Paid plans and
                fees will be shown clearly before you are charged.
              </p>
            </div>
            <Link
                href="/pricing"
                className={buttonStyles({ variant: 'outline' })}
            >
              Explore pricing
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Container>
        </section>

        {/* FAQ */}
        <section className="border-t border-line bg-cream">
          <Container className="py-16 sm:py-20">
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

function ProblemCard({
                       icon,
                       title,
                       copy,
                     }: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
      <MarketingCard tone="surface">
      <span className="flex h-10 w-10 items-center justify-center border-brut border-ink bg-peach shadow-brut-sm">
        {icon}
      </span>
        <h3 className="mt-5 text-heading text-ink">{title}</h3>
        <p className="mt-2 text-body text-text-soft">{copy}</p>
      </MarketingCard>
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
        <div className="flex items-center justify-between gap-3">
        <span className="text-[2.5rem] font-extrabold leading-none tracking-tight opacity-50">
          {number}
        </span>
          {featured && (
              <MarketingSticker tone="ink" tilt="right" size="sm">
                The simple bit
              </MarketingSticker>
          )}
        </div>
        <p className="mt-6 text-caption font-extrabold uppercase tracking-widest opacity-70">
          {label}
        </p>
        <h3 className="mt-2 text-title text-current">{title}</h3>
        <p className="mt-3 text-body text-current opacity-80">{copy}</p>
      </MarketingCard>
  );
}

function CapabilityCard({
                          icon,
                          number,
                          title,
                          copy,
                          tag,
                        }: {
  icon: React.ReactNode;
  number: string;
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
          <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-extrabold text-text-muted">
            {number}
          </span>
            <span className="border-brut-thin border-ink bg-cream px-2 py-0.5 text-caption font-bold text-text-soft">
            {tag}
          </span>
          </div>
          <h3 className="mt-2 text-heading text-ink">{title}</h3>
          <p className="mt-2 text-body text-text-soft">{copy}</p>
        </div>
      </MarketingCard>
  );
}

function TrustRow({
                    title,
                    copy,
                  }: {
  title: string;
  copy: string;
}) {
  return (
      <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-brut-thin border-ink bg-cream text-ink">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
        <div>
          <p className="text-label font-extrabold text-ink">{title}</p>
          <p className="mt-0.5 text-body text-text-soft">{copy}</p>
        </div>
      </div>
  );
}

function AudienceCard({
                        title,
                        copy,
                        label,
                        href,
                      }: {
  title: string;
  copy: string;
  label: string;
  href: string;
}) {
  return (
      <MarketingCard tone="surface" className="flex h-full flex-col">
        <MarketingSticker tone="sun" tilt="left" size="sm">
          {label}
        </MarketingSticker>
        <h3 className="mt-5 text-title text-ink">{title}</h3>
        <p className="mt-2 flex-1 text-body text-text-soft">{copy}</p>
        <Link
            href={href}
            className={`${buttonStyles({ variant: 'link' })} mt-5`}
        >
          Explore
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </MarketingCard>
  );
}

function RoadmapCard({
                       number,
                       title,
                       copy,
                     }: {
  number: string;
  title: string;
  copy: string;
}) {
  return (
      <div className="border-brut border-ink bg-surface p-5 shadow-brut-sm">
        <p className="text-caption font-extrabold text-text-muted">
          PLANNED / {number}
        </p>
        <h3 className="mt-3 text-heading text-ink">{title}</h3>
        <p className="mt-2 text-body text-text-soft">{copy}</p>
      </div>
  );
}
