import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  Info,
  ShieldCheck,
} from "lucide-react";

import { Container } from "@/components/marketing/container";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqList } from "@/components/marketing/faq-list";
import { PageHero } from "@/components/marketing/page-hero";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonStyles } from "@/components/ui/button";
import { marketingMetadata } from "@/lib/metadata";
import { BagCharacter } from "@/components/brand";
import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = marketingMetadata({
  title: "Bagg Pricing for Freelancers and Creators",
  description:
    "Compare Bagg plans for freelancers and creators. Start free and upgrade when you need more " +
    "invoice and quotation capacity.",
  path: "/pricing",
});

const freeFeatures = [
  "Invoices and quotes",
  "Your clients, all in one place",
  "A shareable link for every document",
  "PDF invoices with your business details",
  "Three sends a month (PDF or email)",
  "Payment tracking and client payment claims",
  "Receipts for confirmed payments",
  "Automatic payment reminders",
];

const creatorProFeatures = [
  "Everything in Free",
  "Unlimited sends",
  "Recurring invoices that come back on schedule",
  "Invoices generated for you each cycle",
  "All your schedules managed in one place",
  "Withdraw and manage quotes when plans change",
];

const professionalFeatures = [
  "Everything in Creator Pro",
  "Recall an invoice when it's eligible",
  "Full version history for every invoice",
  "Reports and business insights",
  "Fine-tuned reminder controls",
  "Auto-issue recurring invoices (opt-in)",
  "Retainers and payment schedules",
  "Up to 25 active clients",
  "Up to 3 team members",
];

