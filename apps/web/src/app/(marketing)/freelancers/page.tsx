
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Check,
  Code2,
  FileText,
  Laptop,
  Palette,
  PenLine,
  ReceiptText,
  Send,
  Wallet,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { MarketingSection } from '@/components/marketing/marketing-section';
import { SectionHeading } from '@/components/marketing/section-heading';
import { PageHero } from '@/components/marketing/page-hero';
import { buttonStyles } from '@/components/ui/button';
import { MarketingBreadcrumbStructuredData } from '@/components/marketing/marketing-structured-data';
import { marketingMetadata } from '@/lib/metadata';
import { demoInvoiceHref } from '@/lib/site';

export const metadata: Metadata = marketingMetadata({
  title: 'Invoicing and Payment Tracking for Freelancers',
  description:
    'Create professional invoices, share payment links, track outstanding balances and send receipts. Bagg helps freelancers manage the business side of client work.',
  path: '/freelancers',
});

const freelancerTypes = [
  {
    icon: Palette,
    title: 'Designers',
    copy: 'Brand identity, websites, presentations, social content and design retainers.',
  },
  {
    icon: Code2,
    title: 'Developers',
    copy: 'Websites, applications, integrations, maintenance and ongoing technical support.',
  },
  {
    icon: PenLine,
    title: 'Writers',
    copy: 'Articles, copywriting, scripts, content packages and editorial retainers.',
  },
  {
    icon: Laptop,
    title: 'Virtual assistants',
    copy: 'Administrative support, operations assistance and recurring client services.',
  },
  {
    icon: FileText,
    title: 'Consultants',
    copy: 'Independent advisory, research, audits, workshops and professional services.',
  },
  {
    icon: ReceiptText,
    title: 'Photographers',
    copy: 'Shoots, editing, licensing, event coverage and creative commissions.',
  },
];

const workflow = [
  {
    number: '01',
    icon: FileText,
    title: 'Prepare a professional invoice',
    copy: 'Set out the work, line items, amount, due date and the payment details your client needs.',
    tone: 'bg-sun text-on-sun',
  },
  {
    number: '02',
    icon: Send,
    title: 'Share it your way',
    copy: 'Send through Bagg or share the invoice link through WhatsApp, email or another channel.',
    tone: 'bg-pink text-on-pink',
  },
  {
    number: '03',
    icon: Wallet,
    title: 'Track the money',
    copy: 'See invoice progress, outstanding balances and payment claims. Confirm payments when verified.',
    tone: 'bg-mango text-on-mango',
  },
  {
    number: '04',
    icon: ReceiptText,
    title: 'Keep a proper record',
    copy: 'Generate a receipt for each confirmed payment and share it with your client.',
    tone: 'bg-surface-tint text-text',
  },
];

const practicalBenefits = [
  {
    icon: FileText,
    title: 'Look professional from the first invoice',
    copy: 'Put your business details, client information, itemised work and payment instructions into a clear document.',
  },
  {
    icon: Wallet,
    title: 'Make it easier for clients to pay',
    copy: 'Include the right payment details for the invoice currency, then share one link your client can open without creating a Bagg account.',
  },
  {
    icon: BellRing,
    title: 'Keep outstanding invoices visible',
    copy: 'See what has been sent, viewed, partially paid or paid. Scheduled email reminders help with routine follow-up.',
  },
  {
    icon: ReceiptText,
    title: 'Keep payment records connected',
    copy: 'Confirm payments, update the invoice balance and issue receipts linked to the original invoice.',
  },
];

function WorkflowStep({
  number,
  icon: Icon,
  title,
  copy,
  tone,
}: {
  number: string;
  icon: typeof FileText;
  title: string;
  copy: string;
  tone: string;
}) {
  return (
    <article className="border-brut border-ink bg-surface p-5 shadow-brut">
      <div className="flex items-center justify-between gap-4">
        <span
          className={`flex h-12 w-12 items-center justify-center border-brut border-ink ${tone}`}
        >
          <Icon aria-hidden className="h-6 w-6" />
        </span>
        <span className="text-caption font-extrabold text-text-muted">
          {number}
        </span>
      </div>

      <h3 className="mt-6 text-heading font-extrabold text-ink">{title}</h3>
      <p className="mt-3 text-body leading-relaxed text-text-soft">{copy}</p>
    </article>
  );
}

