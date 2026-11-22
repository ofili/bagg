import Link from "next/link";
import {
  ArrowRight,
  CircleCheck,
  FileText,
  ShieldCheck,
  Users,
  Wallet,
  ReceiptText,
} from "lucide-react";

import { Container } from "@/components/marketing/container";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { PageHero } from "@/components/marketing/page-hero";
import { buttonStyles } from "@/components/ui/button";
import { marketingMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { MarketingCard } from "@/components/marketing/marketing-card";

export const metadata: Metadata = marketingMetadata({
  title: "About Bagg",
  description:
    "Discover why Bagg is building simpler invoicing and payment tracking for African freelancers, consultants and creative businesses.",
  path: "/about",
});

const workflow = [
  {
    title: "agree on the work.",
    copy: "Put the scope, price and expectations in a quote before you start.",
    icon: FileText,
    tone: "bg-pink text-on-pink",
  },
  {
    title: "make the ask clear.",
    copy: "Invoice with the right currency, due date and payment details.",
    icon: FileText,
    tone: "bg-mango text-on-mango",
  },
  {
    title: "keep it moving.",
    copy: "Share one link, watch progress and let reminders handle the awkward follow-up.",
    icon: Wallet,
    tone: "bg-sun text-on-sun",
  },
  {
    title: "close the loop.",
    copy: "Confirm the payment, keep the record and send a receipt.",
    icon: ReceiptText,
    tone: "bg-surface-tint text-text",
  },
];

const principles = [
  {
    icon: FileText,
    title: "Money first. Joy around.",
    copy: "The amount, the fee and the next step stay plain. The colour and the small moments of delight live around the edges.",
    tone: "bg-sun text-on-sun",
  },
  {
    icon: Users,
    title: "Clients should not need another account.",
    copy: "Your client should be able to open a link, understand what to pay and take the next step without creating another account.",
    tone: "bg-pink text-on-pink",
  },
  {
    icon: CircleCheck,
    title: "Status is a word, not just a colour.",
    copy: "Sent, viewed, claimed, part paid and paid. You should never have to guess what a colour or icon means.",
    tone: "bg-mango text-on-mango",
  },
  {
    icon: ShieldCheck,
    title: "Never claim what is not built.",
    copy: "If a feature is coming, we say so. If a security safeguard is not live, we do not put it on a badge.",
    tone: "bg-surface-tint text-text",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* HERO */}
      <PageHero
        layout="split"
        kicker={
          <div className="inline-flex -rotate-2 items-center border-brut border-ink bg-sun px-3 py-1.5 text-caption font-extrabold uppercase tracking-[0.14em] text-on-sun shadow-brut">
            why Bagg exists
          </div>
        }
        title={
          <>
            you do the work.
            <span className="block text-mango">
              we&apos;ll help with getting paid.
            </span>
          </>
        }
        copy={
          <>
            Bagg is an invoicing and payments tool built for African
            freelancers, consultants and studios. Quotes, invoices, payment
            tracking and receipts, all in one place.
          </>
        }
        visual={
          <div className="relative mx-auto w-full max-w-xl pb-4 pr-4">
            <div className="absolute inset-0 translate-x-3 translate-y-3 border-brut border-ink bg-pink" />
            <div className="relative border-brut border-ink bg-surface shadow-brut-lg">
              <div className="border-b-2 border-ink bg-mango p-5 text-on-mango">
                <p className="text-caption font-extrabold uppercase tracking-[0.14em]">
                  how Bagg works
                </p>
                <h2 className="mt-2 text-heading font-extrabold">
                  from &quot;yes&quot; to paid
                </h2>
              </div>
              <div className="space-y-3 p-5">
                {workflow.map((step) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.title}
                      className="flex items-start gap-4 border-brut border-ink bg-cream p-4"
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center border-brut border-ink ${step.tone}`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-body font-extrabold text-ink">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-caption leading-relaxed text-text-soft">
                          {step.copy}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t-2 border-ink bg-surface-tint px-5 py-3">
                <p className="text-caption font-bold text-text-soft">
                  One flow, start to finish.
                </p>
              </div>
            </div>
          </div>
        }
        containerClassName="lg:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/signup" className={buttonStyles({ size: "lg" })}>
            Start free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>

          <Link href="/features" className={buttonStyles({ variant: "link" })}>
            See what it does
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </PageHero>

      {/* THE PROBLEM */}
      <section className="border-b-2 border-ink bg-surface">
        <Container className="grid gap-8 py-20 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:py-32">
          <div>
            <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
              the problem
            </p>

            <h2 className="mt-3 max-w-lg text-[2.3rem] font-extrabold leading-[1.02] tracking-[-0.055em] text-ink sm:text-4xl">
              working for yourself is already a full-time job.
            </h2>
          </div>

          <div className="max-w-3xl space-y-5 text-body-l leading-relaxed text-text-soft">
            <p>
              You&apos;re the maker, the salesperson, the project manager and
              the finance department. You deliver the work, and then you still
              have to write the invoice, explain how to pay, check whether it
              was opened, chase it when it&apos;s late and keep the records
              straight.
            </p>

            <p>
              None of that is why a client hired you. And it makes talking about
              money harder than it needs to be.
            </p>

            <p className="font-bold text-ink">
              Bagg exists to take the admin out of getting paid, so you can ask
              for your money without the awkwardness.
            </p>
          </div>
        </Container>
      </section>

      {/* PRINCIPLES */}
      <MarketingSection spacing="large" border="bottom" className="bg-cream">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="how we build"
            title="a few rules we build by."
          />
          <p className="max-w-sm text-body text-text-soft">
            When the work gets complicated, the product shouldn&apos;t.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {principles.map((principle) => {
            const Icon = principle.icon;

            return (
              <MarketingCard
                key={principle.title}
                tone="surface"
                shadow="default"
                className="sm:p-7"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center border-brut border-ink shadow-brut ${principle.tone}`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <h3 className="mt-6 text-title font-extrabold tracking-tight text-ink">
                  {principle.title}
                </h3>

                <p className="mt-2 max-w-xl text-body-l leading-relaxed text-text-soft">
                  {principle.copy}
                </p>
              </MarketingCard>
            );
          })}
        </div>
      </MarketingSection>

      {/* AFRICAN CONTEXT */}
      <section className="border-b-2 border-ink bg-sun">
        <Container className="grid gap-8 py-20 sm:py-28 lg:grid-cols-2 lg:items-center lg:py-32">
          <div>
            <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-on-sun">
              built with context
            </p>

            <h2 className="mt-3 max-w-xl text-[2.5rem] font-extrabold leading-[1] tracking-[-0.055em] text-on-sun sm:text-5xl">
              made for how independent work really runs in Africa.
            </h2>
          </div>

          <div className="max-w-2xl space-y-4 text-body-l leading-relaxed text-on-sun/80">
            <p>
              You might invoice a client in Lagos in naira on Monday and one in
              London in pounds on Tuesday. Some pay by bank transfer, some by
              mobile money, some after three follow-ups on WhatsApp. Your tools
              should get that.
            </p>

            <p>
              So Bagg is built around the real workflow: clear documents, one
              shareable link, payment status you can trust and a record at the
              end.
            </p>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-cream py-20 sm:py-28 lg:py-32">
        <Container>
          <div className="relative border-brut border-ink bg-mango p-7 text-on-mango shadow-brut-lg sm:p-10 lg:p-12">
            <div className="absolute -right-2 -top-3 rotate-3 border-brut border-ink bg-pink px-3 py-2 text-caption font-extrabold uppercase text-on-pink shadow-brut">
              your next invoice
            </div>

            <div className="max-w-2xl">
              <p className="text-caption font-extrabold uppercase tracking-[0.16em]">
                make the next step simpler
              </p>

              <h2 className="mt-3 text-[2.5rem] font-extrabold leading-[1] tracking-[-0.055em] sm:text-5xl">
                spend less time chasing. spend more time building.
              </h2>

              <p className="mt-4 max-w-xl text-body-l text-on-mango/80">
                Start with your next invoice. Bagg takes it from sent to
                receipted.
              </p>

              <Link
                href="/signup"
                className={`${buttonStyles({ variant: "ink", size: "lg" })} mt-7`}
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
