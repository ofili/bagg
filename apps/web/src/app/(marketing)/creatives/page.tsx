
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BriefcaseBusiness,
  Camera,
  Check,
  Code2,
  FileCheck2,
  FileText,
  Palette,
  PenLine,
  ReceiptText,
  Sparkles,
  Wallet,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { marketingMetadata } from '@/lib/metadata';
import { creativeRoles } from '@/content/marketing';
import { demoInvoiceHref } from '@/lib/site';

const roleIcons = [
  Palette,
  Code2,
  PenLine,
  Camera,
  BriefcaseBusiness,
  Sparkles,
];

export const metadata = marketingMetadata({
  title: 'for creatives',
  description:
      'Professional invoicing, payment tracking and receipts for African freelancers, consultants and creative businesses.',
  path: '/creatives',
});

const outcomes = [
  {
    number: '01',
    title: 'Look professional',
    copy: 'Create clear invoices that carry your business identity, pricing and payment details.',
    icon: FileText,
    href: '/features/invoicing',
    link: 'Explore invoicing',
  },
  {
    number: '02',
    title: 'Make payment easier',
    copy: 'Give clients one shareable invoice link with the information they need to pay you.',
    icon: Wallet,
    href: '/features/payments',
    link: 'Explore payments',
  },
  {
    number: '03',
    title: 'Stop chasing manually',
    copy: 'Keep payment progress visible and let scheduled reminders handle routine follow-up.',
    icon: BellRing,
    href: '/features/payments',
    link: 'See payment tracking',
  },
  {
    number: '04',
    title: 'Keep the record',
    copy: 'Confirm payments and issue receipts that connect back to the original invoice.',
    icon: ReceiptText,
    href: '/features/receipts',
    link: 'Explore receipts',
  },
];

const workflow = [
  {
    number: '01',
    label: 'Create',
    title: 'Make the invoice.',
    copy: 'Add your client, work, amount, currency and due date.',
  },
  {
    number: '02',
    label: 'Share',
    title: 'Send one link.',
    copy: 'Share through WhatsApp, email or wherever you already talk to clients.',
  },
  {
    number: '03',
    label: 'Collect',
    title: 'Know what happens.',
    copy: 'Track views, payment claims, balances and confirmed payments.',
  },
  {
    number: '04',
    label: 'Record',
    title: 'Keep the receipt.',
    copy: 'Give your client a clear record when payment is confirmed.',
  },
];

const principles = [
  'Your client sees a clear invoice, not a confusing payment request.',
  'Your payment instructions stay connected to the invoice.',
  'You can see what is outstanding without searching through chats.',
  'Payment claims remain subject to your confirmation.',
  'Receipts follow confirmed payments.',
];