const pricingFaqs = [
  {
    question: "Can I use Bagg without paying?",
    answer:
      "Yes. Free needs no card and includes three sends a month, plus everything you need to make invoices and quotes, track payments and keep records.",
  },
  {
    question: "Can I pay monthly or yearly?",
    answer:
      "Yes, on Creator Pro and Professional. Yearly saves about 17% compared with paying month by month, and you see both prices before you choose.",
  },
  {
    question: "What are credits for?",
    answer:
      "They let you send more documents without upgrading. One pack is 200 credits for ₦2,000.",
  },
  {
    question: "What do I get with Professional?",
    answer:
      "Everything in Creator Pro, plus invoice recall (when eligible), full version history, reports, finer reminder controls, opt-in auto-issue, retainers and payment schedules. It also covers up to 25 active clients and up to 3 team members.",
  },
  {
    question: "What is Studio?",
    answer:
      "Studio is where Bagg is heading next: contracts, projects, milestones, deliverables, client reviews, approvals, file integrations and team collaboration, all in one connected workspace. It isn't available to buy yet.",
  },
  {
    question: "Can I cancel?",
    answer:
      "Yes. Turn off auto-renew and your paid plan stays active until the end of the period you've already paid for.",
  },
  {
    question: "Does Bagg hold my client’s money?",
    answer:
      "No. Bagg helps you send invoices, share payment instructions, track payments and keep records. Your client pays you through the method you provide.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        kicker={
          <div className="inline-flex w-fit items-center border-brut border-ink bg-mango px-3 py-1.5 text-caption font-extrabold uppercase tracking-wider text-on-mango shadow-brut-sm">
            simple pricing
          </div>
        }
        title="Start free. Pay when you outgrow it."
        copy="Get your invoices, quotes and payments sorted for free. Move to Creator Pro when you have regular clients, or Professional when you want more control."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/signup" className={buttonStyles({ size: "lg" })}>
            Start free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="text-caption font-bold text-text-muted">
            No card needed to start.
          </span>
        </div>
      </PageHero>

      {/* PLANS */}
      <section className="bg-cream">
        <Container className="py-14 sm:py-16 lg:py-20">
          <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              title="Pick your plan."
              copy="Pay monthly, or save about 17% by paying yearly. Both prices are right there."
            />
            <span className="inline-flex w-fit items-center gap-2 border-brut border-ink bg-surface px-3 py-2 text-caption font-extrabold text-ink shadow-brut-sm">
              <Clock className="h-4 w-4" aria-hidden="true" />
              save about 17% yearly
            </span>
          </div>

          {/* ACTIVE PLANS */}
          <div className="grid items-stretch gap-6 lg:grid-cols-3">
            <PlanCard
              name="Free"
              eyebrow="to get started"
              description="Everything you need to start sending proper invoices and tracking payments. No subscription."
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
              eyebrow="for regular clients"
              description="For freelancers and creators who send invoices all the time and have clients who pay on repeat."
              monthlyPrice="₦3,500"
              annualPrice="₦35,000"
              effectiveMonthly="₦2,917"
              annualSaving="₦7,000"
              features={creatorProFeatures}
              cta="Get Creator Pro"
              href="/signup?plan=creator_pro"
              footnote="Pick monthly or yearly at checkout."
            />

            <PlanCard
              name="Professional"
              eyebrow="for serious solo businesses and small teams"
              description="For established businesses that want more control over how invoices go out, how clients pay and who's on the team."
              monthlyPrice="₦8,500"
              annualPrice="₦85,000"
              effectiveMonthly="₦7,083"
              annualSaving="₦17,000"
              features={professionalFeatures}
              cta="Get Professional"
              href="/signup?plan=professional"
              footnote="Pick monthly or yearly at checkout."
            />
          </div>
        </Container>
      </section>

      {/* OPTIONAL CREDITS */}
      <section className="border-y border-line bg-surface">
        <Container className="py-14 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-wider text-text-muted">
                pay as you go
              </p>
              <h2 className="mt-3 text-title-l font-extrabold tracking-tight text-ink">
                Need a few more sends? Buy credits instead.
              </h2>
              <p className="mt-3 max-w-xl text-body-l text-text-soft">
                No subscription needed. Buy a pack and use it whenever you need
                to send more.
              </p>
            </div>

            <div className="border-brut border-ink bg-cream p-6 shadow-brut sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex h-11 w-11 items-center justify-center border-brut border-ink bg-mango text-on-mango shadow-brut-sm">
                    <CreditCard className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-heading font-extrabold text-ink">
                    200 credits
                  </h3>
                  <p className="mt-1 text-body text-text-soft">
                    One pack, pay once.
                  </p>
                </div>
                <span className="rounded-full border-brut-thin border-ink bg-surface px-2.5 py-1 text-caption font-extrabold text-text-muted">
                  Pay once
                </span>
              </div>

              <div className="mt-6 border-brut-thin border-ink bg-surface p-4">
                <p className="text-caption font-bold text-text-muted">
                  NGN billing
                </p>
                <p className="mt-1 text-title font-extrabold text-ink">
                  ₦2,000
                </p>
              </div>
              <p className="mt-4 text-caption text-text-muted">
                Credits are optional and separate from any subscription.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* PRICE PROMISES */}
      <section className="bg-cream">
        <Container className="py-14 sm:py-16">
          <SectionHeading
            title="No surprises with your money."
            copy="Know what you're buying, what it costs and what happens if you change your mind."
          />

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <PricePromise
              icon={<Info className="h-5 w-5" aria-hidden="true" />}
              title="Prices you can see"
              copy="Plan prices are in naira, monthly and yearly, before you commit."
            />
            <PricePromise
              icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
              title="Cancel without losing out"
              copy="Turn off auto-renew and you keep your paid access until the period ends."
            />
            <PricePromise
              icon={<Clock className="h-5 w-5" aria-hidden="true" />}
              title="No sneaky changes"
              copy="If prices or plans change in a way that matters, we'll tell you before it takes effect."
              sisiMood="skeptical"
            />
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="border-y border-line bg-surface">
        <Container className="py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <SectionHeading
              title="Pricing questions."
              copy="The practical stuff about plans, credits and billing."
            />
            <FaqList items={pricingFaqs} />
          </div>
        </Container>
      </section>

      <CtaBand
        title="Get your next invoice moving."
        copy="Start free, get your client payments in order, and upgrade when you need more."
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
          ? "relative flex h-full flex-col border-brut border-ink bg-mango p-6 text-on-mango shadow-brut sm:p-7"
          : "flex h-full flex-col border-brut border-ink bg-surface p-6 shadow-brut-sm sm:p-7"
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
            featured ? "text-on-mango/85" : "text-text-muted"
          }`}
        >
          {eyebrow}
        </p>
        <h2
          className={`mt-2 text-title-l font-extrabold ${
            featured ? "text-on-mango" : "text-ink"
          }`}
        >
          {name}
        </h2>
        <p
          className={`mt-4 min-h-[4.5rem] text-body ${
            featured ? "text-on-mango/85" : "text-text-soft"
          }`}
        >
          {description}
        </p>
      </div>

      <div
        className={`mt-6 border-y py-5 ${
          featured ? "border-on-mango/30" : "border-line"
        }`}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p
              className={`text-caption font-bold uppercase tracking-wider ${
                featured ? "text-on-mango/85" : "text-text-muted"
              }`}
            >
              Monthly
            </p>
            <p
              className={`mt-2 text-title-l font-extrabold leading-none tracking-tight ${
                featured ? "text-on-mango" : "text-ink"
              }`}
            >
              {monthlyPrice}
            </p>
            <p
              className={`mt-1 text-caption ${
                featured ? "text-on-mango/85" : "text-text-muted"
              }`}
            >
              {monthlyPrice === "₦0" ? "forever" : "per month"}
            </p>
          </div>
          <div
            className={`border-l pl-3 ${
              featured ? "border-on-mango/30" : "border-line"
            }`}
          >
            <p
              className={`text-caption font-bold uppercase tracking-wider ${
                featured ? "text-on-mango/85" : "text-text-muted"
              }`}
            >
              Annual
            </p>
            <p
              className={`mt-2 text-title-l font-extrabold leading-none tracking-tight ${
                featured ? "text-on-mango" : "text-ink"
              }`}
            >
              {annualPrice}
            </p>
            <p
              className={`mt-1 text-caption ${
                featured ? "text-on-mango/85" : "text-text-muted"
              }`}
            >
              {annualPrice === "—" ? "No annual plan" : "per year"}
            </p>
          </div>
        </div>

        {effectiveMonthly && annualSaving && (
          <div
            className={`mt-4 border p-3 ${
              featured ? "border-ink/30 bg-surface/70" : "border-line bg-cream"
            }`}
          >
            <p className="text-caption text-text-muted">
              Annual billing works out to
            </p>
            <p className="mt-1 text-heading font-extrabold text-ink">
              {effectiveMonthly}
              <span className="ml-1 text-caption font-semibold text-text-muted">
                / month
              </span>
            </p>
            <p className="mt-1 text-caption font-extrabold text-status-paid-fg">
              Save {annualSaving} per year
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <p
          className={`text-caption font-extrabold uppercase tracking-wider ${
            featured ? "text-on-mango/85" : "text-text-muted"
          }`}
        >
          What is included
        </p>
        <ul className="mt-4 space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-body">
              <Check
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  featured ? "text-on-mango" : "text-status-paid-fg"
                }`}
                aria-hidden="true"
              />
              <span className={featured ? "text-on-mango" : "text-text-soft"}>
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-8">
        <Link
          href={href}
          className={buttonStyles({
            variant: featured ? "ink" : "primary",
            size: "lg",
            fullWidth: true,
          })}
        >
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p
          className={`mt-3 text-caption ${
            featured ? "text-on-mango/85" : "text-text-muted"
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
  sisiMood,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  sisiMood?: "skeptical";
}) {
  return (
    <div className="border-brut border-ink bg-surface p-5 shadow-brut-sm flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center border-brut border-ink bg-peach text-ink">
            {icon}
          </span>
          {sisiMood && (
            <BagCharacter
              mood={sisiMood}
              size={72}
              className="hidden shrink-0 sm:block -mt-1 -mr-1"
              decorative
            />
          )}
        </div>
        <h3 className="mt-4 text-heading font-extrabold text-ink">{title}</h3>
        <p className="mt-2 text-body text-text-soft">{copy}</p>
      </div>
    </div>
  );
}
