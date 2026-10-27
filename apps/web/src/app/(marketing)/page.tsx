import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  Check,
  FileText,
  Link2,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { CoinLogo, PaidStamp } from '@/components/brand';
import { Container } from '@/components/marketing/container';
import { CtaBand } from '@/components/marketing/cta-band';
import { FaqList } from '@/components/marketing/faq-list';
import { ProductPreview } from '@/components/marketing/product-preview';
import { SectionHeading } from '@/components/marketing/section-heading';
import { buttonStyles } from '@/components/ui/button';
import { Money } from '@/components/money/Money';
import { currencies, homeFaqs } from '@/content/marketing';
import { defaultMarketingMetadata } from '@/lib/metadata';
import { demoInvoiceHref } from '@/lib/site';

export const metadata = defaultMarketingMetadata;

export default function MarketingPage() {
  return (
    <>
      <section className="border-b border-line-subtle bg-canvas">
        <Container className="grid items-center gap-14 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
          <div>
            <span className="inline-flex rounded-full bg-peach-chip px-3 py-1 text-caption font-extrabold text-ink-soft">
              built for African freelancers and creators
            </span>
            <h1 className="mt-5 text-display text-ink sm:text-[3.5rem] sm:leading-[1.02]">
              send. chase.
              <br />
              get paid.
            </h1>
            <p className="mt-5 max-w-xl text-body-l text-ink-soft">
              Make an invoice that looks like you, send one link to your client, and keep every
              payment, reminder and receipt in one calm place.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link href="/signup" className={buttonStyles({ size: 'lg' })}>
                Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex min-h-11 items-center text-label font-bold text-link hover:underline"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-caption text-ink-muted">
              No card needed. Three free PDF or email sends to start.
            </p>
          </div>

          <ProductPreview />
        </Container>
      </section>

      <section className="border-b border-line-subtle bg-surface">
        <Container className="grid gap-8 py-12 md:grid-cols-3">
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach-chip text-ink">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-heading text-ink">you finish the work. then the admin starts.</h2>
            <p className="mt-1 text-body text-ink-soft">
              The invoice, the account number and the follow-up live in different apps.
            </p>
          </div>
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach-chip text-ink">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-heading text-ink">the follow-up should not feel awkward.</h2>
            <p className="mt-1 text-body text-ink-soft">
              You want the money. You do not want to spend the evening writing the same polite
              message.
            </p>
          </div>
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach-chip text-ink">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-heading text-ink">paid, maybe. the record still matters.</h2>
            <p className="mt-1 text-body text-ink-soft">
              When the money lands, you need a receipt and a clear history, not a screenshot in your
              camera roll.
            </p>
          </div>
        </Container>
      </section>

      <section id="how-it-works" className="scroll-mt-24 bg-canvas">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            title="from “i’ll send it tonight” to paid."
            copy="Three steps. No client password. No new app for them to download."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Step
              number="01"
              title="make it yours."
              copy="Add your business name, line items, due date and the payment details for the currency you are billing in."
            />
            <Step
              number="02"
              title="send one link."
              copy="Share it on WhatsApp, by email or anywhere else. Your client opens the page and sees exactly how to pay."
            />
            <Step
              number="03"
              title="get paid, then stop chasing."
              copy="Record the payment, send a receipt and let reminders take care of the awkward part."
            />
          </div>

          <div className="mt-8">
            <Link
              href={demoInvoiceHref}
              className="inline-flex min-h-11 items-center gap-2 text-label font-bold text-link hover:underline"
            >
              Open a client invoice <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-surface">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            title="everything between the work and the money."
            copy="One place for the invoice, the link, the reminder and the record."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature
              icon={<FileText className="h-5 w-5" />}
              title="invoices that look like you"
              copy="Your business name, your currency, your bank or mobile money details. PDF ready."
            />
            <Feature
              icon={<Link2 className="h-5 w-5" />}
              title="one link, no client account"
              copy="Your client opens it on their phone and sees the amount, the balance and how to pay."
            />
            <Feature
              icon={<BellRing className="h-5 w-5" />}
              title="polite chasing"
              copy="Friendly reminders before and after the due date, so you do not have to send the same message twice."
            />
            <Feature
              icon={<ReceiptText className="h-5 w-5" />}
              title="a receipt for the record"
              copy="When payment is confirmed, a clean receipt is ready to share or keep for your books."
            />
          </div>

          <div className="mt-4 rounded-card border border-line-subtle bg-peach p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-heading text-ink">
                  the money stays between you and your client.
                </h3>
                <p className="mt-1 text-body text-ink-soft">
                  bagg helps you ask, record and receipt a payment. It does not hold your client’s
                  money.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-canvas">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <SectionHeading
                title="money in the currencies you already use."
                copy="Keep separate payment details for each currency. bagg attaches the right ones to every invoice."
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {currencies.map((currency) => (
                  <span
                    key={currency}
                    className="rounded-full bg-surface px-3 py-1 text-caption font-extrabold text-ink-soft ring-1 ring-line"
                  >
                    {currency}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-line-subtle bg-surface p-5">
                <p className="text-caption font-extrabold text-ink-muted">client sees</p>
                <p className="mt-1 text-heading text-ink">one clear amount</p>
                <p className="mt-2 text-body text-ink-soft">
                  No login. No guessing which account. Just the invoice, the balance and how to pay.
                </p>
              </div>
              <div className="rounded-card border border-line-subtle bg-surface p-5">
                <p className="text-caption font-extrabold text-ink-muted">you see</p>
                <p className="mt-1 text-heading text-ink">the whole story</p>
                <p className="mt-2 text-body text-ink-soft">
                  Sent, viewed, claimed, part paid, paid. Every status has a word, not just a
                  colour.
                </p>
              </div>
              <div className="rounded-card border border-line-subtle bg-surface p-5 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink">
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-heading text-ink">one workspace, every client</p>
                    <p className="mt-1 text-body text-ink-soft">
                      Quotes, invoices, clients and receipts stay together, so you can find the
                      thread when a client asks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-peach">
        <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-ink">
              <BellRing className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-title-l text-ink sm:text-[2rem] sm:leading-[2.15rem]">
              reminders that do the awkward part.
            </h2>
            <p className="mt-3 max-w-xl text-body-l text-ink-soft">
              A friendly heads-up before the due date, a nudge on the day and a clearer follow-up
              when it is late. Reminders stop as soon as the invoice is paid.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'A heads-up before the due date',
                'A nudge on the day it is due',
                'A clearer follow-up when it is late',
                'A stop the moment the money lands',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-body text-ink-soft">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-paid-text">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-card border border-line-subtle bg-surface p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CoinLogo size={26} />
                <span className="text-label font-extrabold text-ink">a reminder from you</span>
              </div>
              <span className="rounded-full bg-pill-due px-2 py-0.5 text-caption font-extrabold text-pill-due-fg">
                scheduled
              </span>
            </div>
            <div className="mt-5 rounded-row bg-sunken p-4">
              <p className="text-body text-ink-soft">
                Hi Tolu, a quick heads-up: invoice 0041 for{' '}
                <Money amountMinor={45000000} currency="NGN" className="text-ink" /> is due on 22
                Oct.
              </p>
              <p className="mt-3 text-body text-ink-soft">
                Here is the link whenever you are ready.
              </p>
            </div>
            <p className="mt-3 text-caption text-ink-muted">
              Already paid? Please ignore this note.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line-subtle pt-4">
              <span className="inline-flex items-center gap-2 text-caption font-extrabold text-ink-soft">
                <PaidStamp label="paid" /> stops automatically
              </span>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-canvas">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            title="what we’re building next."
            copy="These are not live yet. We will label them clearly when they are."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <ComingNext
              title="integrated payments"
              copy="Let a client pay from the invoice while the money settles directly to you."
            />
            <ComingNext
              title="projects and milestones"
              copy="Split a project into deposits and milestones, with one clear balance at the end."
            />
            <ComingNext
              title="contracts and delivery"
              copy="Keep the scope, the files and the final release in the same place as the money."
            />
          </div>
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-surface">
        <Container className="grid gap-6 py-14 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-title-l text-ink">start free. see every fee before it counts.</h2>
            <p className="mt-2 max-w-2xl text-body-l text-ink-soft">
              Pricing is being finalised. Start with three free sends, and we will show any fee and
              the amount you receive before you confirm a payment.
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center gap-2 text-label font-bold text-link hover:underline"
          >
            See pricing <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Container>
      </section>

      <section className="bg-canvas">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <SectionHeading
                title="questions, answered."
                copy="The short version. The help centre has the longer one."
              />
              <Link
                href="/help"
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-label font-bold text-link hover:underline"
              >
                Visit the help centre <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <FaqList items={homeFaqs} />
          </div>
        </Container>
      </section>

      <CtaBand
        title="start with the next invoice."
        copy="Draft it now, send when you are ready. Three free PDF or email sends are included."
        href="/signup"
        label="Start free"
      />
    </>
  );
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return (
    <div className="rounded-card border border-line-subtle bg-surface p-5 sm:p-6">
      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-mango px-2 text-caption font-extrabold text-on-mango">
        {number}
      </span>
      <h3 className="mt-4 text-heading text-ink">{title}</h3>
      <p className="mt-1 text-body text-ink-soft">{copy}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-card border border-line-subtle bg-canvas p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach-chip text-ink">
        {icon}
      </span>
      <h3 className="mt-4 text-heading text-ink">{title}</h3>
      <p className="mt-1 text-body text-ink-soft">{copy}</p>
    </div>
  );
}

function ComingNext({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface p-5">
      <span className="inline-flex rounded-full bg-tint px-2.5 py-0.5 text-caption font-extrabold text-ink-soft">
        coming next
      </span>
      <h3 className="mt-4 text-heading text-ink">{title}</h3>
      <p className="mt-1 text-body text-ink-soft">{copy}</p>
    </div>
  );
}
