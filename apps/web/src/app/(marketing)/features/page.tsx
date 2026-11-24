import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Globe2,
  ReceiptText,
  Wallet,
} from "lucide-react";

import { Container } from "@/components/marketing/container";
import { PageHero } from "@/components/marketing/page-hero";
import { FeatureSubnav } from "@/components/marketing/feature-sub-nav";
import { buttonStyles } from "@/components/ui/button";
import { currencies } from "@/content/marketing";
import { marketingMetadata } from "@/lib/metadata";
import { demoInvoiceHref } from "@/lib/site";
import { Metadata } from "next";
import { MarketingBreadcrumbStructuredData } from "@/components/marketing/marketing-structured-data";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { SectionHeading } from "@/components/marketing/section-heading";
import { BagCharacter, type BagMood } from "@/components/brand";

export const metadata: Metadata = marketingMetadata({
  title: "Invoicing, Quotes and Payment Tracking Features",
  description:
    "Explore Bagg features for creating quotes, sending invoices, tracking payments, automating reminders and issuing receipts",
  path: "/features",
});

const capabilities = [
  {
    label: "AGREE",
    title: "Agree on the work.",
    copy: "Put the scope, price and payment terms in a quote before you start.",
    href: "/features/quotes",
    link: "See quotes",
    tone: "bg-pink text-on-pink",
    icon: FileText,
    sisiMood: "thinking" as BagMood,
  },
  {
    label: "ASK",
    title: "Make the ask clear.",
    copy: "An invoice with your line items, currency, due date and how to pay.",
    href: "/features/invoicing",
    link: "See invoicing",
    tone: "bg-mango text-on-mango",
    icon: FileText,
    sisiMood: "happy" as BagMood,
  },
  {
    label: "FOLLOW UP",
    title: "Let Bagg do the nudging.",
    copy: "Share one link, watch payment progress and let reminders cover the awkward bit.",
    href: "/features/payments",
    link: "See payments",
    tone: "bg-sun text-on-sun",
    icon: Wallet,
    sisiMood: "skeptical" as BagMood,
  },
  {
    label: "CLOSE",
    title: "Close the loop.",
    copy: "Confirm the payment, see the balance and send a receipt.",
    href: "/features/receipts",
    link: "See receipts",
    tone: "bg-surface-tint text-text",
    icon: ReceiptText,
    sisiMood: "celebrating" as BagMood,
  },
];

