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
    'Start bagg free. Paid plans and fees are being finalised and will be shown clearly before you are charged.',
  path: '/pricing',
});

const pricingFaqs = [
  {
    question: 'When will paid plans be announced?',
    answer:
      'We do not have a date to share yet. When the plans are ready, they will appear here and existing users will get clear notice before anything changes.',
  },
  {
    question: 'Can I use bagg without paying?',
    answer:
      'Yes. You can create an account, draft invoices, add clients and use three free PDF or email sends without adding a card.',
  },
  {
    question: 'Will I see a fee before I confirm a payment?',
    answer:
      'Yes. Any fee and the amount you will receive must be shown before you confirm. We will not hide a fee inside a total.',
  },
  {
    question: 'What if I only invoice once in a while?',
    answer:
      'The free tier is designed for occasional invoices. Paid plans will be there for people who send more often. You can stay on the free tier if it fits.',
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHero
        kicker="start free, decide later"
        title="simple pricing. no surprises."
        copy="Pricing is being finalised. You can start free today. When paid plans arrive, the fee and the amount you receive will be clear before you confirm anything."
      >
        <Link href="/signup" className={buttonStyles({ size: 'lg' })}>
          Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </PageHero>

      <section className="bg-canvas">
        <Container className="py-12 sm:py-16">
          <div className="flex items-start gap-3 rounded-card border border-line bg-peach p-4 sm:p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
              <Info className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-heading text-ink">pricing is being finalised.</p>
              <p className="mt-1 text-body text-ink-soft">
                The free tier is live. Paid plans and fees are not on sale yet. No one will be
                charged without seeing the amount first.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-card border border-line-subtle bg-surface p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-extrabold text-ink-muted">free</p>
                  <h2 className="mt-1 text-title-l text-ink">start here.</h2>
                </div>
                <span className="rounded-full bg-pill-paid px-3 py-1 text-caption font-extrabold text-pill-paid-fg">
                  available now
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

            <div className="rounded-card border border-dashed border-line bg-surface p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-caption font-extrabold text-ink-muted">paid plans</p>
                  <h2 className="mt-1 text-title-l text-ink">pricing not final.</h2>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tint text-ink-soft">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-body-l text-ink-soft">
                We are still setting the fees. When paid plans launch, they will be announced here
                before anyone is charged.
              </p>
              <div className="mt-6 rounded-row bg-sunken p-4">
                <p className="text-caption font-extrabold text-ink-soft">what will not change</p>
                <ul className="mt-2 space-y-2 text-body text-ink-soft">
                  <li>You will see the fee before you confirm.</li>
                  <li>You will see the currency and the amount you receive.</li>
                  <li>You can stay on the free tier if it fits.</li>
                </ul>
              </div>
              <Link
                href="/early-access"
                className={buttonStyles({ variant: 'outline', className: 'mt-7 w-full' })}
              >
                Join early access
              </Link>
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
                copy="The answers we can give today. The rest will be added when the plans are set."
              />
            </div>
            <FaqList items={pricingFaqs} />
          </div>
        </Container>
      </section>

      <CtaBand
        title="start free while we finish the maths."
        copy="Draft, send and keep the record today. Paid plans can wait until they are clear."
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
