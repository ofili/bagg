
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  Info,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { CtaBand } from '@/components/marketing/cta-band';
import { FaqList } from '@/components/marketing/faq-list';
import { PageHero } from '@/components/marketing/page-hero';
import { SectionHeading } from '@/components/marketing/section-heading';
import { buttonStyles } from '@/components/ui/button';
import { marketingMetadata } from '@/lib/metadata';
import React from "react";
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
  title: 'Bagg Pricing for Freelancers and Creators',
  description:
      'Compare Bagg plans for freelancers and creators. Start free and upgrade when you need more ' +
      'invoice and quotation capacity.',
  path: '/pricing',
});

const freeFeatures = [
  'Create invoices and quotes',
  'Add and manage clients',
  'Shareable invoice and quote links',
  'PDF invoices with your business details',
  'Three free document sends every month',
  'Payment tracking and payment claims',
  'Receipts for confirmed payments',
  'Invoice payment reminders',
];

const creatorProFeatures = [
  'Everything in Free',
  'No monthly free-send limit',
  'Recurring invoice schedules',
  'Automated generation of recurring invoices',
  'Manage recurring schedules from your workspace',
  'Quote withdrawal and management',
];

const professionalFeatures = [
  'Everything in Creator Pro',
  'Unlimited invoices and document sends',
  'Eligible invoice recall',
  'Full invoice version history',
  'Advanced reporting and business insights',
  'Advanced reminder controls and automation',
  'Opt-in automatic invoice issuance',
  'Retainers and payment schedules',
  'Unlimited clients',
  'Up to 25 active engagements',
  'Up to 3 team members',
];

const studioFeatures = [
  'Contracts and commercial agreements',
  'Projects and milestone management',
  'Milestone-linked invoicing and payment schedules',
  'Deliverables and project version history',
  'Client feedback, review and approvals',
  'Revision and sign-off workflows',
  'Conditional file release and final handover',
  'Cloud storage and file integrations',
  'Team collaboration and advanced permissions',
  'Advanced engagement and project reporting',
];

const pricingFaqs = [
  {
    question: 'Can I use Bagg without paying?',
    answer:
        'Yes. You can start with the Free plan without adding a card. It includes three document sends each month, alongside the core tools for creating invoices and quotes, tracking payments and keeping records.',
  },
  {
    question: 'Can I pay monthly or annually?',
    answer:
        'Yes. Creator Pro and Professional are available with monthly or annual billing. Annual billing saves approximately 17% compared with paying month by month. Both prices are shown on the pricing page.',
  },
  {
    question: 'What are credits for?',
    answer:
        'Credits are an optional way to pay for additional document sends without upgrading your subscription. The available pack contains 200 credits and costs ₦2,000.',
  },
  {
    question: 'What is included in Professional?',
    answer:
        'Professional includes everything in Creator Pro, plus eligible invoice recall, unlimited invoices and document sends, full invoice version history, advanced reporting, advanced reminder controls, opt-in automatic invoice issuance, retainers and payment schedules. It also supports unlimited clients, up to 25 active engagements and up to 3 team members.',
  },
  {
    question: 'What is Studio?',
    answer:
        'Studio is a forthcoming expansion of Bagg beyond invoicing and payments. It will bring contracts, projects, milestones, deliverables, client reviews, approvals, file integrations and team collaboration into a connected client engagement workspace. Studio is not yet available for purchase.',
  },
  {
    question: 'Can I cancel my subscription?',
    answer:
        'Yes. You can stop auto-renewal. Your paid-plan access remains active until the end of the current billing period.',
  },
  {
    question: 'Does Bagg hold my client’s money?',
    answer:
        'No. Bagg helps you issue invoices, share payment instructions, track payment activity and keep records. Your client pays you through the payment method you provide.',
  },
];

