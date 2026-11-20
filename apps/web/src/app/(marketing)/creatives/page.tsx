
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BriefcaseBusiness,
  Camera,
  Check,
  Code2,
  FileText,
  Palette,
  PenLine,
  ReceiptText,
  Sparkles,
  Wallet,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';
import { buttonStyles } from '@/components/ui/button';
import { marketingMetadata } from '@/lib/metadata';
import { creativeRoles } from '@/content/marketing';
import { demoInvoiceHref } from '@/lib/site';
import { MarketingBreadcrumbStructuredData } from '@/components/marketing/marketing-structured-data';
import { Metadata } from 'next';

const roleIcons = [
  Palette,
  Code2,
  PenLine,
  Camera,
  BriefcaseBusiness,
  Sparkles,
];

export const metadata: Metadata = marketingMetadata({
  title: 'Invoicing Software for Creative Professionals',
  description:
      'Make professional invoices, simplify client payments and keep track of receipts. Bagg helps creative ' +
      'professionals manage the business side of their work.',
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

export default function CreativesPage() {
  return (
      <>
        <MarketingBreadcrumbStructuredData items={[
        {name: 'Home', path: '/'},
        {name: 'Creatives', path: '/creatives'},
      ]}/>
        <div className="overflow-hidden bg-cream">
          {/* HERO */}
          <PageHero
            layout="split"
            className="relative"
            containerClassName="gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24"
            kicker={
              <div className="inline-flex items-center gap-2 border-brut border-ink bg-sun px-3 py-2 text-on-sun shadow-brut">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span className="text-caption font-extrabold uppercase tracking-wide">
                  For people who make things
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
                You have the work to do, the clients to serve and the business to run.
                Bagg helps you invoice professionally, make payment easier and keep
                track of what comes in.
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
                      <p className="mt-1 text-heading">From invoice to payment</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center border-brut border-ink bg-surface">
                      <FileText className="h-5 w-5 text-ink" />
                    </span>
                  </div>

                  <div className="space-y-0 p-5 sm:p-7">
                    <div className="border-brut border-ink bg-cream p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-caption font-extrabold uppercase text-text-muted">
                          Invoice
                        </span>
                        <span className="rounded-full border-brut border-ink bg-sun px-2 py-1 text-caption font-extrabold text-on-sun">
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

                    <div className="border-brut border-ink bg-surface-tint p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-caption font-extrabold uppercase text-text-muted">
                          Payment
                        </span>
                        <span className="rounded-full border-brut border-ink bg-surface px-2 py-1 text-caption font-extrabold text-ink">
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

                    <div className="border-brut border-ink bg-mango p-4 text-on-mango">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-caption font-extrabold uppercase">
                          Receipt
                        </span>
                        <Check className="h-5 w-5" />
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <ReceiptText className="h-7 w-7" />
                        <p className="text-heading">A record worth keeping.</p>
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
                className={buttonStyles({ size: 'lg', mobileFullWidth: true })}
              >
                Start free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <p className="mt-5 text-caption font-semibold text-text-muted">
              Free to start. Three free PDF or email sends each month.
            </p>
          </PageHero>

          {/* AUDIENCE TYPES */}
          <section className="border-b-2 border-ink bg-mango">
            <Container className="py-20 sm:py-28 lg:py-32">
              <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                <div>
                  <p className="text-caption font-extrabold uppercase tracking-wide text-on-mango">
                    Different kinds of creative work
                  </p>
                  <h2 className="mt-3 max-w-lg text-title-l text-on-mango">
                    Your craft is different. Getting paid shouldn&apos;t be.
                  </h2>
                </div>
                <p className="max-w-2xl text-body-l text-on-mango">
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
                          className="border-brut border-ink bg-surface p-5 shadow-brut"
                      >
                        <div className="flex items-center justify-between">
                                          <span
                                              className="flex h-11 w-11 items-center justify-center border-brut border-ink bg-pink text-on-pink">
                                              <Icon className="h-5 w-5"/>
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
            <Container className="py-20 sm:py-28 lg:py-32">
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
                            className="group border-brut border-ink bg-surface p-5 shadow-brut transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
                        >
                          <div className="flex items-center justify-between">
                                              <span
                                                  className="flex h-11 w-11 items-center justify-center border-brut border-ink bg-mango text-on-mango">
                                                  <Icon className="h-5 w-5"/>
                                              </span>
                            <span className="text-caption font-extrabold text-text-muted">
                                                  {item.number}
                                              </span>
                          </div>
                          <h3 className="mt-5 text-heading text-ink">{item.title}</h3>
                          <p className="mt-2 text-body text-text-soft">{item.copy}</p>
                          <span className="mt-5 inline-flex items-center gap-2 text-label font-extrabold text-ink">
                                              {item.link}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/>
                                          </span>
                        </Link>
                    );
                  })}
                </div>
              </div>
            </Container>
          </section>

          {/* FINAL CTA */}
          <section className="bg-mango">
            <Container className="py-20 sm:py-28 lg:py-32">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <p className="text-caption font-extrabold uppercase tracking-wide text-on-mango">
                    Professional billing
                  </p>
                  <h2 className="mt-3 max-w-3xl text-title-l text-on-mango">
                    Spend less time chasing. Spend more time creating.
                  </h2>
                  <p className="mt-4 max-w-2xl text-body-l text-on-mango">
                    Create invoices clients respect, provide simple payment instructions,
                    and keep your complete financial trail organised.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link
                      href="/signup"
                      className={buttonStyles({ variant: 'ink', size: 'lg' })}
                  >
                    Start free <ArrowRight className="h-4 w-4"/>
                  </Link>
                  <Link
                      href="/pricing"
                      className={buttonStyles({ variant: 'outline', size: 'lg' })}
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
