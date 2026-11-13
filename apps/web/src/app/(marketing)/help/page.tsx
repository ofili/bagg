
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CircleHelp,
  FileCheck,
  FileText,
  LifeBuoy,
  Rocket,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { buttonStyles } from '@/components/ui/button';
import { helpCategories, helpFaqs } from '@/content/marketing';
import { marketingMetadata } from '@/lib/metadata';
import {Metadata} from "next";

const CATEGORY_ICONS = {
  'getting-started': Rocket,
  invoices: FileText,
  quotes: FileCheck,
  payments: Wallet,
  reminders: BellRing,
  account: ShieldCheck,
} as const;

const CATEGORY_TONES = [
  'bg-sun text-on-sun',
  'bg-pink text-on-pink',
  'bg-mango text-on-mango',
  'bg-surface-tint text-text',
];

const supportChecklist = [
  'The email address on your Bagg account.',
  'What you were trying to do and the steps you took.',
  'What happened instead, including any error message.',
  'The invoice or quote link, if it is relevant.',
];

export const metadata: Metadata = marketingMetadata({
  title: 'Help Centre for Invoices and Payments',
  description:
      'Find help with getting started, invoices, quotes, payments, reminders and your Bagg account.',
  path: '/help',
});

export default function HelpPage() {
  return (
      <>
        {/* HERO */}
        <section className="overflow-hidden border-b-2 border-ink bg-cream">
          <Container className="py-12 sm:py-16 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <div className="inline-flex -rotate-2 items-center border-brut border-ink bg-sun px-3 py-1.5 text-caption font-extrabold uppercase tracking-[0.14em] text-on-sun shadow-brut">
                  Bagg help centre
                </div>

                <h1 className="mt-7 text-[3.2rem] font-extrabold leading-[0.98] tracking-[-0.065em] text-ink sm:text-[4.5rem] lg:text-[5.25rem]">
                  Need a hand?
                  <span className="block text-mango">
                  Start right here.
                </span>
                </h1>

                <p className="mt-6 max-w-2xl text-body-l leading-relaxed text-text-soft sm:text-lg">
                  Find practical answers about setting up your workspace,
                  sending documents, tracking payments and managing your
                  account. If something is not working as expected, our
                  support team can help.
                </p>
              </div>

              <div className="w-full max-w-sm border-brut border-ink bg-pink p-5 text-on-pink shadow-brut sm:p-6">
                <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border-brut border-ink bg-surface text-ink">
                  <LifeBuoy className="h-5 w-5" aria-hidden="true" />
                </span>

                  <p className="text-caption font-extrabold uppercase tracking-[0.14em]">
                    Need direct support?
                  </p>
                </div>

                <p className="mt-4 text-body leading-relaxed text-on-pink/80">
                  Tell us what happened and include the relevant document
                  link where possible.
                </p>

                <Link
                    href="/contact"
                    className={`${buttonStyles({ variant: 'ink', size: 'lg' })} mt-5 w-full`}
                >
                  Contact support
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* TOPIC NAVIGATION */}
        <section className="border-b-2 border-ink bg-surface">
          <Container className="py-14 sm:py-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                  Browse by topic
                </p>

                <h2 className="mt-3 text-title-l font-extrabold tracking-tight text-ink sm:text-4xl">
                  What are you trying to do?
                </h2>
              </div>

              <p className="max-w-sm text-body text-text-soft">
                Pick the part of Bagg you need help with. We have grouped
                the answers by task.
              </p>
            </div>

            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {helpCategories.map((category, index) => {
                const Icon =
                    CATEGORY_ICONS[
                        category.id as keyof typeof CATEGORY_ICONS
                        ] ?? CircleHelp;

                const tone = CATEGORY_TONES[index % CATEGORY_TONES.length];

                return (
                    <a
                        key={category.id}
                        href={`#${category.id}`}
                        className="group flex min-w-0 flex-col border-brut border-ink bg-cream p-5 shadow-brut transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-brut-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink sm:p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                    <span
                        className={`flex h-11 w-11 items-center justify-center border-brut border-ink shadow-brut ${tone}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>

                        <span className="text-3xl font-extrabold leading-none tracking-[-0.06em] text-ink/20">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                      </div>

                      <h3 className="mt-5 text-title font-extrabold text-ink">
                        {category.title}
                      </h3>

                      <p className="mt-2 flex-1 text-body leading-relaxed text-text-soft">
                        {category.copy}
                      </p>

                      <span className="mt-5 inline-flex items-center gap-2 border-t-2 border-ink pt-3 text-caption font-extrabold uppercase tracking-[0.08em] text-link">
                    Browse answers
                    <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                    />
                  </span>
                    </a>
                );
              })}
            </div>
          </Container>
        </section>

        {/* FAQ CONTENT */}
        <section className="border-b-2 border-ink bg-cream">
          <Container className="py-16 sm:py-20">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
              <div className="lg:sticky lg:top-28">
                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                  Frequently asked
                </p>

                <h2 className="mt-3 text-[2.4rem] font-extrabold leading-[1.02] tracking-[-0.055em] text-ink sm:text-4xl">
                  Clear answers.
                  <span className="block text-mango">
                  No runaround.
                </span>
                </h2>

                <p className="mt-4 max-w-sm text-body-l leading-relaxed text-text-soft">
                  Browse the answers below. Each section follows the way
                  you use Bagg.
                </p>

                <div className="mt-7 border-brut border-ink bg-sun p-4 shadow-brut">
                  <p className="text-caption font-extrabold uppercase tracking-[0.12em] text-on-sun">
                    Still can’t find it?
                  </p>

                  <Link
                      href="/contact"
                      className="mt-2 inline-flex items-center gap-2 font-extrabold text-on-sun underline decoration-2 underline-offset-4 hover:no-underline"
                  >
                    Talk to support
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <div className="min-w-0 space-y-10">
                {helpCategories.map((category, index) => {
                  const faqs = helpFaqs.filter(
                      (faq) => faq.category === category.id,
                  );

                  if (faqs.length === 0) {
                    return null;
                  }

                  return (
                      <section
                          key={category.id}
                          id={category.id}
                          className="scroll-mt-24 border-brut border-ink bg-surface p-5 shadow-brut sm:p-7"
                      >
                        <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4">
                          <div>
                            <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-link">
                              Help topic {String(index + 1).padStart(2, '0')}
                            </p>

                            <h3 className="mt-2 text-title-l font-extrabold text-ink">
                              {category.title}
                            </h3>
                          </div>

                          <span className="flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink bg-sun text-on-sun shadow-brut">
                        <CircleHelp
                            className="h-5 w-5"
                            aria-hidden="true"
                        />
                      </span>
                        </div>

                        <div className="divide-y-2 divide-ink/15">
                          {faqs.map((faq) => (
                              <details
                                  key={faq.question}
                                  className="group py-5"
                              >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body-l font-extrabold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
                                  <span>{faq.question}</span>

                                  <span
                                      className="flex h-9 w-9 shrink-0 items-center justify-center border-brut border-ink bg-mango text-on-mango shadow-brut transition-transform duration-150 group-open:rotate-45"
                                      aria-hidden="true"
                                  >
                              <span className="text-xl leading-none">
                                +
                              </span>
                            </span>
                                </summary>

                                <p className="mt-4 max-w-[65ch] pr-2 text-body leading-relaxed text-text-soft">
                                  {faq.answer}
                                </p>
                              </details>
                          ))}
                        </div>
                      </section>
                  );
                })}
              </div>
            </div>
          </Container>
        </section>

        {/* SUPPORT REQUEST GUIDANCE */}
        <section className="border-b-2 border-ink bg-sun">
          <Container className="grid gap-8 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-on-sun">
                Contact support
              </p>

              <h2 className="mt-3 max-w-xl text-[2.5rem] font-extrabold leading-[1] tracking-[-0.055em] text-on-sun sm:text-5xl">
                Help us get to the answer faster.
              </h2>

              <p className="mt-4 max-w-xl text-body-l leading-relaxed text-on-sun/80">
                A little context helps us investigate the right issue
                without making you repeat yourself.
              </p>

              <Link
                  href="/contact"
                  className={`${buttonStyles({ variant: 'ink', size: 'lg' })} mt-7`}
              >
                Contact support
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
              <h3 className="text-title font-extrabold text-ink">
                Include these details
              </h3>

              <ul className="mt-5 space-y-4">
                {supportChecklist.map((item) => (
                    <li
                        key={item}
                        className="flex items-start gap-3 text-body-l text-text-soft"
                    >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-brut border-ink bg-mango text-caption font-extrabold text-on-mango">
                    ✓
                  </span>

                      <span>{item}</span>
                    </li>
                ))}
              </ul>

              <p className="mt-6 border-t-2 border-ink pt-4 text-caption leading-relaxed text-text-muted">
                Never send your password, one-time sign-in code or full
                payment-card details to support.
              </p>
            </div>
          </Container>
        </section>
      </>
  );
}
