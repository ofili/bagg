import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  Check,
  Copy,
  FileText,
  Globe2,
  Link2,
  ReceiptText,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { PaidStamp } from '@/components/brand';
import { Container } from '@/components/marketing/container';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { ProductPreview } from '@/components/marketing/product-preview';
import { SectionHeading } from '@/components/marketing/section-heading';
import { Money } from '@/components/money/Money';
import { buttonStyles } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { currencies } from '@/content/marketing';
import { marketingMetadata } from '@/lib/metadata';
import { demoInvoiceHref } from '@/lib/site';

export const metadata = marketingMetadata({
  title: 'features',
  description:
    'Invoices, share links, reminders, payment records and receipts in one calm place for freelancers and creators.',
  path: '/features',
});

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        kicker="the whole get-paid loop"
        title="from first draft to paid."
        copy="bagg keeps the invoice, the link, the reminders and the record together. Your client gets one clear page. You get the whole story."
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link href="/signup" className={buttonStyles({ size: 'lg' })}>
            Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={demoInvoiceHref}
            className="inline-flex min-h-11 items-center gap-2 text-label font-bold text-link hover:underline"
          >
            See a client invoice <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </PageHero>

      <section className="bg-canvas">
        <Container className="space-y-16 py-16 sm:space-y-20 sm:py-20">
          <FeatureRow
            title="invoices that look like you."
            copy="Add your logo or initials, business name, line items and due date. The invoice carries your currency and payment details, not ours."
            bullets={[
              'Line items, tax, discounts and a clear total',
              'Bank, mobile money or payment link details',
              'PDF ready when a client asks for one',
            ]}
            visual={<InvoiceVisual />}
          />

          <FeatureRow
            reverse
            title="one link. no client account."
            copy="Share a single link on WhatsApp, email or wherever the conversation lives. Your client opens it on their phone and sees one next step."
            bullets={[
              'No password for your client',
              'One clear status, from sent to paid',
              'Opens on any phone without an app',
            ]}
            visual={<LinkVisual />}
          />

          <FeatureRow
            title="reminders that do the awkward part."
            copy="bagg sends a friendly heads-up before the due date, a nudge on the day, and a clearer follow-up when it is late. The schedule runs on its own."
            bullets={[
              'Four reminders across the due date',
              'A one-tap WhatsApp share link',
              'Reminders stop when the invoice is paid',
            ]}
            visual={<ReminderVisual />}
          />

          <FeatureRow
            reverse
            title="a clean record when the money lands."
            copy="Mark a payment as received, confirm a client’s payment claim and share a receipt without rebuilding the story in another app."
            bullets={[
              'Part payments leave the balance visible',
              'Payment claims wait for your confirmation',
              'Every receipt keeps the invoice number and method',
            ]}
            visual={<ReceiptVisual />}
          />
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-surface">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            title="seven currencies. one calm place."
            copy="Keep the payment details for each currency you use. When you write an invoice, bagg picks the right ones and shows the client a clear amount."
          />
          <div className="mt-8 flex flex-wrap gap-2">
            {currencies.map((currency) => (
              <span
                key={currency}
                className="rounded-full bg-canvas px-3 py-1.5 text-label font-extrabold text-ink-soft ring-1 ring-line"
              >
                {currency}
              </span>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Detail
              icon={<Globe2 className="h-5 w-5" />}
              title="local and international"
              copy="Bill a client in naira, dollars, pounds or euros without keeping a separate spreadsheet for each."
            />
            <Detail
              icon={<Smartphone className="h-5 w-5" />}
              title="phone first"
              copy="Your client page is built for the phone in their hand. Your workspace works on the phone in yours."
            />
            <Detail
              icon={<ShieldCheck className="h-5 w-5" />}
              title="no money held"
              copy="bagg does not hold your client’s money. It gives them the right details and gives you the record."
            />
          </div>
        </Container>
      </section>

      <section className="bg-canvas">
        <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionHeading
              title="the client side is the product."
              copy="A client should not have to learn a new tool to pay you. Open the demo invoice and see what they see."
            />
            <Link
              href={demoInvoiceHref}
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-label font-bold text-link hover:underline"
            >
              Open the demo invoice <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ProductPreview />
        </Container>
      </section>

      <CtaBand
        title="put the next invoice in one place."
        copy="Start free, send your first link and keep the follow-up out of your head."
        href="/signup"
        label="Start free"
      />
    </>
  );
}

function FeatureRow({
  title,
  copy,
  bullets,
  visual,
  reverse = false,
}: {
  title: string;
  copy: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
      <div className={reverse ? 'lg:order-2' : undefined}>
        <h2 className="text-title-l text-ink sm:text-[2rem] sm:leading-[2.15rem]">{title}</h2>
        <p className="mt-3 max-w-xl text-body-l text-ink-soft">{copy}</p>
        <ul className="mt-6 space-y-2.5">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2.5 text-body text-ink-soft">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-paid-text" aria-hidden="true" />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? 'lg:order-1' : undefined}>{visual}</div>
    </div>
  );
}

