import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  FileText,
  Globe2,
  Link2,
  ReceiptText,
  Wallet,
} from "lucide-react";

import { Container } from "@/components/marketing/container";
import { CtaBand } from "@/components/marketing/cta-band";
import { Doodle } from "@/components/marketing/doodle";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { FaqList } from "@/components/marketing/faq-list";
import { MarketingCard } from "@/components/marketing/marketing-card";
import { MarketingFrame } from "@/components/marketing/marketing-frame";
import { MarketingGrid } from "@/components/marketing/marketing-grid";
import { MarketingSticker } from "@/components/marketing/marketing-sticker";
import { SectionHeading } from "@/components/marketing/section-heading";
import { buttonStyles } from "@/components/ui/button";
import { BagCharacter } from "@/components/brand";

import { currencies, homeFaqs } from "@/content/marketing";

import { defaultMarketingMetadata } from "@/lib/metadata";
import { demoInvoiceHref } from "@/lib/site";
import { Metadata } from "next";

export const metadata: Metadata = defaultMarketingMetadata;

export default function MarketingPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b-2 border-ink bg-cream">
        <Container className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_1fr] lg:gap-10 lg:py-24">
          <div className="relative z-10">
            <MarketingSticker tone="pink" tilt="left">
              Built for African freelancers &amp; studios
            </MarketingSticker>

            <h1 className="mt-6 max-w-2xl text-[clamp(3rem,7vw,5.5rem)] font-extrabold leading-[0.96] tracking-[-0.055em] text-ink">
              The work is done.
              <span className="block text-ink">
                Getting paid shouldn&apos;t be a second job.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-body-l text-text-soft sm:text-[1.1rem] sm:leading-8">
              Make an invoice, send one link and let Bagg do the chasing. Your
              client pays, you get a receipt, and nobody has to send &quot;just
              following up&quot; at 11pm.
            </p>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href="/signup"
                className={buttonStyles({
                  size: "lg",
                  mobileFullWidth: true,
                })}
              >
                Start free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-caption font-bold text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                No card needed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Three free sends a month
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Your client needs no account
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[34rem] lg:ml-auto lg:max-w-none">
            <div
              className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-sun"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-5 -left-5 h-24 w-24 rotate-12 border-brut border-ink bg-pink"
              aria-hidden="true"
            />

            {/* Sisi peeks over the top-right of the dashboard image */}
            <BagCharacter
              mood="happy"
              size={140}
              className="absolute -top-16 right-4 z-10 lg:-right-8 lg:-top-20"
              decorative
            />

            <div className="relative overflow-hidden border-brut border-ink bg-surface shadow-brut-lg">
              <picture>
                <source
                  srcSet="/images/marketing/hero-dashboard.webp"
                  type="image/webp"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/marketing/hero-dashboard.png"
                  alt="Bagg workspace dashboard showing active invoices, cash flow, and payment tracking"
                  width={2100}
                  height={1205}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-auto w-full object-cover"
                />
              </picture>
            </div>
          </div>
        </Container>

        <div className="border-t border-line bg-surface">
          <Container className="flex flex-wrap items-center gap-x-8 gap-y-2 py-4">
            {[
              "Client needs no account",
              "NGN · USD · GBP · EUR · CAD supported",
              "Receipts sent automatically",
            ].map((fact) => (
              <span
                key={fact}
                className="text-caption font-bold text-text-muted"
              >
                {fact}
              </span>
            ))}
          </Container>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="scroll-mt-24 bg-cream">
        <Container className="py-20 sm:py-28 lg:py-32">
          <SectionHeading
            title="Three steps. Zero chasing."
            copy="You make it. They get it. You get paid."
          />

          <MarketingGrid columns={3} gap="lg" className="mt-10">
            <WorkflowCard
              label="Create"
              title="Make it look like you."
              copy="Add your business, your client, what you're charging and how to pay you. Pick the currency and Bagg does the rest."
              tone="surface"
              sisiMood="happy"
            />
            <WorkflowCard
              label="Share"
              title="Send one link."
              copy="Drop it into WhatsApp, email, anywhere. Your client opens it and sees exactly what to pay. No sign-up, no download."
              tone="mango"
              featured
              sisiMood="excited"
            />
            <WorkflowCard
              label="Collect"
              title="Watch it land."
              copy="See when it's opened, record the payment and send a receipt. Reminders stop the second you're paid."
              tone="surface"
              sisiMood="celebrating"
            />
          </MarketingGrid>

          {/* flow-path doodle — desktop only, links the three cards visually */}
          <Doodle variant="flow-path" className="mt-2 opacity-40" />

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="relative">
              {/* curl-arrow doodle points toward the secondary CTA */}
              <Doodle
                variant="curl-arrow"
                className="absolute -left-10 -top-8 -rotate-90 opacity-60"
              />
              <Link
                href={demoInvoiceHref}
                className={buttonStyles({ variant: "link" })}
              >
                See what your client sees
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <span className="text-caption text-text-muted">
              No app. No password. Just a link.
            </span>
          </div>
        </Container>
      </section>

      {/* PRODUCT CAPABILITIES */}
      <MarketingSection spacing="large" border="both" className="bg-surface">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <SectionHeading
            title="Everything you need to get paid. Nothing you don't."
            copy="Invoices, reminders, payment tracking and receipts. No business-suite clutter."
          />
          <div className="flex justify-start lg:justify-end">
            <Link
              href="/features"
              className={buttonStyles({ variant: "link" })}
            >
              See all features
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <MarketingGrid columns={2} gap="md" className="mt-10">
          <CapabilityCard
            icon={<FileText className="h-5 w-5" />}
            title="Invoices you're proud to send"
            copy="Line items, due dates, your logo (or your initials) and the right payment details. Looks good with or without a logo."
            tag="Create"
          />
          <CapabilityCard
            icon={<Link2 className="h-5 w-5" />}
            title="One link, one clear page"
            copy="Your client sees the amount, how to pay and what happens next. That's it."
            tag="Share"
          />
          <CapabilityCard
            icon={<BellRing className="h-5 w-5" />}
            title="Reminders that do the awkward part"
            copy="Friendly nudges before and after the due date, sent for you. They stop the moment you're paid."
            tag="Follow up"
          />
          <CapabilityCard
            icon={<Wallet className="h-5 w-5" />}
            title="Know who has paid"
            copy="See what's been opened, what's part paid and what's late. When a client says they've paid, you check and confirm."
            tag="Track"
          />
          <CapabilityCard
            icon={<ReceiptText className="h-5 w-5" />}
            title="A receipt for every payment"
            copy="Each confirmed payment gets a numbered receipt you can share."
            tag="Record"
          />
          <CapabilityCard
            icon={<Globe2 className="h-5 w-5" />}
            title="Naira, dollars, pounds and more"
            copy="Invoice local clients in naira and international ones in their own currency, each with the right payment details."
            tag="Local + global"
          />
        </MarketingGrid>
      </MarketingSection>

      {/* CURRENCY */}
      <section className="bg-cream">
        <Container className="grid gap-10 py-20 sm:py-28 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-32">
          <div>
            <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
              local work. global clients.
            </p>

            <h2 className="mt-3 text-title-l text-ink sm:text-[2.5rem] sm:leading-[2.7rem]">
              Invoice in the currency your client pays in.
            </h2>

            <p className="mt-4 max-w-xl text-body-l text-text-soft">
              Whether your client is in Lagos or London, the invoice shows the
              agreed currency and the right way to pay. Nothing to convert in
              your head.
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

            {/* currency-glyphs doodle — desktop only, sits beneath the pill row */}
            <Doodle variant="currency-glyphs" className="mt-4 opacity-70" />
          </div>

          <MarketingFrame
            label="one place"
            meta="many currencies"
            caption="The right payment details go on each invoice."
          >
            <div className="grid gap-px bg-line sm:grid-cols-2">
              <div className="bg-surface p-6">
                <p className="text-caption font-extrabold uppercase text-text-muted">
                  your client sees
                </p>
                <p className="mt-3 text-title text-ink">One clear amount.</p>
                <p className="mt-2 text-body text-text-soft">
                  The currency, the balance and how to pay.
                </p>
                <div className="mt-5 border-brut border-ink bg-cream p-4 shadow-brut-sm">
                  <p className="text-caption font-bold text-text-muted">
                    Invoice total
                  </p>
                  <p className="mt-1 text-title text-ink">NGN 450,000</p>
                </div>
              </div>

              <div className="bg-surface p-6">
                <p className="text-caption font-extrabold uppercase text-text-muted">
                  you keep
                </p>
                <p className="mt-3 text-title text-ink">The full story.</p>
                <p className="mt-2 text-body text-text-soft">
                  Status, payments, client details and receipts in one place.
                </p>
                <div className="mt-5 border-brut border-ink bg-mango p-4 shadow-brut-sm">
                  <p className="text-caption font-extrabold text-on-mango/85">
                    Payment status
                  </p>
                  <p className="mt-1 text-heading text-on-mango">Part paid</p>
                </div>
              </div>
            </div>
          </MarketingFrame>
        </Container>
      </section>

      {/* AUDIENCES */}
      <section className="bg-surface">
        <Container className="py-20 sm:py-28 lg:py-32">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <SectionHeading
              title="Made for people who are their own boss."
              copy="Freelancers, consultants and small studios."
            />
            <div className="flex justify-start lg:justify-end">
              <Link
                href="/audiences"
                className={buttonStyles({ variant: "link" })}
              >
                See how Bagg fits your work
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <MarketingGrid columns={3} gap="md" className="mt-10">
            <MarketingCard
              tone="surface"
              className="flex flex-col justify-between"
            >
              <div>
                <MarketingSticker tone="pink" className="mb-4">
                  Freelancers &amp; Creators
                </MarketingSticker>
                <h3 className="text-title font-extrabold text-ink">
                  Do the work. Skip the chasing.
                </h3>
                <p className="mt-2 text-body text-text-soft">
                  You do the work and the admin. Let Bagg take the admin.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["Developers", "Designers", "Writers", "Photographers"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="border-brut-thin border-ink bg-cream px-2 py-0.5 text-caption font-bold text-text-muted"
                      >
                        {tag}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <div className="mt-6 border-t border-line pt-4">
                <Link
                  href="/audiences#independent-professionals"
                  className="inline-flex items-center gap-1.5 text-label font-bold text-ink hover:underline"
                >
                  Bagg for freelancers
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </MarketingCard>

            <MarketingCard
              tone="mango"
              className="flex flex-col justify-between"
            >
              <div>
                <MarketingSticker tone="sun" className="mb-4">
                  Consultants &amp; Advisers
                </MarketingSticker>
                <h3 className="text-title font-extrabold text-ink">
                  Formalise your expertise.
                </h3>
                <p className="mt-2 text-body text-text-soft">
                  Your expertise is the product. Get paid like it.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {[
                    "Strategy",
                    "Legal & Finance",
                    "Tech Advisors",
                    "Specialists",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="border-brut-thin border-ink bg-surface px-2 py-0.5 text-caption font-bold text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 border-t border-ink/20 pt-4">
                <Link
                  href="/audiences#consultants"
                  className="inline-flex items-center gap-1.5 text-label font-bold text-ink hover:underline"
                >
                  Bagg for consultants
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </MarketingCard>

            <MarketingCard
              tone="surface"
              className="flex flex-col justify-between"
            >
              <div>
                <MarketingSticker tone="mango" className="mb-4">
                  Creative Studios
                </MarketingSticker>
                <h3 className="text-title font-extrabold text-ink">
                  Control project cash flow.
                </h3>
                <p className="mt-2 text-body text-text-soft">
                  Deposits, part payments, final invoices. All in one place.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {[
                    "Design Studios",
                    "Production Teams",
                    "Web Agencies",
                    "Boutiques",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="border-brut-thin border-ink bg-cream px-2 py-0.5 text-caption font-bold text-text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 border-t border-line pt-4">
                <Link
                  href="/audiences#creative-studios"
                  className="inline-flex items-center gap-1.5 text-label font-bold text-ink hover:underline"
                >
                  Bagg for studios
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </MarketingCard>
          </MarketingGrid>
        </Container>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-cream">
        <Container className="py-20 sm:py-28 lg:py-32">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <SectionHeading
                title="Good questions. Straight answers."
                copy="The stuff people ask before they sign up."
              />
              <Link
                href="/help"
                className={`${buttonStyles({ variant: "link" })} mt-5`}
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
        title="Your next invoice can be the easy one."
        copy="Set up in a few minutes, make an invoice, send one link, and get back to your actual work."
        href="/signup"
        label="Start free"
        doodle
      />
    </>
  );
}

function WorkflowCard({
  label,
  title,
  copy,
  tone,
  featured = false,
  sisiMood,
}: {
  label: string;
  title: string;
  copy: string;
  tone: "surface" | "mango";
  featured?: boolean;
  sisiMood?: "happy" | "excited" | "celebrating";
}) {
  return (
    <MarketingCard tone={tone} featured={featured} className="flex flex-col">
      <p className="text-caption font-extrabold uppercase tracking-widest opacity-70">
        {label}
      </p>
      <h3 className="mt-2 text-title text-current">{title}</h3>
      <p className="mt-3 text-body text-current opacity-80">{copy}</p>
      {sisiMood && (
        <div className="mt-6 flex justify-end">
          <BagCharacter mood={sisiMood} size={80} decorative />
        </div>
      )}
    </MarketingCard>
  );
}

function CapabilityCard({
  icon,
  title,
  copy,
  tag,
}: {
  icon: React.ReactNode;
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
        <span className="border-brut-thin border-ink bg-cream px-2 py-0.5 text-caption font-bold text-text-soft">
          {tag}
        </span>
        <h3 className="mt-2 text-heading text-ink">{title}</h3>
        <p className="mt-2 text-body text-text-soft">{copy}</p>
      </div>
    </MarketingCard>
  );
}
