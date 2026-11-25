import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  FileCheck,
  FileText,
  Palette,
  ReceiptText,
  Sparkles,
  Users,
  Wallet,
  BellRing,
} from "lucide-react";

import { Container } from "@/components/marketing/container";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingBreadcrumbStructuredData } from "@/components/marketing/marketing-structured-data";
import { buttonStyles } from "@/components/ui/button";
import { marketingMetadata } from "@/lib/metadata";
import { demoInvoiceHref } from "@/lib/site";

export const metadata: Metadata = marketingMetadata({
  title: "Who Bagg Is For | Freelancers, Consultants and Creative Businesses",
  description:
    "Whether you freelance, advise clients or run a creative business, Bagg helps you agree fees, send invoices, track payments and issue receipts.",
  path: "/audiences",
});

const audiences = [
  {
    id: "independent-professionals",
    label: "Freelancers",
    title: "you do the work and run the business.",
    copy: "You find the clients, agree the fee, deliver, and then handle the money too. Bagg takes care of the admin bit.",
    examples: [
      "Freelance developers and engineers",
      "Writers and editors",
      "Designers and other creatives",
      "Photographers and videographers",
    ],
    icon: Palette,
    tone: "bg-pink text-on-pink",
    links: [
      { label: "Make an invoice", href: "/features/invoicing" },
      { label: "Send a client quote", href: "/features/quotes" },
    ],
  },
  {
    id: "consultants",
    label: "Consultants and advisers",
    title: "your expertise is the product.",
    copy: "Clients hire you for your judgement and experience. Bagg backs that up with clear quotes, tidy invoices and payment records that match.",
    examples: [
      "Strategy and management consultants",
      "Business and financial advisers",
      "Technology and digital consultants",
      "Independent specialists",
    ],
    icon: BriefcaseBusiness,
    tone: "bg-sun text-on-sun",
    links: [
      { label: "See quotes", href: "/features/quotes" },
      { label: "See payment tracking", href: "/features/payments" },
    ],
  },
  {
    id: "creative-studios",
    label: "Creative studios",
    title: "do great creative work. keep the money tidy.",
    copy: "From agreeing the project fee to collecting deposits and final payments, Bagg keeps your billing and payment records in order.",
    examples: [
      "Branding and design studios",
      "Photo and video production teams",
      "Web and digital agencies",
      "Content and creative production businesses",
    ],
    icon: Users,
    tone: "bg-mango text-on-mango",
    links: [
      { label: "See quotes", href: "/features/quotes" },
      { label: "See payment tracking", href: "/features/payments" },
    ],
  },
];

const workflow = [
  {
    title: "agree the work",
    copy: "Send a quote that spells out services, price and terms.",
    icon: FileCheck,
    href: "/features/quotes",
    link: "See quotes",
    tone: "bg-pink text-on-pink",
  },
  {
    title: "invoice your client",
    copy: "Turn the accepted quote into an invoice with a clear amount, due date and how to pay.",
    icon: FileText,
    href: "/features/invoicing",
    link: "See invoicing",
    tone: "bg-sun text-on-sun",
  },
  {
    title: "track the payment",
    copy: "See what's outstanding, what's part paid and who needs a nudge.",
    icon: Wallet,
    href: "/features/payments",
    link: "See payments",
    tone: "bg-mango text-on-mango",
  },
  {
    title: "record what lands",
    copy: "Confirm payments and issue receipts tied to the original invoice.",
    icon: ReceiptText,
    href: "/features/receipts",
    link: "See receipts",
    tone: "bg-surface-tint text-text",
  },
];

const benefits = [
  {
    title: "look the part",
    copy: "Consistent quotes, invoices and receipts that make you look like the business you are.",
    icon: FileText,
  },
  {
    title: "make paying easy",
    copy: "Give clients everything they need to understand and pay.",
    icon: Wallet,
  },
  {
    title: "stay on top of it",
    copy: "See what's paid, what's open and who needs a follow-up.",
    icon: BellRing,
  },
  {
    title: "keep it all connected",
    copy: "Quotes, invoices, payments and receipts, linked together.",
    icon: ReceiptText,
  },
];

