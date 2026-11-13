
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  HelpCircle,
  Mail,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';

import { ContactForm } from '@/components/marketing/contact-form';
import { Container } from '@/components/marketing/container';
import { marketingMetadata } from '@/lib/metadata';
import { contactEmail, securityEmail } from '@/lib/site';
import {Metadata} from "next";

export const metadata: Metadata = marketingMetadata({
  title: 'Contact Bagg',
  description:
      'Contact Bagg about your account, an invoice, a payment or a security concern.',
  path: '/contact',
});

const contactRoutes = [
  {
    number: '01',
    title: 'General support',
    description:
        'Account access, invoices, quotes, payments, receipts and reminders.',
    email: contactEmail,
    icon: Mail,
    background: 'bg-mango',
  },
  {
    number: '02',
    title: 'Security reports',
    description:
        'Suspicious invoices, unauthorised links, account security and vulnerability reports.',
    email: securityEmail,
    icon: ShieldCheck,
    background: 'bg-pink',
  },
];

const writingTips = [
  'Tell us what you were trying to do.',
  'Describe what happened and what you expected.',
  'Include the invoice or quote link when relevant.',
  'Never share passwords, card numbers or one-time codes.',
];

export default function ContactPage() {
  return (
      <main className="bg-cream">
        {/* HERO */}
        <section className="border-b-2 border-ink bg-mango">
          <Container className="py-14 sm:py-20 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.7fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 border-2 border-ink bg-surface px-3 py-2 shadow-brut">
                  <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                  <span className="text-caption font-extrabold uppercase tracking-wide text-ink">
                  Talk to a person
                </span>
                </div>

                <h1 className="mt-7 max-w-3xl text-title-l leading-[0.98] text-ink sm:text-[4.5rem] lg:text-[5.2rem]">
                  Need a hand?
                  <span className="mt-2 block">Let's sort it</span>
                  <span className="mt-2 inline-block -rotate-1 border-2 border-ink bg-surface px-3 pb-2 shadow-brut-lg">
                  together.
                </span>
                </h1>
              </div>

              <div className="max-w-xl lg:justify-self-end">
                <p className="text-body-l text-ink">
                  Something not working? Have a question about an invoice or
                  payment? Or just want to tell us something?
                </p>
                <p className="mt-4 text-body font-semibold text-ink">
                  Send us a message. Give us enough context to understand the
                  problem, and we’ll take it from there.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* CONTACT FORM AND CONTACT ROUTES */}
        <section className="border-b-2 border-ink bg-cream">
          <Container className="grid min-w-0 gap-10 py-14 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
            {/* FORM */}
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                    Get in touch
                  </p>
                  <h2 className="mt-2 text-title-l text-ink">
                    Send us a message.
                  </h2>
                </div>
                <span className="hidden h-12 w-12 shrink-0 items-center justify-center border-2 border-ink bg-mango shadow-brut sm:flex">
                <Mail className="h-6 w-6 text-ink" aria-hidden="true" />
              </span>
              </div>

              <p className="mt-4 max-w-xl text-body text-text-soft">
                Complete the form below. We’ll prepare an email with your
                details so you can review and send it from your email app.
              </p>

              <div className="mt-8 border-2 border-ink bg-surface p-5 shadow-brut sm:p-8">
                <ContactForm />
              </div>
            </div>

            {/* CONTACT ROUTES */}
            <aside className="min-w-0">
              <p className="text-caption font-extrabold uppercase tracking-wide text-text-muted">
                Choose the right route
              </p>
              <h2 className="mt-2 text-title text-ink">
                Get to the right inbox.
              </h2>

              <div className="mt-6 space-y-4">
                {contactRoutes.map((route) => {
                  const Icon = route.icon;

                  return (
                      <div
                          key={route.number}
                          className="border-2 border-ink bg-surface shadow-brut"
                      >
                        <div
                            className={`flex items-center justify-between gap-4 border-b-2 border-ink ${route.background} px-5 py-4`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-surface">
                          <Icon
                              className="h-5 w-5 text-ink"
                              aria-hidden="true"
                          />
                        </span>
                            <h3 className="text-heading text-ink">
                              {route.title}
                            </h3>
                          </div>
                          <span className="text-caption font-extrabold text-ink">
                        {route.number}
                      </span>
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
              <div className="mt-6 border-2 border-ink bg-pink p-5 shadow-brut">
                <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-surface">
                  <HelpCircle
                      className="h-5 w-5 text-ink"
                      aria-hidden="true"
                  />
                </span>
                  <h3 className="text-heading text-ink">
                    Looking for a quick answer?
                  </h3>
                </div>

                <p className="mt-4 text-body text-ink">
                  You may find what you need in the Help Centre without having
                  to send a message.
                </p>

                <Link
                    href="/help"
                    className="mt-5 inline-flex min-h-11 items-center gap-2 border-2 border-ink bg-surface px-4 text-label font-extrabold text-ink transition-transform hover:-translate-y-1"
                >
                  Visit the Help Centre
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </aside>
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
                A little context goes a long way.
              </h2>
              <p className="mt-4 max-w-md text-body-l text-text-soft">
                The more clearly you describe what happened, the easier it is
                for us to understand the issue.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {writingTips.map((tip, index) => (
                  <div
                      key={tip}
                      className="flex gap-4 border-2 border-ink bg-cream p-4"
                  >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-mango text-caption font-extrabold text-ink">
                  0{index + 1}
                </span>
                    <p className="self-center text-body font-semibold text-ink">
                      {tip}
                    </p>
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
                <p className="text-caption font-extrabold uppercase tracking-wide text-ink">
                  Prefer to find the answer yourself?
                </p>
                <h2 className="mt-3 text-title-l text-ink">
                  Start with the Help Centre.
                </h2>
                <p className="mt-3 max-w-2xl text-body-l text-ink">
                  Browse guidance on getting started, managing documents,
                  tracking payments and using your Bagg account.
                </p>
              </div>

              <Link
                  href="/help"
                  className="inline-flex min-h-12 items-center justify-center gap-3 border-2 border-ink bg-ink px-6 text-label font-extrabold text-surface shadow-brut transition-transform hover:-translate-y-1"
              >
                Explore help
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Container>
        </section>
      </main>
  );
}
