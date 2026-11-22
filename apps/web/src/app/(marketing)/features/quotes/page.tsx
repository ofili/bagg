import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  MessageSquare,
  Wallet,
} from "lucide-react";
import { Container } from "@/components/marketing/container";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { PageHero } from "@/components/marketing/page-hero";
import { FeatureSubnav } from "@/components/marketing/feature-sub-nav";
import { buttonStyles } from "@/components/ui/button";
import { marketingMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { MarketingBreadcrumbStructuredData } from "@/components/marketing/marketing-structured-data";

export const metadata: Metadata = marketingMetadata({
  title: "Quotation Software for Freelancers",
  description:
    "Prepare professional quotes, agree commercial terms with clients and convert accepted quotes into invoices.",
  path: "/features/quotes",
});

export default function QuotesPage() {
  return (
    <>
      <MarketingBreadcrumbStructuredData
        items={[
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
          { name: "Quotes", path: "/features/quotes" },
        ]}
      />

      <FeatureSubnav currentPath="/features/quotes" />

      <div>
        <PageHero
          layout="split"
          containerClassName="gap-12 lg:grid-cols-[0.95fr_1.05fr]"
          kicker={
            <span className="inline-flex -rotate-2 border-brut border-ink bg-sun px-3 py-1.5 text-caption font-extrabold uppercase tracking-[0.14em] text-on-sun shadow-brut">
              Quotes and proposals
            </span>
          }
          title={
            <>
              agree on the work.
              <span className="block text-mango">then get started.</span>
            </>
          }
          titleClassName="text-[3.2rem] leading-[0.98] tracking-[-0.065em] sm:text-[4.5rem]"
          copy={
            <>
              Put scope, price and payment terms in writing. Your client reviews
              and replies, and the accepted quote turns into an invoice.
            </>
          }
          visual={
            <div className="relative mx-auto w-full max-w-[36rem] pb-5 pr-5">
              <div className="absolute inset-0 -rotate-3 border-brut border-ink bg-pink" />
              <div className="relative border-brut border-ink bg-surface p-5 shadow-brut-lg sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-5">
                  <div>
                    <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-text-muted">
                      Commercial document
                    </p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
                      QUOTATION
                    </h2>
                    <p className="mt-1 font-mono text-caption text-text-muted">
                      QT-0001
                    </p>
                  </div>
                  <span className="border-brut border-ink bg-sun px-3 py-2 text-caption font-extrabold uppercase text-on-sun shadow-brut">
                    For review
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-5 py-5">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-muted">
                      Prepared by
                    </p>
                    <p className="mt-1 font-extrabold text-ink">
                      Your business
                    </p>
                    <p className="text-caption text-text-muted">
                      Your business details
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-text-muted">
                      Prepared for
                    </p>
                    <p className="mt-1 font-extrabold text-ink">Your client</p>
                    <p className="text-caption text-text-muted">
                      Client details
                    </p>
                  </div>
                </div>

                <div className="border-y border-ink/20 py-3">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-muted">
                    Proposed work
                  </p>
                  <div className="mt-4 space-y-4">
                    <QuoteLine
                      title="Project scope"
                      description="Deliverables and agreed work"
                    />
                    <QuoteLine
                      title="Additional services"
                      description="Optional or supporting work"
                    />
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-caption font-bold text-text-muted">
                      Proposed total
                    </p>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
                      NGN 000,000
                    </p>
                  </div>
                  <div className="border-brut border-ink bg-pink px-3 py-2 text-caption font-extrabold uppercase text-on-pink shadow-brut">
                    14 days validity
                  </div>
                </div>

                <div className="mt-5 border-t-2 border-ink pt-4">
                  <p className="text-caption font-bold text-text-muted">
                    Client response
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="border-brut border-ink bg-mango px-3 py-3 text-center text-caption font-extrabold uppercase text-on-mango shadow-brut">
                      Accept quote
                    </div>
                    <div className="border-brut border-ink bg-surface px-3 py-3 text-center text-caption font-extrabold uppercase text-ink shadow-brut">
                      Request review
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-1 -left-2 -rotate-6 border-brut border-ink bg-sun px-3 py-2 text-caption font-extrabold uppercase text-on-sun shadow-brut">
                agree before you deliver.
              </div>
            </div>
          }
        >
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={buttonStyles({
                size: "lg",
                variant: "primary",
                mobileFullWidth: true,
              })}
            >
              Start free
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>

            <Link
              href="/features/receipts"
              className={buttonStyles({
                size: "lg",
                variant: "outline",
                mobileFullWidth: true,
              })}
            >
              See receipts
              <ArrowUpRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </PageHero>

        <MarketingSection
          spacing="large"
          border="both"
          className="bg-pink text-on-pink"
        >
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-[0.16em]">
                your client can reply
              </p>
              <h2 className="mt-3 text-title-l font-extrabold tracking-tight sm:text-4xl">
                give your client a way to answer.
              </h2>
              <p className="mt-4 max-w-xl text-body-l text-on-pink/80">
                They can accept, decline or ask for changes, right on the quote.
                Comments stay attached, so the conversation doesn&apos;t get
                lost in your DMs.
              </p>
            </div>

            <div className="border-brut border-ink bg-surface p-5 text-text shadow-brut-lg sm:p-7">
              <p className="text-caption font-extrabold uppercase tracking-[0.14em] text-text-muted">
                What your client can do
              </p>

              <div className="mt-5 space-y-3">
                <ResponseOption
                  icon={<Check className="h-5 w-5" />}
                  title="Accept the quote"
                  copy="They're happy with the terms."
                  tone="bg-mango text-on-mango"
                />
                <ResponseOption
                  icon={<MessageSquare className="h-5 w-5" />}
                  title="Request changes"
                  copy="Ask for a tweak or a clarification."
                  tone="bg-sun text-on-sun"
                />
                <ResponseOption
                  icon={<ArrowRight className="h-5 w-5" />}
                  title="Decline the quote"
                  copy="Record that this one isn't going ahead."
                  tone="bg-pink text-on-pink"
                />
              </div>

              <div className="mt-5 border-t-2 border-ink pt-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink bg-surface-tint">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-extrabold text-ink">
                      keep the conversation with the quote.
                    </p>
                    <p className="mt-1 text-caption text-text-muted">
                      Comments and change requests stay attached to the
                      document.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </MarketingSection>

        <MarketingSection
          spacing="large"
          border="both"
          className="bg-mango text-on-mango"
        >
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-[0.16em]">
                from yes to invoice
              </p>
              <h2 className="mt-3 text-title-l font-extrabold tracking-tight sm:text-4xl">
                accepted? turn it into an invoice.
              </h2>
              <p className="mt-4 max-w-xl text-body-l text-on-mango/80">
                Once your client accepts, convert the quote into an invoice in
                one step. It&apos;s your call when billing starts.
              </p>
            </div>

            <div className="border-brut border-ink bg-surface p-5 text-text shadow-brut-lg sm:p-7">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="border-brut border-ink bg-pink p-4 text-on-pink">
                  <FileText className="h-6 w-6" />
                  <p className="mt-4 font-extrabold">Accepted quote</p>
                  <p className="mt-1 text-caption text-on-pink/80">
                    Terms agreed
                  </p>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 rotate-90 sm:rotate-0" />
                </div>

                <div className="border-brut border-ink bg-sun p-4 text-on-sun">
                  <Wallet className="h-6 w-6" />
                  <p className="mt-4 font-extrabold">Invoice</p>
                  <p className="mt-1 text-caption text-on-sun/80">
                    Ready to bill
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t-2 border-ink pt-4">
                <p className="font-extrabold text-ink">
                  accepting doesn&apos;t invoice automatically.
                </p>
                <p className="mt-1 text-caption text-text-muted">
                  You decide when to convert it.
                </p>
              </div>
            </div>
          </div>
        </MarketingSection>

        <section className="bg-cream py-20 sm:py-28">
          <Container>
            <div className="relative border-brut border-ink bg-sun p-7 shadow-brut-lg sm:p-10">
              <span className="absolute -right-2 -top-3 rotate-3 border-brut border-ink bg-pink px-3 py-2 text-caption font-extrabold uppercase text-on-pink shadow-brut">
                start clear
              </span>

              <div className="max-w-2xl">
                <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-on-sun">
                  before the work begins
                </p>
                <h2 className="mt-3 text-[2.5rem] font-extrabold leading-[1] tracking-[-0.055em] text-on-sun sm:text-5xl">
                  put the agreement in writing.
                </h2>
                <p className="mt-4 max-w-xl text-body-l text-on-sun/80">
                  Make a quote, share it and keep the price conversation
                  attached to the work.
                </p>
                <Link
                  href="/signup"
                  className={`${buttonStyles({ size: "lg", variant: "outline" })} mt-7`}
                >
                  Make a quote <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </div>
    </>
  );
}

function QuoteLine({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-extrabold text-ink">{title}</p>
        <p className="text-caption text-text-muted">{description}</p>
      </div>
      <span className="font-mono text-caption font-bold text-text">
        000,000
      </span>
    </div>
  );
}

function ResponseOption({
  icon,
  title,
  copy,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 border-brut border-ink bg-cream p-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink shadow-brut ${tone}`}
      >
        {icon}
      </span>
      <div>
        <p className="font-extrabold text-ink">{title}</p>
        <p className="text-caption text-text-muted">{copy}</p>
      </div>
    </div>
  );
}