export default function FeaturesPage() {
  return (
    <>
      <MarketingBreadcrumbStructuredData
        items={[
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
        ]}
      />
      <FeatureSubnav currentPath="/features" />
      <div>
        {/* HERO */}
        <PageHero
          layout="split"
          containerClassName="gap-12 lg:grid-cols-[1.05fr_0.95fr]"
          kicker={
            <div className="inline-flex items-center border-brut border-ink bg-sun px-3 py-1.5 text-caption font-extrabold uppercase tracking-[0.14em] text-on-sun shadow-brut-sm">
              the whole workflow
            </div>
          }
          title={
            <>
              From &quot;yes, let&apos;s do it&quot;
              <span className="block text-mango">to paid.</span>
            </>
          }
          titleClassName="text-[3.2rem] leading-[0.98] tracking-[-0.065em] sm:text-[4.5rem] lg:text-[5.25rem]"
          copy={
            <>
              Quotes, invoices, reminders and receipts, all connected, so the
              money side of your work runs without you babysitting it.
            </>
          }
          visual={
            <div className="relative mx-auto w-full max-w-[34rem] pb-5 pr-5">
              <div className="absolute right-0 top-0 h-full w-full rotate-3 border-brut border-ink bg-pink" />
              <div className="relative border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                <div className="flex items-center justify-between border-b-2 border-ink pb-4">
                  <span className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                    Your client workflow
                  </span>
                  <FileText className="h-6 w-6 text-ink" />
                </div>
                <div className="mt-5 space-y-3">
                  {capabilities.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-3 border-brut border-ink bg-cream p-4"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink ${item.tone}`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-caption font-extrabold text-text-muted">
                            {item.label}
                          </p>
                          <p className="text-body font-extrabold text-ink">
                            {item.title}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          }
        >
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className={buttonStyles({
                size: "lg",
                mobileFullWidth: true,
              })}
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href={demoInvoiceHref}
              className="inline-flex min-h-11 items-center gap-2 font-extrabold text-link underline decoration-2 underline-offset-4 hover:no-underline"
            >
              See what your client sees
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-7 text-caption font-bold uppercase tracking-[0.12em] text-text-muted">
            Built for freelancers · consultants · creators · studios
          </p>
        </PageHero>

        {/* CAPABILITY MAP */}
        <MarketingSection spacing="large" className="bg-surface">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="what's in the box"
              title="Everything you need to bill and collect."
            />
            <p className="max-w-sm text-body text-text-soft">
              Each part has one job. Together they give you a clean trail from
              the first agreement to the final payment.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {capabilities.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="group relative flex min-h-[18rem] flex-col border-brut border-ink bg-cream p-5 shadow-brut transition-transform duration-150 hover:-translate-y-1 hover:shadow-brut-lg sm:p-7"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center border-brut border-ink shadow-brut ${item.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>

                  <p className="mt-5 text-caption font-extrabold uppercase tracking-[0.14em] text-link">
                    {item.label}
                  </p>
                  <h3 className="mt-2 text-title font-extrabold tracking-tight text-ink sm:text-2xl">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-md text-body text-text-soft">
                    {item.copy}
                  </p>

                  <div className="mt-auto flex items-end justify-between pt-5">
                    <Link
                      href={item.href}
                      className="inline-flex min-h-11 items-center gap-2 text-body font-extrabold text-link underline decoration-2 underline-offset-4 group-hover:gap-3"
                    >
                      {item.link}
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    {/* §20.4 — Features hub mood placements | 80 px | desktop only */}
                    <BagCharacter
                      mood={item.sisiMood}
                      size={80}
                      className="hidden shrink-0 lg:block"
                      decorative
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </MarketingSection>

        {/* CURRENCY */}
        <section className="bg-cream py-20 sm:py-28 lg:py-32">
          <Container>
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-link">
                  work across borders
                </p>
                <h2 className="mt-3 text-title-l font-extrabold tracking-tight text-ink sm:text-4xl">
                  Your currency. Your payment details.
                </h2>
                <p className="mt-4 max-w-lg text-body-l text-text-soft">
                  Save payment details for each currency you work in. Bagg puts
                  the right ones on each invoice.
                </p>
              </div>

              <div className="border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                <div className="flex items-center gap-3">
                  <Globe2 className="h-5 w-5" />
                  <p className="text-caption font-extrabold uppercase tracking-[0.14em]">
                    Supported currencies
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {currencies.map((currency, index) => (
                    <span
                      key={currency}
                      className={`border-brut border-ink px-4 py-3 text-heading font-extrabold shadow-brut ${
                        index % 3 === 0
                          ? "bg-mango text-on-mango"
                          : index % 3 === 1
                            ? "bg-pink text-on-pink"
                            : "bg-sun text-on-sun"
                      }`}
                    >
                      {currency}
                    </span>
                  ))}
                </div>
                <p className="mt-5 text-caption text-text-muted">
                  NGN · USD · GBP · EUR · GHS · KES · ZAR
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="bg-cream py-20 sm:py-28 lg:py-32">
          <Container>
            <div className="relative border-brut border-ink bg-sun p-7 shadow-brut-lg sm:p-10">
              <div className="absolute -right-2 -top-3 rotate-3 border-brut border-ink bg-pink px-3 py-2 text-caption font-extrabold uppercase text-on-pink shadow-brut">
                Start here
              </div>
              <div className="max-w-2xl">
                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-on-sun">
                  Your next invoice
                </p>
                <h2 className="mt-3 text-[2.5rem] font-extrabold leading-[1] tracking-[-0.055em] text-on-sun sm:text-5xl">
                  Make getting paid part of the process.
                </h2>
                <p className="mt-4 max-w-xl text-body-l text-on-sun/80">
                  Start free. Make your first invoice and give your client one
                  clear page showing what&apos;s due.
                </p>
                <Link
                  href="/signup"
                  className={`${buttonStyles({ size: "lg", variant: "outline" })} mt-7`}
                >
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </div>
    </>
  );
}