export default function AudiencesPage() {
  return (
    <>
      <MarketingBreadcrumbStructuredData
        items={[
          { name: "Home", path: "/" },
          { name: "Who Bagg is for", path: "/audiences" },
        ]}
      />

      <div className="overflow-hidden bg-cream">
        {/* HERO */}
        <PageHero
          layout="split"
          className="relative"
          containerClassName="gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24"
          kicker={
            <div className="inline-flex items-center gap-2 border-brut border-ink bg-sun px-3 py-2 text-on-sun shadow-brut">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              <span className="text-caption font-extrabold uppercase tracking-wide">
                built for people who work for themselves
              </span>
            </div>
          }
          title={
            <>
              Your work is
              <span className="mt-2 block">your business.</span>
              <span className="mt-2 inline-block -rotate-1 border-brut border-ink bg-mango px-3 pb-2 text-on-mango shadow-brut-lg">
                Make it pay.
              </span>
            </>
          }
          titleClassName="mt-7 text-title-l leading-[0.98] sm:text-[4.5rem] lg:text-[5.2rem]"
          copy={
            <>
              Whether you freelance, advise clients or run a creative studio,
              the money side of the work deserves better than a spreadsheet and
              a lot of &quot;just checking in&quot; messages. Bagg helps you
              agree fees, invoice clearly, track payments and keep your records
              tidy.
            </>
          }
          copyClassName="mt-8 max-w-xl"
          visual={
            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute inset-0 translate-x-4 translate-y-4 border-brut border-ink bg-pink" />

              <div className="relative border-brut border-ink bg-surface shadow-brut-lg">
                <div className="border-b-2 border-ink bg-mango px-5 py-5 text-on-mango">
                  <p className="text-caption font-extrabold uppercase tracking-wide">
                    the money side of your work
                  </p>
                  <h2 className="mt-2 text-heading font-extrabold">
                    One connected flow.
                  </h2>
                </div>

                <div className="space-y-3 p-5 sm:p-7">
                  {[
                    {
                      label: "QUOTE",
                      title: "agree the work and the fee.",
                      description: "Clear services, clear price.",
                      icon: FileCheck,
                      tone: "bg-pink",
                    },
                    {
                      label: "INVOICE",
                      title: "make paying easy.",
                      description: "Clear amounts and due dates.",
                      icon: FileText,
                      tone: "bg-sun",
                    },
                    {
                      label: "PAYMENT",
                      title: "know what has come in.",
                      description: "Payments and balances, tracked.",
                      icon: Wallet,
                      tone: "bg-mango",
                    },
                    {
                      label: "RECEIPT",
                      title: "keep the record.",
                      description: "Receipts linked to the invoice.",
                      icon: ReceiptText,
                      tone: "bg-surface-tint",
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-4 border-brut border-ink bg-cream p-4"
                      >
                        <span
                          className={`flex h-12 w-12 shrink-0 items-center justify-center border-brut border-ink ${item.tone}`}
                        >
                          <Icon
                            aria-hidden="true"
                            className="h-6 w-6 text-ink"
                          />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                            {item.label}
                          </p>
                          <p className="mt-1 text-body font-extrabold text-ink">
                            {item.title}
                          </p>
                          <p className="mt-1 text-caption text-text-soft">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t-2 border-ink bg-cream px-5 py-4">
                  <p className="text-caption font-bold text-text-soft">
                    Less time on the money side. More time on the work.
                  </p>
                </div>
              </div>

              <div className="absolute -right-3 -top-5 rotate-6 border-brut border-ink bg-sun px-4 py-2 text-on-sun shadow-brut sm:-right-6">
                <span className="text-caption font-extrabold uppercase">
                  work. invoice. get paid.
                </span>
              </div>
            </div>
          }
        >
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={buttonStyles({
                size: "lg",
                mobileFullWidth: true,
              })}
            >
              Start free
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>

            <Link
              href={demoInvoiceHref}
              className={buttonStyles({
                variant: "outline",
                size: "lg",
                mobileFullWidth: true,
              })}
            >
              See what your client sees
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-5 text-caption font-semibold text-text-muted">
            Free to start. No card required.
          </p>
        </PageHero>

        {/* AUDIENCE SEGMENTS */}
        <MarketingSection spacing="large" border="both" className="bg-mango">
          <SectionHeading
            eyebrow="who it's for"
            title="Different jobs. Same money questions."
            copy="Your craft is your own. But every client needs a clear price, a clear invoice and a clear record of what's been paid."
            titleClassName="text-title-l text-on-mango"
            copyClassName="mt-5 text-on-mango"
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {audiences.map((audience) => {
              const Icon = audience.icon;

              return (
                <article
                  id={audience.id}
                  key={audience.label}
                  className="flex scroll-mt-24 flex-col border-brut border-ink bg-surface p-6 shadow-brut-lg"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center border-brut border-ink ${audience.tone}`}
                  >
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>

                  <p className="mt-6 text-caption font-extrabold uppercase tracking-wide text-text-muted">
                    {audience.label}
                  </p>

                  <h3 className="mt-3 text-heading font-extrabold leading-tight text-ink">
                    {audience.title}
                  </h3>

                  <p className="mt-4 text-body leading-relaxed text-text-soft">
                    {audience.copy}
                  </p>

                  <div className="mt-6 border-t-2 border-ink pt-5">
                    <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                      think:
                    </p>

                    <ul className="mt-4 space-y-3">
                      {audience.examples.map((example) => (
                        <li
                          key={example}
                          className="flex items-start gap-2 text-body text-ink"
                        >
                          <Check
                            aria-hidden="true"
                            className="mt-0.5 h-4 w-4 shrink-0"
                            strokeWidth={3}
                          />
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto space-y-3 border-t-2 border-ink pt-5">
                    {audience.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center justify-between gap-3 text-label font-extrabold text-ink hover:underline"
                      >
                        {link.label}
                        <ArrowRight
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0"
                        />
                      </Link>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </MarketingSection>

        {/* COMMON WORKFLOW */}
        <MarketingSection spacing="large" className="bg-cream">
          <SectionHeading
            eyebrow="start to finish"
            title='From "let&apos;s work together" to paid.'
            copy="Whatever you do, the journey with your client is the same. Bagg walks it with you."
            titleClassName="text-title-l"
            copyClassName="mt-5"
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.title}
                  className="flex flex-col border-brut border-ink bg-surface p-5 shadow-brut"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center border-brut border-ink ${step.tone}`}
                  >
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>

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

        {/* BENEFITS */}
        <MarketingSection
          spacing="large"
          border="both"
          className="bg-surface-sunken"
        >
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              eyebrow="why Bagg"
              title="The business side, minus the admin."
              copy="You don't need a giant system. You need an easy way to handle the money side of client work."
              titleClassName="text-title-l"
              copyClassName="mt-5"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <article
                    key={benefit.title}
                    className="border-brut border-ink bg-surface p-5 shadow-brut"
                  >
                    <span className="flex h-11 w-11 items-center justify-center border-brut border-ink bg-mango text-on-mango">
                      <Icon aria-hidden="true" className="h-5 w-5" />
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

        {/* FEATURE DISCOVERY */}
        <MarketingSection spacing="large" className="bg-cream">
          <SectionHeading
            eyebrow="look around"
            title="Everything you need to get paid."
            copy="Four pieces, one flow."
            titleClassName="text-title-l"
          />

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Quotes",
                description:
                  "Agree services, price and terms before work starts.",
                href: "/features/quotes",
                icon: FileCheck,
              },
              {
                title: "Invoicing",
                description: "Make an invoice and share it with one link.",
                href: "/features/invoicing",
                icon: FileText,
              },
              {
                title: "Payments",
                description: "Track payments, balances and follow-ups.",
                href: "/features/payments",
                icon: Wallet,
              },
              {
                title: "Receipts",
                description: "Issue receipts linked to the original invoice.",
                href: "/features/receipts",
                icon: ReceiptText,
              },
            ].map((feature) => {
              const Icon = feature.icon;

              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="group border-brut border-ink bg-surface p-5 shadow-brut transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4"
                >
                  <span className="flex h-12 w-12 items-center justify-center border-brut border-ink bg-mango text-on-mango">
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>

                  <h3 className="mt-5 text-heading font-extrabold text-ink">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-body leading-relaxed text-text-soft">
                    {feature.description}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-2 text-label font-extrabold text-ink">
                    Take a look
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </MarketingSection>

        {/* FINAL CTA */}
        <section className="border-t-2 border-ink bg-mango">
          <Container className="py-20 sm:py-28 lg:py-32">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-caption font-extrabold uppercase tracking-wide text-on-mango">
                  your work deserves better admin
                </p>

                <h2 className="mt-3 max-w-3xl text-title-l font-extrabold leading-tight text-on-mango">
                  Do the work you love. Let Bagg handle getting paid.
                </h2>

                <p className="mt-4 max-w-2xl text-body-l leading-relaxed text-on-mango">
                  Quotes, invoices, payments and receipts, all in one place.
                </p>

                <p className="mt-4 text-caption font-semibold text-on-mango">
                  Start free. No card required.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/signup"
                  className={buttonStyles({
                    variant: "ink",
                    size: "lg",
                    mobileFullWidth: true,
                  })}
                >
                  Start free
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>

                <Link
                  href="/pricing"
                  className={buttonStyles({
                    variant: "outline",
                    size: "lg",
                    mobileFullWidth: true,
                  })}
                >
                  See pricing
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </div>
    </>
  );
}
