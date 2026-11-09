import Link from 'next/link';
import { ArrowRight, Check, Clock, Info, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { CtaBand } from '@/components/marketing/cta-band';
import { FaqList } from '@/components/marketing/faq-list';
import { PageHero } from '@/components/marketing/page-hero';
import { SectionHeading } from '@/components/marketing/section-heading';
import { buttonStyles } from '@/components/ui/button';
import { freePlanFeatures } from '@/content/marketing';
import { marketingMetadata } from '@/lib/metadata';

export const metadata = marketingMetadata({
  title: 'pricing',
  description:
    'Start bagg free. Transparent pricing with Creator Pro for growing businesses and freelancers.',
  path: '/pricing',
});

const pricingFaqs = [
  {
    question: 'Can I use bagg without paying?',
    answer:
      'Yes. You can create an account, draft invoices, add clients and use three free PDF or email sends each month without adding a card.',
  },
  {
    question: 'What is included in Creator Pro?',
    answer:
      'Creator Pro gives you unlimited invoice and quote sends, watermark-free PDFs, recurring schedule automation, statement of accounts, automated reminders and direct Paystack online checkout.',
  },
  {
    question: 'Will I see a fee before I confirm a payment?',
    answer:
      'Yes. Any fee and the amount you will receive is always shown before you confirm. We never hide a fee inside a total.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer:
      'Yes. You can stop auto-renewal at any time from your settings. You retain Creator Pro access until the end of your billing cycle.',
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        kicker="start free, scale when ready"
        title="simple pricing. no surprises."
        copy="Start free with essential invoicing tools. Upgrade to Creator Pro when you need unlimited sends, custom automation, and watermark-free documents."
      >
        <Link href="/signup" className={buttonStyles({ size: 'lg' })}>
          Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </PageHero>

      <section className="bg-canvas">
        <Container className="py-12 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Free Tier */}
            <div className="rounded-card border border-line-subtle bg-surface p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-extrabold text-ink-muted">free</p>
                  <h2 className="mt-1 text-title-l font-black text-ink">Free</h2>
                </div>
                <span className="rounded-full bg-pill-paid px-3 py-1 text-caption font-extrabold text-pill-paid-fg">
                  ₦0 / month
                </span>
              </div>
              <p className="mt-4 text-body-l text-ink-soft">
                Make the invoice, share the link and keep the record. No card needed.
              </p>
              <ul className="mt-6 space-y-3">
                {freePlanFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-body text-ink-soft">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-paid-text" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`${buttonStyles()} mt-7 w-full`}
              >
                Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="mt-3 text-caption text-ink-muted">No card needed.</p>
            </div>

            {/* Creator Pro Tier */}
            <div className="rounded-card border-brut border-ink bg-surface p-6 shadow-brut-sm sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-extrabold text-ink-muted">pro</p>
                  <h2 className="mt-1 text-title-l font-black text-ink">Creator Pro</h2>
                </div>
                <span className="rounded-full bg-mango px-3 py-1 text-caption font-extrabold text-on-mango">
                  ₦12,000 / mo
                </span>
              </div>
              <p className="mt-4 text-body-l text-ink-soft">
                For active freelancers and studios who send invoices and quotes regularly.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'Unlimited invoice and quote sends',
                  'Watermark-free clean PDF exports',
                  'Recurring invoice schedules and automation',
                  'Client statements of account & ledger',
                  'Automated email reminders and WhatsApp nudges',
                  'Direct Paystack online payments checkout',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-body text-ink-soft">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-paid-text" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?plan=creator_pro"
                className={`${buttonStyles({ variant: 'accent' })} mt-7 w-full`}
              >
                Get Creator Pro <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="mt-3 text-caption text-ink-muted">Cancel anytime from settings.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-surface">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            title="what you will always see."
            copy="Money copy stays calm and exact. No fee should arrive as a surprise after the fact."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <PricePromise
              icon={<Info className="h-5 w-5" />}
              title="the fee, before the confirm button"
              copy="If a fee applies, it appears with the amount before you commit."
            />
            <PricePromise
              icon={<ShieldCheck className="h-5 w-5" />}
              title="the amount you receive"
              copy="You see what lands, not only what the client pays."
            />
            <PricePromise
              icon={<Clock className="h-5 w-5" />}
              title="notice before a change"
              copy="No silent plan changes. We will explain what is changing and when."
            />
          </div>
        </Container>
      </section>

      <section className="bg-canvas">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <SectionHeading
                title="pricing questions."
                copy="Clear answers to common questions about plans, billing, and payments."
              />
            </div>
            <FaqList items={pricingFaqs} />
          </div>
        </Container>
      </section>

      <CtaBand
        title="start free and scale when you are ready."
        copy="Draft, send and keep records today with no card needed. Upgrade when you need unlimited power."
        href="/signup"
        label="Start free"
      />
    </>
  );
}

function PricePromise({
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