function InvoiceVisual() {
  return (
    <div className="rounded-card border border-line-subtle bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-caption font-extrabold text-ink-muted">invoice 0042</p>
          <p className="mt-1 text-heading text-ink">Ada Okafor Design</p>
          <p className="text-caption text-ink-muted">due 12 Nov 2026</p>
        </div>
        <StatusPill status="due-soon" />
      </div>
      <div className="mt-5 space-y-3">
        <LineItem label="Brand identity" amount={35000000} />
        <LineItem label="Social templates" amount={10000000} />
        <div className="flex items-center justify-between border-t border-line-subtle pt-3 text-body font-extrabold text-ink">
          <span>total</span>
          <Money amountMinor={45000000} currency="NGN" />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-row bg-sunken px-3 py-2 text-caption text-ink-soft">
        <FileText className="h-4 w-4" aria-hidden="true" />
        PDF ready
      </div>
    </div>
  );
}

function LineItem({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-body">
      <span className="text-ink-soft">{label}</span>
      <Money amountMinor={amount} currency="NGN" />
    </div>
  );
}

function LinkVisual() {
  return (
    <div className="rounded-card border border-line-subtle bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-2 text-label font-extrabold text-ink">
        <Link2 className="h-4 w-4" aria-hidden="true" />
        one link to send
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-row bg-sunken px-3 py-2.5">
        <span className="truncate font-mono text-caption text-ink-soft">bagg.app/i/0042</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
          <Copy className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {[
          ['sent', 'the link is live'],
          ['viewed', 'your client opened it'],
          ['paid', 'the money has landed'],
        ].map(([status, copy]) => (
          <div key={status} className="flex items-center gap-3 text-body text-ink-soft">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-peach-chip text-ink">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span>
              <strong className="font-extrabold text-ink">{status}</strong> · {copy}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReminderVisual() {
  return (
    <div className="rounded-card border border-line-subtle bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-2 text-label font-extrabold text-ink">
        <BellRing className="h-4 w-4" aria-hidden="true" />
        scheduled reminder
      </div>
      <div className="mt-4 rounded-row bg-sunken p-4">
        <p className="text-body text-ink-soft">
          Hi Tolu, a quick nudge: invoice 0042 for{' '}
          <Money amountMinor={45000000} currency="NGN" className="text-ink" /> was due on 12 Nov.
          Here is the link whenever you are ready.
        </p>
        <p className="mt-3 text-body text-ink-soft">Already paid? Please ignore this note.</p>
      </div>
      <p className="mt-3 text-caption text-ink-muted">Friendly tone · sends automatically</p>
    </div>
  );
}

function ReceiptVisual() {
  return (
    <div className="rounded-card border border-line-subtle bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-caption font-extrabold text-ink-muted">receipt REC-0019</p>
          <p className="mt-1 text-heading text-ink">payment received</p>
        </div>
        <PaidStamp />
      </div>
      <div className="mt-5 rounded-row bg-sunken p-4">
        <p className="text-caption font-extrabold text-ink-soft">amount paid</p>
        <p className="mt-1 text-amount-l text-ink">
          <Money amountMinor={45000000} currency="NGN" />
        </p>
        <p className="mt-2 text-caption text-ink-muted">bank transfer · 14 Nov 2026</p>
      </div>
      <div className="mt-4 flex items-center gap-2 text-caption text-ink-soft">
        <ReceiptText className="h-4 w-4" aria-hidden="true" />
        download or share the receipt
      </div>
    </div>
  );
}

function Detail({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
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