export default function PricingPage() {
  return (
      <>
        <PageHero
            kicker="pricing that grows with your work"
            title="Start free. Pay for more room to grow."
            copy="Get your invoices, quotes and payment records organised first. Move to Creator Pro for recurring work, or Professional when your business needs more control over how you get paid."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/signup" className={buttonStyles({ size: 'lg' })}>
              Start free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <span className="text-caption font-bold text-text-muted">
            No card needed to start.
          </span>
          </div>
        </PageHero>

        {/* PLANS */}
        <section className="bg-canvas">
          <Container className="py-14 sm:py-18 lg:py-20">
            <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                  title="Choose your plan."
                  copy="Choose monthly flexibility or save approximately 17% with annual billing. Both prices are shown upfront."
              />
              <span className="inline-flex w-fit items-center gap-2 border-brut border-ink bg-surface px-3 py-2 text-caption font-extrabold text-ink shadow-brut-sm">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Save approximately 17% annually
              </span>
            </div>

            {/* ACTIVE PLANS */}
            <div className="grid items-stretch gap-6 lg:grid-cols-3">
              <PlanCard
                  name="Free"
                  eyebrow="For getting started"
                  description="Get your invoicing and payment records in order without paying for a subscription."
                  monthlyPrice="₦0"
                  annualPrice="—"
                  effectiveMonthly={null}
                  annualSaving={null}
                  features={freeFeatures}
                  cta="Start free"
                  href="/signup"
                  footnote="No card needed."
              />

              <PlanCard
                  featured
                  name="Creator Pro"
                  eyebrow="For active independent businesses"
                  description="For freelancers and creators who send documents regularly and need recurring invoices."
                  monthlyPrice="₦3,500"
                  annualPrice="₦35,000"
                  effectiveMonthly="₦2,917"
                  annualSaving="₦7,000"
                  features={creatorProFeatures}
                  cta="Get Creator Pro"
                  href="/signup?plan=creator_pro"
                  footnote="Choose monthly or annual billing at checkout."
              />

              <PlanCard
                  name="Professional"
                  eyebrow="For serious independents and small teams"
                  description="For established businesses that need more control over invoicing, payment workflows, clients and growing teams."
                  monthlyPrice="₦8,500"
                  annualPrice="₦85,000"
                  effectiveMonthly="₦7,083"
                  annualSaving="₦17,000"
                  features={professionalFeatures}
                  cta="Get Professional"
                  href="/signup?plan=professional"
                  footnote="Choose monthly or annual billing at checkout."
              />
            </div>

            {/* STUDIO — FUTURE PLAN */}
            <div className="mt-8 border-brut border-ink bg-cream shadow-brut-sm">
              <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-10">
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center border-brut border-ink bg-peach text-ink shadow-brut-sm">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                    <span className="border-brut border-ink bg-peach px-3 py-1.5 text-caption font-extrabold text-ink">
                    Coming soon
                  </span>
                  </div>

                  <p className="mt-5 text-caption font-extrabold uppercase tracking-wider text-text-muted">
                    For creative studios and client-facing teams
                  </p>
                  <h2 className="mt-2 text-title-l font-black text-ink">
                    Studio
                  </h2>
                  <p className="mt-3 max-w-lg text-body-l text-text-soft">
                    Go beyond invoices. Manage the full client engagement,
                    from commercial agreements and project milestones to
                    deliverables, feedback, approvals and final handover.
                  </p>

                  <div className="mt-6 border-y border-line py-4">
                    <p className="text-caption font-bold uppercase tracking-wider text-text-muted">
                      Planned pricing
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-caption font-bold text-text-muted">
                          MONTHLY
                        </p>
                        <p className="mt-1 text-title font-black text-ink">
                          ₦18,000
                        </p>
                        <p className="text-caption text-text-muted">per month</p>
                      </div>
                      <div className="border-l border-line pl-3">
                        <p className="text-caption font-bold text-text-muted">
                          ANNUAL
                        </p>
                        <p className="mt-1 text-title font-black text-ink">
                          ₦180,000
                        </p>
                        <p className="text-caption text-text-muted">per year</p>
                      </div>
                    </div>
                    <p className="mt-3 text-caption font-extrabold text-paid-text">
                      Annual equivalent: ₦15,000/month · Save ₦36,000
                    </p>
                  </div>

                  <p className="mt-auto pt-5 text-caption text-text-muted">
                    Studio is a forthcoming product expansion and is not
                    available for purchase yet.
                  </p>
                </div>

                <div className="lg:border-l lg:border-line lg:pl-10">
                  <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
                    What Studio will bring
                  </p>
                  <ul className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    {studioFeatures.map((feature) => (
                        <li
                            key={feature}
                            className="flex items-start gap-2.5 text-body text-text-soft"
                        >
                          <Sparkles
                              className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
                              aria-hidden="true"
                          />
                          <span>{feature}</span>
                        </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* OPTIONAL CREDITS */}
        <section className="border-y border-line bg-surface">
          <Container className="py-14 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
                  Pay as you go
                </p>
                <h2 className="mt-3 text-title-l font-black tracking-tight text-ink">
                  Need more sends without a subscription?
                </h2>
                <p className="mt-3 max-w-xl text-body-l text-text-soft">
                  Buy a credit pack when you need it. Credits give you another
                  way to send documents without changing your plan.
                </p>
              </div>

              <div className="border-brut border-ink bg-cream p-6 shadow-brut sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                  <span className="inline-flex h-11 w-11 items-center justify-center border-brut border-ink bg-mango text-on-mango shadow-brut-sm">
                    <CreditCard className="h-5 w-5" aria-hidden="true" />
                  </span>
                    <h3 className="mt-4 text-heading font-black text-ink">
                      200 credits
                    </h3>
                    <p className="mt-1 text-body text-text-soft">
                      One optional credit pack.
                    </p>
                  </div>
                  <span className="border border-line bg-surface px-2.5 py-1 text-caption font-extrabold text-text-muted">
                  Pay once
                </span>
                </div>

                <div className="mt-6 border border-line bg-surface p-4">
                  <p className="text-caption font-bold text-text-muted">
                    NGN billing
                  </p>
                  <p className="mt-1 text-title font-black text-ink">
                    ₦2,000
                  </p>
                </div>
                <p className="mt-4 text-caption text-text-muted">
                  Credit purchases are optional and separate from your subscription.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* PRICE PROMISES */}
        <section className="bg-canvas">
          <Container className="py-14 sm:py-18">
            <SectionHeading
                title="No surprises around your money."
                copy="Know what you are buying, what you are paying and what happens when your plan changes."
            />

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              <PricePromise
                  icon={<Info className="h-5 w-5" aria-hidden="true" />}
                  title="Clear plan prices"
                  copy="Plan prices are shown clearly in Nigerian naira, with monthly and annual options visible before you choose."
              />
              <PricePromise
                  icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
                  title="Your access is respected"
                  copy="Cancelling renewal does not immediately remove your paid access. It remains active until the current period ends."
              />
              <PricePromise
                  icon={<Clock className="h-5 w-5" aria-hidden="true" />}
                  title="No silent plan changes"
                  copy="We will explain material changes to pricing or plan access before they take effect."
              />
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section className="border-y border-line bg-surface">
          <Container className="py-14 sm:py-18">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <SectionHeading
                  title="Pricing questions."
                  copy="The practical details about plans, credits and billing."
              />
              <FaqList items={pricingFaqs} />
            </div>
          </Container>
        </section>

        <CtaBand
            title="Get your next invoice moving."
            copy="Start free, organise your client payments and upgrade when your workflow needs more."
            href="/signup"
            label="Start free"
        />
      </>
  );
}

function PlanCard({
                    name,
                    eyebrow,
                    description,
                    monthlyPrice,
                    annualPrice,
                    effectiveMonthly,
                    annualSaving,
                    features,
                    cta,
                    href,
                    footnote,
                    featured = false,
                  }: {
  name: string;
  eyebrow: string;
  description: string;
  monthlyPrice: string;
  annualPrice: string;
  effectiveMonthly: string | null;
  annualSaving: string | null;
  features: string[];
  cta: string;
  href: string;
  footnote: string;
  featured?: boolean;
}) {
  return (
      <div
          className={
            featured
                ? 'relative flex h-full flex-col border-brut border-ink bg-mango p-6 text-on-mango shadow-brut sm:p-7'
                : 'flex h-full flex-col border-brut border-ink bg-surface p-6 shadow-brut-sm sm:p-7'
          }
      >
        {featured && (
            <span className="absolute -top-3 right-5 border-brut border-ink bg-ink px-3 py-1 text-caption font-extrabold uppercase tracking-wider text-surface">
          Most popular
        </span>
        )}

        <div>
          <p
              className={`text-caption font-extrabold uppercase tracking-wider ${
                  featured ? 'text-on-mango/75' : 'text-text-muted'
              }`}
          >
            {eyebrow}
          </p>
          <h2
              className={`mt-2 text-title-l font-black ${
                  featured ? 'text-on-mango' : 'text-ink'
              }`}
          >
            {name}
          </h2>
          <p
              className={`mt-4 min-h-[4.5rem] text-body ${
                  featured ? 'text-on-mango/85' : 'text-text-soft'
              }`}
          >
            {description}
          </p>
        </div>

        <div
            className={`mt-6 border-y py-5 ${
                featured ? 'border-on-mango/30' : 'border-line'
            }`}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p
                  className={`text-caption font-bold uppercase tracking-wider ${
                      featured ? 'text-on-mango/75' : 'text-text-muted'
                  }`}
              >
                Monthly
              </p>
              <p
                  className={`mt-2 text-title-l font-black leading-none tracking-tight ${
                      featured ? 'text-on-mango' : 'text-ink'
                  }`}
              >
                {monthlyPrice}
              </p>
              <p
                  className={`mt-1 text-caption ${
                      featured ? 'text-on-mango/75' : 'text-text-muted'
                  }`}
              >
                {monthlyPrice === '₦0' ? 'forever' : 'per month'}
              </p>
            </div>
            <div
                className={`border-l pl-3 ${
                    featured ? 'border-on-mango/30' : 'border-line'
                }`}
            >
              <p
                  className={`text-caption font-bold uppercase tracking-wider ${
                      featured ? 'text-on-mango/75' : 'text-text-muted'
                  }`}
              >
                Annual
              </p>
              <p
                  className={`mt-2 text-title-l font-black leading-none tracking-tight ${
                      featured ? 'text-on-mango' : 'text-ink'
                  }`}
              >
                {annualPrice}
              </p>
              <p
                  className={`mt-1 text-caption ${
                      featured ? 'text-on-mango/75' : 'text-text-muted'
                  }`}
              >
                {annualPrice === '—' ? 'No annual plan' : 'per year'}
              </p>
            </div>
          </div>

          {effectiveMonthly && annualSaving && (
              <div
                  className={`mt-4 border p-3 ${
                      featured
                          ? 'border-ink/30 bg-surface/70'
                          : 'border-line bg-canvas'
                  }`}
              >
                <p className="text-caption text-text-muted">
                  Annual billing works out to
                </p>
                <p className="mt-1 text-heading font-black text-ink">
                  {effectiveMonthly}
                  <span className="ml-1 text-caption font-semibold text-text-muted">
                    / month
                  </span>
                </p>
                <p className="mt-1 text-caption font-extrabold text-paid-text">
                  Save {annualSaving} per year
                </p>
              </div>
          )}
        </div>

        <div className="mt-6">
          <p
              className={`text-caption font-extrabold uppercase tracking-wider ${
                  featured ? 'text-on-mango/75' : 'text-text-muted'
              }`}
          >
            What is included
          </p>
          <ul className="mt-4 space-y-3">
            {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-body">
                  <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                          featured ? 'text-on-mango' : 'text-paid-text'
                      }`}
                      aria-hidden="true"
                  />
                  <span className={featured ? 'text-on-mango' : 'text-text-soft'}>
                {feature}
              </span>
                </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-8">
          <Link
              href={href}
              className={
                featured
                    ? `${buttonStyles({ variant: 'outline', size: 'lg' })} w-full border-2 border-ink bg-surface text-ink hover:bg-cream`
                    : `${buttonStyles({ size: 'lg' })} w-full`
              }
          >
            {cta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <p
              className={`mt-3 text-caption ${
                  featured ? 'text-on-mango/75' : 'text-text-muted'
              }`}
          >
            {footnote}
          </p>
        </div>
      </div>
  );
}

function PricePromise({
                        icon,
                        title,
                        copy,
                      }: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
      <div className="border-brut border-ink bg-surface p-5 shadow-brut-sm">
      <span className="flex h-10 w-10 items-center justify-center border-brut border-ink bg-peach text-ink">
        {icon}
      </span>
        <h3 className="mt-4 text-heading font-black text-ink">{title}</h3>
        <p className="mt-2 text-body text-text-soft">{copy}</p>
      </div>
  );
}
