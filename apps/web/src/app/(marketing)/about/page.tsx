
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CircleCheck,
  FileText,
  ShieldCheck,
  Users,
  Wallet,
  ReceiptText,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { buttonStyles } from '@/components/ui/button';
import { marketingMetadata } from '@/lib/metadata';
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
  title: 'About Bagg',
  description:
      'Discover why Bagg is building a simpler invoicing and payment workspace for African freelancers, consultants and creative businesses.',
  path: '/about',
});

const workflow = [
  {
    number: '01',
    title: 'Agree on the work.',
    copy: 'Set out the scope, price and expectations in a quote before the work begins.',
    icon: FileText,
    tone: 'bg-pink text-on-pink',
  },
  {
    number: '02',
    title: 'Make the ask clear.',
    copy: 'Create an invoice with the right currency, due date and payment details.',
    icon: FileText,
    tone: 'bg-mango text-on-mango',
  },
  {
    number: '03',
    title: 'Keep payment moving.',
    copy: 'Share one link, track payment progress and follow up without awkwardness.',
    icon: Wallet,
    tone: 'bg-sun text-on-sun',
  },
  {
    number: '04',
    title: 'Close the loop.',
    copy: 'Confirm payments, keep the record and issue a receipt.',
    icon: ReceiptText,
    tone: 'bg-surface-tint text-text',
  },
];

const principles = [
  {
    number: '01',
    icon: FileText,
    title: 'Money first. Joy around.',
    copy: 'The amount, the fee and the next step stay plain. The colour and the small moments of delight live around the edges.',
    tone: 'bg-sun text-on-sun',
  },
  {
    number: '02',
    icon: Users,
    title: 'Clients should not need another account.',
    copy: 'Your client should be able to open a link, understand what to pay and take the next step without creating another account.',
    tone: 'bg-pink text-on-pink',
  },
  {
    number: '03',
    icon: CircleCheck,
    title: 'Status is a word, not just a colour.',
    copy: 'Sent, viewed, claimed, part paid and paid. You should never have to guess what a colour or icon means.',
    tone: 'bg-mango text-on-mango',
  },
  {
    number: '04',
    icon: ShieldCheck,
    title: 'Never claim what is not built.',
    copy: 'If a feature is coming, we say so. If a security safeguard is not live, we do not put it on a badge.',
    tone: 'bg-surface-tint text-text',
  },
];

const commitments = [
  'Borrowed logos or invented customer stories.',
  'A price hidden until after you have committed.',
  'A security badge for something we have not built.',
  'A reminder that bullies your client.',
];