export default function FreelancersPage() {
  return (
    <>
      <MarketingBreadcrumbStructuredData
        items={[
          { name: 'Home', path: '/' },
          { name: 'For freelancers', path: '/freelancers' },
        ]}
      />

      <div className="overflow-hidden bg-cream">
        <PageHero
          layout="split"
          className="relative"
          containerClassName="gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24"
          kicker={
            <div className="inline-flex items-center gap-2 border-brut border-ink bg-sun px-3 py-2 text-on-sun shadow-brut">
              <Laptop aria-hidden className="h-4 w-4" />
              <span className="text-caption font-extrabold uppercase tracking-wide">
                Built for independent professionals
              </span>
            </div>
          }
          title={
            <>
              Do the work.
              <span className="mt-2 block">Send the invoice.</span>
              <span className="mt-2 inline-block -rotate-1 border-brut border-ink bg-mango px-3 pb-2 text-on-mango shadow-brut-lg">
                Get paid.
              </span>
            </>
          }
          titleClassName="mt-7 text-title-l leading-[0.98] sm:text-[4.5rem] lg:text-[5.2rem]"
          copy={
            <>
              You started freelancing to do work you are good at, not to spend
              your evenings preparing invoices and chasing outstanding
              payments. Bagg helps you handle the business side of client work
              with more clarity.
            </>
          }
          copyClassName="mt-8 max-w-xl"
          visual={
            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute inset-0 translate-x-4 translate-y-4 border-brut border-ink bg-pink" />

              <div className="relative border-brut border-ink bg-surface shadow-brut-lg">
                <div className="flex items-center justify-between border-b-2 border-ink bg-mango px-5 py-4 text-on-mango">
                  <div>
                    <p className="text-caption font-extrabold uppercase tracking-wide">
                      Your client workflow
                    </p>
                    <p className="mt-1 text-heading font-extrabold">
                      From work to payment
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center border-brut border-ink bg-surface">
                    <FileText aria-hidden className="h-5 w-5 text-ink" />
                  </span>
                </div>

                <div className="space-y-0 p-5 sm:p-7">
                  <div className="border-brut border-ink bg-cream p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-caption font-extrabold uppercase text-text-muted">
                        Your invoice
                      </span>
                      <span className="border-brut border-ink bg-sun px-2 py-1 text-caption font-extrabold text-on-sun">
                        SENT
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-heading font-extrabold text-ink">
                          Work clearly itemised.
                        </p>
                        <p className="mt-1 text-caption text-text-soft">
                          Scope, amount and due date.
                        </p>
                      </div>
                      <FileText
                        aria-hidden
                        className="h-8 w-8 shrink-0 text-ink"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center py-2">
                    <div className="h-7 border-l-2 border-dashed border-ink" />
                  </div>

                  <div className="border-brut border-ink bg-surface-tint p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-caption font-extrabold uppercase text-text-muted">
                        Payment
                      </span>
                      <span className="border-brut border-ink bg-surface px-2 py-1 text-caption font-extrabold text-ink">
                        TRACKED
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Wallet aria-hidden className="h-7 w-7 text-ink" />
                      <div>
                        <p className="text-heading font-extrabold text-ink">
                          Know what is outstanding.
                        </p>
                        <p className="mt-1 text-caption text-text-soft">
                          Claims, balances and confirmation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center py-2">
                    <div className="h-7 border-l-2 border-dashed border-ink" />
                  </div>

                  <div className="border-brut border-ink bg-mango p-4 text-on-mango">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-caption font-extrabold uppercase">
                        Receipt
                      </span>
                      <Check aria-hidden className="h-5 w-5" />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ReceiptText aria-hidden className="h-7 w-7" />
                      <p className="text-heading font-extrabold">
                        A record worth keeping.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-ink bg-cream px-5 py-3">
                  <p className="text-caption font-bold text-text-soft">
                    One connected get-paid experience.
                  </p>
                </div>
              </div>

              <div className="absolute -right-3 -top-5 rotate-6 border-brut border-ink bg-sun px-4 py-2 text-on-sun shadow-brut sm:-right-6">
                <span className="text-caption font-extrabold uppercase">
                  Less admin
                </span>
              </div>
            </div>
          }
        >
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={buttonStyles({
                size: 'lg',
                mobileFullWidth: true,
              })}
            >
              Start free
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>

            <Link
              href={demoInvoiceHref}
              className={buttonStyles({
                variant: 'outline',
                size: 'lg',
                mobileFullWidth: true,
              })}
            >
              See a client invoice
              <ArrowUpRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-5 text-caption font-semibold text-text-muted">
            Free to start. Three free PDF or email sends each month.
          </p>
        </PageHero>

        <MarketingSection
          spacing="large"
          border="bottom"
          className="bg-mango"
        >
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-wide text-on-mango">
                Independent does not mean unprofessional
              </p>
              <h2 className="mt-3 max-w-lg text-title-l font-extrabold leading-tight text-on-mango">
                Your work is personal. Your business can still be professional.
              </h2>
            </div>

            <p className="max-w-2xl text-body-l leading-relaxed text-on-mango">
              Whether you design, develop, write, consult or provide specialist
              services, clients should know exactly what they are paying for
              and how to pay you. You should know what has been paid and what
              remains outstanding.
            </p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {freelancerTypes.map((item, index) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="border-brut border-ink bg-surface p-5 shadow-brut"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center border-brut border-ink bg-pink text-on-pink">
                      <Icon aria-hidden className="h-5 w-5" />
                    </span>
                    <span className="text-caption font-extrabold text-text-muted">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-heading font-extrabold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-body leading-relaxed text-text-soft">
                    {item.copy}
                  </p>
                </article>
              );
            })}
          </div>
        </MarketingSection>

        <MarketingSection spacing="large" className="bg-cream">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              eyebrow="A simpler way to get paid"
              title="The business side, without the unnecessary admin."
              copy="Bagg brings the key parts of invoicing and payment follow-up into one connected workspace, so you can spend less time reconstructing what happened with each client."
              titleClassName="text-title-l"
              copyClassName="mt-5"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {practicalBenefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <article
                    key={benefit.title}
                    className="border-brut border-ink bg-surface p-5 shadow-brut"
                  >
                    <span className="flex h-11 w-11 items-center justify-center border-brut border-ink bg-mango text-on-mango">
                      <Icon aria-hidden className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-heading font-extrabold text-ink">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-body leading-relaxed text-text-soft">
                      {benefit.copy}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </MarketingSection>

        <MarketingSection
          spacing="large"
          border="both"
          className="bg-surface-sunken"
        >
          <SectionHeading
            eyebrow="How Bagg fits into your work"
            title="Four steps. A clearer payment trail."
            copy="You stay in charge of the client relationship. Bagg helps you manage the documents and payment records around it."
            titleClassName="text-title-l"
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step) => (
              <WorkflowStep key={step.number} {...step} />
            ))}
          </div>

          <div className="mt-7 border-brut border-ink bg-sun p-5 shadow-brut sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <p className="font-extrabold text-on-sun">
                Your client does not need a Bagg account.
              </p>
              <p className="mt-1 text-body text-on-sun">
                Share an invoice link through the channels you already use.
              </p>
            </div>
            <Link
              href="/features/invoicing"
              className={`${buttonStyles({
                variant: 'outline',
                size: 'md',
              })} mt-4 shrink-0 sm:mt-0`}
            >
              Explore invoicing
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </MarketingSection>

        <MarketingSection spacing="large" className="bg-cream">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-text-muted">
                Work across currencies
              </p>
              <h2 className="mt-3 text-title-l font-extrabold leading-tight tracking-tight text-ink">
                Serve clients beyond your own borders.
              </h2>
              <p className="mt-4 text-body-l leading-relaxed text-text-soft">
                Freelancers working with local and international clients can
                keep payment details for the currencies they use and attach
                the appropriate details to each invoice.
              </p>
              <p className="mt-4 text-caption leading-relaxed text-text-muted">
                Supported currencies include NGN, USD, GBP, EUR, GHS, KES and
                ZAR.
              </p>
              <Link
                href="/features/invoicing"
                className={`${buttonStyles({
                  variant: 'link',
                })} mt-5`}
              >
                See how invoicing works
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>

            <div className="border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
              <div className="flex items-center justify-between border-b-2 border-ink pb-5">
                <div>
                  <p className="text-caption font-extrabold uppercase tracking-[0.12em] text-text-muted">
                    Your client invoice
                  </p>
                  <h3 className="mt-2 text-heading font-extrabold text-ink">
                    Payment details
                  </h3>
                </div>
                <Wallet aria-hidden className="h-8 w-8 text-ink" />
              </div>

              <div className="mt-5 space-y-3">
                {[
                  ['NGN', 'Nigerian naira'],
                  ['USD', 'US dollar'],
                  ['GBP', 'British pound'],
                  ['EUR', 'Euro'],
                ].map(([code, name]) => (
                  <div
                    key={code}
                    className="flex items-center justify-between gap-4 border-brut border-ink bg-cream p-3"
                  >
                    <div>
                      <p className="font-extrabold text-ink">{code}</p>
                      <p className="text-caption text-text-muted">{name}</p>
                    </div>
                    <Check
                      aria-hidden
                      className="h-5 w-5 text-ink"
                      strokeWidth={3}
                    />
                  </div>
                ))}
              </div>

              <p className="mt-5 text-caption leading-relaxed text-text-muted">
                Choose the appropriate currency and payment details when
                preparing an invoice.
              </p>
            </div>
          </div>
        </MarketingSection>

        <section className="bg-mango">
          <Container className="py-20 sm:py-28 lg:py-32">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-caption font-extrabold uppercase tracking-wide text-on-mango">
                  More time for the work that matters
                </p>
                <h2 className="mt-3 text-title-l font-extrabold leading-tight text-on-mango">
                  Make your freelance business easier to run.
                </h2>
                <p className="mt-4 max-w-2xl text-body-l leading-relaxed text-on-mango">
                  Create your first invoice, share it with a client and start
                  keeping a clearer record of the money coming into your
                  business.
                </p>
                <p className="mt-4 text-caption font-semibold text-on-mango">
                  Start free. No card required.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/signup"
                  className={buttonStyles({
                    variant: 'ink',
                    size: 'lg',
                    mobileFullWidth: true,
                  })}
                >
                  Start free
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className={buttonStyles({
                    variant: 'outline',
                    size: 'lg',
                    mobileFullWidth: true,
                  })}
                >
                  View pricing
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </div>
    </>
  );
}