export default function CreativesPage() {
  return (
      <main className="overflow-hidden bg-cream">
        {/* HERO */}
        <section className="relative border-b-2 border-ink bg-cream">
          <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 border-2 border-ink bg-sun px-3 py-2 shadow-brut">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span className="text-caption font-extrabold uppercase tracking-wide text-ink">
                For people who make things
              </span>
              </div>

              <h1 className="mt-7 max-w-3xl text-title-l leading-[0.98] text-ink sm:text-[4.5rem] lg:text-[5.2rem]">
                Make great work.
                <span className="mt-2 block">Get paid</span>
                <span className="mt-2 inline-block -rotate-1 border-2 border-ink bg-mango px-3 pb-2 shadow-brut-lg">
                without the chase.
              </span>
              </h1>

              <p className="mt-8 max-w-xl text-body-l text-text-soft">
                You have the work to do, the clients to serve and the business
                to run. Bagg helps you invoice professionally, make payment
                easier and keep track of what comes in.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                    href="/signup"
                    className="inline-flex min-h-12 items-center justify-center gap-3 border-2 border-ink bg-ink px-6 text-label font-extrabold text-surface shadow-brut transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
                >
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                    href={demoInvoiceHref}
                    className="inline-flex min-h-12 items-center justify-center gap-3 border-2 border-ink bg-surface px-6 text-label font-extrabold text-ink transition-colors hover:bg-mango focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
                >
                  See a client invoice <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <p className="mt-5 text-caption font-semibold text-text-muted">
                Free to start. Three free PDF or email sends each month.
              </p>
            </div>

            {/* Product-led hero artefact */}
            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute inset-0 translate-x-4 translate-y-4 border-2 border-ink bg-pink" />

              <div className="relative border-2 border-ink bg-surface shadow-brut-lg">
                <div className="flex items-center justify-between border-b-2 border-ink bg-mango px-5 py-4">
                  <div>
                    <p className="text-caption font-extrabold uppercase tracking-wide text-ink">
                      The Bagg workflow
                    </p>
                    <p className="mt-1 text-heading text-ink">
                      From invoice to payment
                    </p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-surface">
                  <FileText className="h-5 w-5 text-ink" />
                </span>
                </div>

                <div className="space-y-0 p-5 sm:p-7">
                  <div className="border-2 border-ink bg-cream p-4">
                    <div className="flex items-center justify-between gap-3">
                    <span className="text-caption font-extrabold uppercase text-text-muted">
                      Invoice
                    </span>
                      <span className="border-2 border-ink bg-sun px-2 py-1 text-caption font-extrabold text-ink">
                      SENT
                    </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-heading text-ink">Your work, itemised.</p>
                        <p className="mt-1 text-caption text-text-soft">
                          Clear scope. Clear amount. Clear due date.
                        </p>
                      </div>
                      <FileText className="h-8 w-8 shrink-0 text-ink" />
                    </div>
                  </div>

                  <div className="flex justify-center py-2">
                    <div className="h-7 border-l-2 border-dashed border-ink" />
                  </div>

                  <div className="border-2 border-ink bg-surface-tint p-4">
                    <div className="flex items-center justify-between gap-3">
                    <span className="text-caption font-extrabold uppercase text-text-muted">
                      Payment
                    </span>
                      <span className="border-2 border-ink bg-surface px-2 py-1 text-caption font-extrabold text-ink">
                      TRACKED
                    </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Wallet className="h-7 w-7 text-ink" />
                      <div>
                        <p className="text-heading text-ink">Know where you stand.</p>
                        <p className="mt-1 text-caption text-text-soft">
                          Claims, balances and confirmation.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center py-2">
                    <div className="h-7 border-l-2 border-dashed border-ink" />
                  </div>

                  <div className="border-2 border-ink bg-mango p-4">
                    <div className="flex items-center justify-between gap-3">
                    <span className="text-caption font-extrabold uppercase text-ink">
                      Receipt
                    </span>
                      <Check className="h-5 w-5 text-ink" />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ReceiptText className="h-7 w-7 text-ink" />
                      <p className="text-heading text-ink">
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

              <div className="absolute -right-3 -top-5 rotate-6 border-2 border-ink bg-sun px-4 py-2 shadow-brut sm:-right-6">
              <span className="text-caption font-extrabold uppercase text-ink">
                Less admin
              </span>
              </div>
            </div>
          </Container>
        </section>

        {/* AUDIENCE TYPES */}
        <section className="border-b-2 border-ink bg-mango">
          <Container className="py-14 sm:py-16">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-caption font-extrabold uppercase tracking-wide text-ink">
                  Different kinds of creative work
                </p>
                <h2 className="mt-3 max-w-lg text-title-l text-ink">
                  Your craft is different. Getting paid shouldn't be.
                </h2>
              </div>
              <p className="max-w-2xl text-body-l text-ink">
                Whether you work independently, advise clients or run a small
                studio, the commercial basics still matter: clear pricing,
                professional invoices and reliable payment records.
              </p>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {creativeRoles.map((role, index) => {
                const Icon = roleIcons[index] ?? Sparkles;

                return (
                    <div
                        key={role.title}
                        className="border-2 border-ink bg-surface p-5 shadow-brut"
                    >
                      <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-pink">
                      <Icon className="h-5 w-5 text-ink" />
                    </span>
                        <span className="text-caption font-extrabold text-text-muted">
                      0{index + 1}
                    </span>
                      </div>
                      <h3 className="mt-5 text-heading text-ink">{role.title}</h3>
                      <p className="mt-2 text-body text-text-soft">{role.copy}</p>
                    </div>
                );
              })}
            </div>
          </Container>
        </section>

        {/* CORE VALUE */}
        <section className="border-b-2 border-ink bg-cream">
          <Container className="py-16 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                  What Bagg helps you do
                </p>
                <h2 className="mt-3 text-title-l text-ink">
                  The business side, handled with more clarity.
                </h2>
                <p className="mt-5 text-body-l text-text-soft">
                  Bagg is not here to change how you create. It helps make the
                  money side of client work easier to manage.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {outcomes.map((item) => {
                  const Icon = item.icon;

                  return (
                      <Link
                          key={item.number}
                          href={item.href}
                          className="group border-2 border-ink bg-surface p-5 shadow-brut transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
                      >
                        <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-mango">
                        <Icon className="h-5 w-5 text-ink" />
                      </span>
                          <span className="text-caption font-extrabold text-text-muted">
                        {item.number}
                      </span>
                        </div>
                        <h3 className="mt-5 text-heading text-ink">{item.title}</h3>
                        <p className="mt-2 text-body text-text-soft">{item.copy}</p>
                        <span className="mt-5 inline-flex items-center gap-2 text-label font-extrabold text-ink">
                      {item.link}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                      </Link>
                  );
                })}
              </div>
            </div>
          </Container>
        </section>

        {/* WORKFLOW */}
        <section className="border-b-2 border-ink bg-surface">
          <Container className="py-16 sm:py-20">
            <div className="max-w-2xl">
              <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                How it works
              </p>
              <h2 className="mt-3 text-title-l text-ink">
                Four steps. A much clearer payment trail.
              </h2>
              <p className="mt-4 text-body-l text-text-soft">
                From the moment you prepare an invoice to the moment payment is
                confirmed, keep the important details connected.
              </p>
            </div>

            <div className="mt-10 grid gap-0 border-2 border-ink md:grid-cols-4">
              {workflow.map((step, index) => (
                  <div
                      key={step.number}
                      className={[
                        'p-5 sm:p-6',
                        index > 0 ? 'border-t-2 border-ink md:border-l-2 md:border-t-0' : '',
                        index % 2 === 0 ? 'bg-cream' : 'bg-surface-tint',
                      ].join(' ')}
                  >
                    <p className="text-caption font-extrabold text-text-muted">
                      STEP {step.number}
                    </p>
                    <p className="mt-5 text-caption font-extrabold uppercase tracking-wide text-text-soft">
                      {step.label}
                    </p>
                    <h3 className="mt-2 text-heading text-ink">{step.title}</h3>
                    <p className="mt-2 text-body text-text-soft">{step.copy}</p>
                  </div>
              ))}
            </div>
          </Container>
        </section>

        {/* TRUST / PRODUCT PRINCIPLES */}
        <section className="border-b-2 border-ink bg-pink">
          <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-wide text-ink">
                Clear by design
              </p>
              <h2 className="mt-3 text-title-l text-ink">
                Your money. Your client. Your record.
              </h2>
              <p className="mt-5 text-body-l text-ink">
                Bagg helps you request, track and record payments. Your client
                pays you directly using the payment instructions or payment
                provider you choose. Bagg does not hold your client’s money.
              </p>
            </div>

            <ul className="space-y-3">
              {principles.map((principle) => (
                  <li
                      key={principle}
                      className="flex gap-3 border-2 border-ink bg-surface p-4"
                  >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-ink bg-mango">
                  <Check className="h-4 w-4 text-ink" />
                </span>
                    <span className="text-body font-semibold text-ink">
                  {principle}
                </span>
                  </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* ROADMAP / FUTURE */}
        <section className="border-b-2 border-ink bg-cream">
          <Container className="py-16 sm:py-20">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                  Where we're going
                </p>
                <h2 className="mt-3 text-title-l text-ink">
                  More of the client journey, over time.
                </h2>
              </div>
              <div>
                <p className="text-body-l text-text-soft">
                  Invoicing and getting paid are the foundation. We are working
                  towards helping creative businesses manage more of the client
                  engagement around that work.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    'Contracts and agreements',
                    'Projects and milestones',
                    'Client delivery and approvals',
                    'Connected file handover',
                  ].map((item) => (
                      <div
                          key={item}
                          className="flex items-center gap-3 border-2 border-dashed border-ink bg-surface p-4"
                      >
                        <Sparkles className="h-5 w-5 shrink-0 text-ink" />
                        <span className="text-body font-bold text-ink">{item}</span>
                        <span className="ml-auto text-caption font-extrabold uppercase text-text-muted">
                      Planned
                    </span>
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* FINAL CTA */}
        <section className="bg-mango">
          <Container className="py-16 sm:py-20">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-caption font-extrabold uppercase tracking-wide text-ink">
                  Make room for the work
                </p>
                <h2 className="mt-3 max-w-3xl text-title-l text-ink">
                  Do the work. Send the invoice. Get paid.
                </h2>
                <p className="mt-4 max-w-2xl text-body-l text-ink">
                  Start with a professional invoice and one clear link for your
                  client. Bagg helps you keep the follow-up and payment record
                  together.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                    href="/signup"
                    className="inline-flex min-h-12 items-center justify-center gap-3 border-2 border-ink bg-ink px-6 text-label font-extrabold text-surface shadow-brut transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
                >
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                    href="/pricing"
                    className="inline-flex min-h-12 items-center justify-center border-2 border-ink bg-surface px-6 text-label font-extrabold text-ink hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>
  );
}