export default function AboutPage() {
  return (
      <>
        {/* HERO */}
        <section className="overflow-hidden border-b-2 border-ink bg-cream">
          <Container className="py-12 sm:py-16 lg:py-20">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="min-w-0">
                <div className="inline-flex -rotate-2 items-center border-brut border-ink bg-sun px-3 py-1.5 text-caption font-extrabold uppercase tracking-[0.14em] text-on-sun shadow-brut">
                  Why Bagg exists
                </div>

                <h1 className="mt-7 max-w-3xl text-[3.2rem] font-extrabold leading-[0.98] tracking-[-0.065em] text-ink sm:text-[4.5rem] lg:text-[5.25rem]">
                  Do the work.
                  <span className="block text-mango">
                  We’ll help with
                </span>
                  <span className="block">the getting paid.</span>
                </h1>

                <p className="mt-6 max-w-xl text-body-l leading-relaxed text-text-soft sm:text-lg">
                  Bagg is an invoicing and get-paid workspace for African
                  freelancers and creators. We bring quotes, invoices,
                  payment follow-up and receipts into one clearer process.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link href="/signup" className={buttonStyles({ size: 'lg' })}>
                    Start free
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>

                  <Link
                      href="/features"
                      className={buttonStyles({ variant: 'link' })}
                  >
                    Explore the product
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>

                <p className="mt-7 text-caption font-bold uppercase tracking-[0.12em] text-text-muted">
                  Built for independent work · Designed around getting paid
                </p>
              </div>

              {/* WORKFLOW COMPOSITION */}
              <div className="relative mx-auto w-full max-w-[34rem] pb-5 pr-5">
                <div className="absolute right-0 top-0 h-full w-full rotate-3 border-brut border-ink bg-pink" />

                <div className="relative border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                  <div className="flex items-center justify-between gap-3 border-b-2 border-ink pb-4">
                  <span className="text-caption font-extrabold uppercase tracking-[0.14em]">
                    The Bagg workflow
                  </span>
                    <span className="border-brut border-ink bg-sun px-2 py-1 text-[10px] font-extrabold uppercase text-on-sun">
                    04 steps
                  </span>
                  </div>

                  <div className="pt-3">
                    {workflow.map((step, index) => {
                      const Icon = step.icon;

                      return (
                          <div
                              key={step.number}
                              className="relative flex gap-4 py-4"
                          >
                            {index !== workflow.length - 1 && (
                                <span
                                    aria-hidden="true"
                                    className="absolute bottom-[-0.5rem] left-5 top-14 w-0.5 bg-ink/25"
                                />
                            )}

                            <span
                                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink shadow-brut ${step.tone}`}
                            >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>

                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-ink">
                                {step.title}
                              </p>
                              <p className="mt-1 text-caption leading-relaxed text-text-muted">
                                {step.copy}
                              </p>
                            </div>

                            <span className="pt-1 text-caption font-extrabold text-text-muted">
                          {step.number}
                        </span>
                          </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t-2 border-ink pt-4">
                  <span className="text-caption font-bold text-text-soft">
                    From agreement to payment record
                  </span>
                    <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
                  </div>
                </div>

                <div className="absolute -bottom-1 -left-2 -rotate-3 border-brut border-ink bg-sun px-3 py-2 text-caption font-extrabold uppercase text-on-sun shadow-brut">
                  Less chasing.
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* THE PROBLEM */}
        <section className="border-b-2 border-ink bg-surface">
          <Container className="grid gap-8 py-16 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                The problem we care about
              </p>

              <h2 className="mt-3 max-w-lg text-[2.3rem] font-extrabold leading-[1.02] tracking-[-0.055em] text-ink sm:text-4xl">
                Independent work is already a full-time job.
              </h2>
            </div>

            <div className="max-w-3xl space-y-5 text-body-l leading-relaxed text-text-soft">
              <p>
                Independent work asks you to be the maker, the salesperson,
                the project manager and the finance team. You deliver the
                work, then still have to prepare the invoice, explain how to
                pay, check whether it was opened, follow up when it is late
                and keep the records straight.
              </p>

              <p>
                Those small administrative tasks add up. They take attention
                away from the work clients hired you to do, and they can make
                conversations about money more awkward than they need to be.
              </p>

              <p className="font-bold text-ink">
                Bagg exists to make the commercial side of independent work
                more organised, visible and easier to follow through.
              </p>
            </div>
          </Container>
        </section>

        {/* PRINCIPLES */}
        <section className="border-b-2 border-ink bg-cream">
          <Container className="py-16 sm:py-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                  What guides the product
                </p>

                <h2 className="mt-3 text-[2.3rem] font-extrabold leading-[1.02] tracking-[-0.055em] text-ink sm:text-4xl">
                  A few rules we build by.
                </h2>
              </div>

              <p className="max-w-sm text-body text-text-soft">
                The product should feel straightforward when the work gets
                complicated.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {principles.map((principle) => {
                const Icon = principle.icon;

                return (
                    <article
                        key={principle.number}
                        className="border-brut border-ink bg-surface p-6 shadow-brut sm:p-7"
                    >
                      <div className="flex items-start justify-between gap-4">
                    <span
                        className={`flex h-11 w-11 items-center justify-center border-brut border-ink shadow-brut ${principle.tone}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>

                        <span className="text-4xl font-extrabold leading-none tracking-[-0.06em] text-ink/20">
                      {principle.number}
                    </span>
                      </div>

                      <h3 className="mt-6 text-title font-extrabold tracking-tight text-ink">
                        {principle.title}
                      </h3>

                      <p className="mt-2 max-w-xl text-body-l leading-relaxed text-text-soft">
                        {principle.copy}
                      </p>
                    </article>
                );
              })}
            </div>
          </Container>
        </section>

        {/* COMMITMENTS */}
        <section className="border-b-2 border-ink bg-surface">
          <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                What we won't do
              </p>

              <h2 className="mt-3 max-w-lg text-[2.3rem] font-extrabold leading-[1.02] tracking-[-0.055em] text-ink sm:text-4xl">
                Trust is built in the details.
              </h2>

              <p className="mt-4 max-w-md text-body-l leading-relaxed text-text-soft">
                How we communicate about money and product capabilities
                matters just as much as the interface.
              </p>
            </div>

            <ul className="space-y-4">
              {commitments.map((item) => (
                  <li
                      key={item}
                      className="flex items-start gap-4 border-b-2 border-ink/15 pb-4 text-body-l text-text-soft last:border-0"
                  >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border-brut border-ink bg-mango text-on-mango shadow-brut">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                    <span>{item}</span>
                  </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* AFRICAN CONTEXT */}
        <section className="border-b-2 border-ink bg-sun">
          <Container className="grid gap-8 py-14 sm:py-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-on-sun">
                Built with context
              </p>

              <h2 className="mt-3 max-w-xl text-[2.5rem] font-extrabold leading-[1] tracking-[-0.055em] text-on-sun sm:text-5xl">
                Made for the realities of independent work in Africa.
              </h2>
            </div>

            <div className="max-w-2xl space-y-4 text-body-l leading-relaxed text-on-sun/80">
              <p>
                Independent professionals work across currencies, payment
                methods, client expectations and communication channels.
                The tools they use should respect that context rather than
                force every business into the same template.
              </p>

              <p>
                We are building Bagg around practical workflows: clear
                documents, shareable links, payment visibility and records
                that help you close the loop.
              </p>
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="bg-cream py-16 sm:py-20">
          <Container>
            <div className="relative border-brut border-ink bg-mango p-7 text-on-mango shadow-brut-lg sm:p-10 lg:p-12">
              <div className="absolute -right-2 -top-3 rotate-3 border-brut border-ink bg-pink px-3 py-2 text-caption font-extrabold uppercase text-on-pink shadow-brut">
                Your next invoice
              </div>

              <div className="max-w-2xl">
                <p className="text-caption font-extrabold uppercase tracking-[0.16em]">
                  Make the next step simpler
                </p>

                <h2 className="mt-3 text-[2.5rem] font-extrabold leading-[1] tracking-[-0.055em] sm:text-5xl">
                  Spend less time chasing. Keep more time for the work.
                </h2>

                <p className="mt-4 max-w-xl text-body-l text-on-mango/80">
                  Start with the next invoice and build a clearer get-paid
                  process from there.
                </p>

                <Link
                    href="/signup"
                    className={`${buttonStyles({ variant: 'ink', size: 'lg' })} mt-7`}
                >
                  Start free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </>
  );
}
