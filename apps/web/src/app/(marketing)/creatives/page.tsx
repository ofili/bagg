
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BriefcaseBusiness,
  Camera,
  Check,
  Code2,
  FileCheck,
  FileText,
  Palette,
  PenLine,
  ReceiptText,
  Sparkles,
  Wallet,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { MarketingSection } from '@/components/marketing/marketing-section';
import { SectionHeading } from '@/components/marketing/section-heading';
import { PageHero } from '@/components/marketing/page-hero';
import { MarketingBreadcrumbStructuredData } from '@/components/marketing/marketing-structured-data';
import { buttonStyles } from '@/components/ui/button';
import { creativeRoles } from '@/content/marketing';
import { marketingMetadata } from '@/lib/metadata';
import { demoInvoiceHref } from '@/lib/site';

const roleIcons = [
  Palette,
  Code2,
  PenLine,
  Camera,
  BriefcaseBusiness,
  Sparkles,
];

export const metadata: Metadata = marketingMetadata({
  title: 'Invoicing and Payment Management for Creatives',
  description:
    'From quotes and professional invoices to payment tracking and receipts, Bagg helps independent creatives manage the business side of client work.',
  path: '/creatives',
});

const workflow = [
  {
    number: '01',
    icon: FileCheck,
    title: 'Agree the work and fees',
    copy: 'Prepare a professional quote with the services, line items and pricing your client needs to review.',
    link: 'Explore quotes',
    href: '/features/quotes',
    tone: 'bg-pink text-on-pink',
  },
  {
    number: '02',
    icon: FileText,
    title: 'Turn accepted work into an invoice',
    copy: 'Convert an accepted quote into an invoice without entering the commercial details all over again.',
    link: 'Explore invoicing',
    href: '/features/invoicing',
    tone: 'bg-sun text-on-sun',
  },
  {
    number: '03',
    icon: Wallet,
    title: 'Track what comes in',
    copy: 'See invoice progress, outstanding balances and payment claims. Keep payment follow-up visible.',
    link: 'Explore payments',
    href: '/features/payments',
    tone: 'bg-mango text-on-mango',
  },
  {
    number: '04',
    icon: ReceiptText,
    title: 'Keep a record of payment',
    copy: 'Confirm payments and issue receipts connected to the original invoice.',
    link: 'Explore receipts',
    href: '/features/receipts',
    tone: 'bg-surface-tint text-text',
  },
];

const outcomes = [
  {
    number: '01',
    title: 'Present your work professionally',
    copy: 'Give clients clear quotes and invoices with your business identity, services, pricing and payment details.',
    icon: FileText,
    href: '/features/quotes',
    link: 'Explore quotes',
  },
  {
    number: '02',
    title: 'Make it easier for clients to pay',
    copy: 'Share an invoice link with the payment information your client needs, through the channels you already use.',
    icon: Wallet,
    href: '/features/payments',
    link: 'Explore payments',
  },
  {
    number: '03',
    title: 'Spend less time chasing',
    copy: 'Keep payment progress visible and let scheduled reminders handle routine follow-up.',
    icon: BellRing,
    href: '/features/payments',
    link: 'See payment tracking',
  },
  {
    number: '04',
    title: 'Keep your financial records connected',
    copy: 'Confirm payments and issue receipts that connect back to the original invoice.',
    icon: ReceiptText,
    href: '/features/receipts',
    link: 'Explore receipts',
  },
];

