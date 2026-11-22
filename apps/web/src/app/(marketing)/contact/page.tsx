import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  HelpCircle,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import { Container } from "@/components/marketing/container";
import { buttonStyles } from "@/components/ui/button";
import { marketingMetadata } from "@/lib/metadata";
import { contactEmail, securityEmail } from "@/lib/site";
import { Metadata } from "next";

export const metadata: Metadata = marketingMetadata({
  title: "Contact Bagg",
  description:
    "Contact Bagg about your account, an invoice, a payment or a security concern.",
  path: "/contact",
});

const contactRoutes = [
  {
    title: "General support",
    description:
      "Account access, invoices, quotes, payments, receipts and reminders.",
    email: contactEmail,
    icon: Mail,
    tone: "bg-mango text-on-mango",
  },
  {
    title: "Security reports",
    description:
      "Suspicious invoices, links that shouldn't be out there, account security and vulnerability reports.",
    email: securityEmail,
    icon: ShieldCheck,
    tone: "bg-pink text-on-pink",
  },
];

const writingTips = [
  "Tell us what you were trying to do.",
  "Describe what happened and what you expected.",
  "Include the invoice or quote link if it's relevant.",
  "Never share passwords, card numbers or one-time codes.",
];

export default function ContactPage() {
  return (
    <div className="bg-cream">
      {/* HERO */}
      <section className="border-b-2 border-ink bg-mango">
        <Container className="py-14 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 border-brut border-ink bg-surface px-3 py-2 shadow-brut">
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                <span className="text-caption font-extrabold uppercase tracking-wide text-ink">
                  Talk to a person
                </span>
              </div>

              <h1 className="mt-7 max-w-3xl text-title-l leading-[0.98] text-on-mango sm:text-[4.5rem] lg:text-[5.2rem]">
                Need a hand?
                <span className="mt-2 block">Let&apos;s sort it</span>
                <span className="mt-2 inline-block -rotate-1 border-brut border-ink bg-surface px-3 pb-2 shadow-brut-lg">
                  together.
                </span>
              </h1>
            </div>

            <div className="max-w-xl lg:justify-self-end">
              <p className="text-body-l text-on-mango">
                Something broken? A question about an invoice or a payment? Or
                just something you want to tell us? Write to us.
              </p>
              <p className="mt-4 text-body font-semibold text-on-mango">
                Tell us what happened and we&apos;ll take it from there.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* CONTACT ROUTES */}
      <section className="border-b-2 border-ink bg-cream">
        <Container className="min-w-0 py-14 sm:py-16 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
              Get in touch
            </p>
            <h2 className="mt-2 text-title-l text-ink">
              Email the right inbox.
            </h2>
            <p className="mt-4 text-body text-text-soft">
              There&apos;s no form to fill in. Write to the address that fits
              your question and give us a bit of context.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {contactRoutes.map((route) => {
              const Icon = route.icon;

              return (
                <div
                  key={route.title}
                  className="border-brut border-ink bg-surface shadow-brut"
                >
                  <div
                    className={`flex items-center gap-4 border-b-2 border-ink ${route.tone} px-5 py-4`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink bg-surface">
                      <Icon className="h-5 w-5 text-ink" aria-hidden="true" />
                    </span>
                    <h3 className="text-heading">{route.title}</h3>
                  </div>

                  <div className="p-5">
                    <p className="text-body text-text-soft">
                      {route.description}
                    </p>
                    <a
                      href={`mailto:${route.email}`}
                      className="mt-5 inline-flex min-h-11 max-w-full items-center gap-2 break-all text-body font-extrabold text-link hover:underline"
                    >
                      {route.email}
                      <ArrowUpRight
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* HELP CENTRE */}
          <div className="mt-6 border-brut border-ink bg-pink p-5 text-on-pink shadow-brut sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border-brut border-ink bg-surface">
                <HelpCircle className="h-5 w-5 text-ink" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-heading">Looking for a quick answer?</h3>
                <p className="mt-1 text-body">
                  The Help Centre might save you the wait.
                </p>
              </div>
            </div>

            <Link
              href="/help"
              className={`${buttonStyles({ variant: "outline" })} mt-5 shrink-0 sm:mt-0`}
            >
              Visit the Help Centre
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      {/* HOW TO WRITE A USEFUL MESSAGE */}
      <section className="border-b-2 border-ink bg-surface">
        <Container className="grid gap-10 py-14 sm:py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
          <div>
            <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
              Help us help you
            </p>
            <h2 className="mt-3 text-title-l text-ink">
              a little context goes a long way.
            </h2>
            <p className="mt-4 max-w-md text-body-l text-text-soft">
              The clearer you are about what happened, the faster we can fix it.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {writingTips.map((tip) => (
              <div key={tip} className="border-brut border-ink bg-cream p-4">
                <p className="text-body font-semibold text-ink">{tip}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FINAL CTA */}
      <section className="bg-mango">
        <Container className="py-14 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-caption font-extrabold uppercase tracking-wide text-on-mango">
                Prefer to find the answer yourself?
              </p>
              <h2 className="mt-3 text-title-l text-on-mango">
                Start with the Help Centre.
              </h2>
              <p className="mt-3 max-w-2xl text-body-l text-on-mango">
                Guides on getting started, managing documents, tracking payments
                and your account.
              </p>
            </div>

            <Link
              href="/help"
              className={buttonStyles({ variant: "ink", size: "lg" })}
            >
              Explore help
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