export default function CreativesPage() {
  return (
    <>
      <MarketingBreadcrumbStructuredData
        items={[
          { name: 'Home', path: '/' },
          { name: 'For creatives', path: '/creatives' },
        ]}
      />

      <div className="overflow-hidden bg-cream">
        <PageHero
          layout="split"
          className="relative"
          containerClassName="gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24"
          kicker={
            <div className="inline-flex items-center gap-2 border-brut border-ink bg-sun px-3 py-2 text-on-sun shadow-brut">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              <span className="text-caption font-extrabold uppercase tracking-wide">
                For independent creatives and professionals
              </span>
            </div>
          }
          title={
            <>
              Make great work.
              <span className="mt-2 block">Get paid</span>
              <span className="mt-2 inline-block -rotate-1 border-brut border-ink bg-mango px-3 pb-2 text-on-mango shadow-brut-lg">
                without the chase.
              </span>
            </>
          }
          titleClassName="mt-7 text-title-l leading-[0.98] sm:text-[4.5rem] lg:text-[5.2rem]"
          copy={
            <>
              You have the work to do, the clients to serve and the business
              to run. Bagg helps you agree fees, invoice professionally, make
              payment easier and keep track of what comes in.
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
                      The Bagg workflow
                    </p>
                    <p className="mt-1 text-heading font-extrabold">
                      From quote to payment
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center border-brut border-ink bg-surface">
                    <FileText aria-hidden="true" className="h-5 w-5 text-ink" />
                  </span>
                </div>

                <div className="space-y-0 p-5 sm:p-7">
                  <div className="border-brut border-ink bg-cream p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-caption font-extrabold uppercase text-text-muted">
                        Quote
                      </span>
                      <span className="border-brut border-ink bg-sun px-2 py-1 text-caption font-extrabold text-on-sun">
                        FOR REVIEW
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-heading font-extrabold text-ink">
                          Agree the work.
                        </p>
                        <p className="mt-1 text-caption text-text-soft">
                          Services, pricing and client response.
                        </p>
                      </div>
                      <FileCheck
                        aria-hidden="true"
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
                        Invoice
                      </span>
                      <span className="border-brut border-ink bg-surface px-2 py-1 text-caption font-extrabold text-ink">
                        ISSUED
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Wallet aria-hidden="true" className="h-7 w-7 text-ink" />
                      <div>
                        <p className="text-heading font-extrabold text-ink">
                          Make payment clear.
                        </p>
                        <p className="mt-1 text-caption text-text-soft">
                          Amount, due date and payment details.
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
                        Payment record
                      </span>
                      <Check aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ReceiptText aria-hidden="true" className="h-7 w-7" />
                      <p className="text-heading font-extrabold">
                        Confirmed and receipted.
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
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
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
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
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
                Different kinds of creative work
              </p>
              <h2 className="mt-3 max-w-lg text-title-l font-extrabold leading-tight text-on-mango">
                Your craft is different. Getting paid shouldn&apos;t be.
              </h2>
            </div>

            <p className="max-w-2xl text-body-l leading-relaxed text-on-mango">
              Whether you work independently, advise clients or run a small
              creative business, the commercial basics still matter: clear
              pricing, professional documents and reliable payment records.
            </p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {creativeRoles.map((role, index) => {
              const Icon = roleIcons[index] ?? Sparkles;

              return (
                <article
                  key={role.title}
                  className="border-brut border-ink bg-surface p-5 shadow-brut"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center border-brut border-ink bg-pink text-on-pink">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="text-caption font-extrabold text-text-muted">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-heading font-extrabold capitalize text-ink">
                    {role.title}
                  </h3>
                  <p className="mt-2 text-body leading-relaxed text-text-soft">
                    {role.copy}
                  </p>
                </article>
              );
            })}
          </div>
        </MarketingSection>

        <MarketingSection spacing="large" className="bg-cream">
          <SectionHeading
            eyebrow="A connected commercial workflow"
            title="From agreeing the work to getting paid."
            copy="The work may be different. The need to agree fees, invoice clients and keep track of payments is shared."
            titleClassName="text-title-l"
            copyClassName="mt-5"
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.number}
                  className="flex flex-col border-brut border-ink bg-surface p-5 shadow-brut"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span
                      className={`flex h-12 w-12 items-center justify-center border-brut border-ink ${step.tone}`}
                    >
                      <Icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <span className="text-caption font-extrabold text-text-muted">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mt-6 text-heading font-extrabold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 flex-1 text-body leading-relaxed text-text-soft">
                    {step.copy}
                  </p>

                  <Link
                    href={step.href}
                    className="mt-5 inline-flex items-center gap-2 text-label font-extrabold text-ink"
                  >
                    {step.link}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </MarketingSection>

        <MarketingSection
          spacing="large"
          border="both"
          className="bg-surface-sunken"
        >
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              eyebrow="What Bagg helps you do"
              title="The business side, handled with more clarity."
              copy="Bagg is not here to change how you create. It helps make the money side of client work easier to manage."
              titleClassName="text-title-l"
              copyClassName="mt-5"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {outcomes.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.number}
                    href={item.href}
                    className="group border-brut border-ink bg-surface p-5 shadow-brut transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center border-brut border-ink bg-mango text-on-mango">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="text-caption font-extrabold text-text-muted">
                        {item.number}
                      </span>
                    </div>
                    <h3 className="mt-5 text-heading font-extrabold text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-body leading-relaxed text-text-soft">
                      {item.copy}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-label font-extrabold text-ink">
                      {item.link}
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
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
                If you work with local and international clients, keep payment
                details for the currencies you use and attach the appropriate
                details to each invoice.
              </p>
              <p className="mt-4 text-caption leading-relaxed text-text-muted">
                Supported currencies include NGN, USD, GBP, EUR, GHS, KES and
                ZAR.
              </p>
              <Link
                href="/features/invoicing"
                className={`${buttonStyles({ variant: 'link' })} mt-5`}
              >
                See how invoicing works
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
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
                <Wallet aria-hidden="true" className="h-8 w-8 text-ink" />
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
                      aria-hidden="true"
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
              <div>
                <p className="text-caption font-extrabold uppercase tracking-wide text-on-mango">
                  Professional billing
                </p>
                <h2 className="mt-3 max-w-3xl text-title-l font-extrabold leading-tight text-on-mango">
                  Spend less time chasing. Spend more time creating.
                </h2>
                <p className="mt-4 max-w-2xl text-body-l leading-relaxed text-on-mango">
                  Agree the work, create invoices clients can understand,
                  provide simple payment instructions and keep your financial
                  records organised.
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
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
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
