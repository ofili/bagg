import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  FileCheck,
  FileText,
  Rocket,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { FaqList } from '@/components/marketing/faq-list';
import { PageHero } from '@/components/marketing/page-hero';
import { SectionHeading } from '@/components/marketing/section-heading';
import { buttonStyles } from '@/components/ui/button';
import { helpCategories, helpFaqs } from '@/content/marketing';
import { marketingMetadata } from '@/lib/metadata';

const CATEGORY_ICONS = {
  'getting-started': Rocket,
  invoices: FileText,
  quotes: FileCheck,
  payments: Wallet,
  reminders: BellRing,
  account: ShieldCheck,
} as const;

export const metadata = marketingMetadata({
  title: 'help',
  description:
    'Help with invoices, quotes, payment records, reminders and your bagg account.',
  path: '/help',
});

export default function HelpPage() {
  return (
    <>
      <PageHero
        kicker="help centre"
        title="how can we help?"
        copy="Start with the short answers below. If the question is about a specific invoice or something looks wrong, send us a message and include the link."
      >
        <Link href="/contact" className={buttonStyles({ size: 'lg' })}>
          Contact support <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </PageHero>

      <section className="bg-canvas">
        <Container className="py-12 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {helpCategories.map((category) => {
              const Icon = CATEGORY_ICONS[category.id as keyof typeof CATEGORY_ICONS] ?? FileText;
              return (
                <a
                  key={category.id}
                  href={`#${category.id}`}
                  className="group rounded-card border border-line-subtle bg-surface p-5 transition-colors hover:border-line hover:bg-tint/40"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach-chip text-ink">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-heading text-ink">{category.title}</h2>
                  <p className="mt-1 text-body text-ink-soft">{category.copy}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-caption font-extrabold text-link">
                    Read the answers <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </a>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="border-t border-line-subtle bg-surface">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <div>
              <SectionHeading
                title="answers, in order."
                copy="The things people ask most often, grouped by the part of the product they are trying to use."
              />
            </div>

            <div className="space-y-12">
              {helpCategories.map((category) => {
                const faqs = helpFaqs.filter((faq) => faq.category === category.id);
                if (faqs.length === 0) return null;
                return (
                  <section key={category.id} id={category.id} className="scroll-mt-24">
                    <h2 className="text-title text-ink">{category.title}</h2>
                    <FaqList items={faqs} className="mt-5" />
                  </section>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-canvas">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-8 rounded-card border border-line-subtle bg-peach p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-title-l text-ink">still stuck?</h2>
              <p className="mt-2 max-w-2xl text-body-l text-ink-soft">
                Tell us what you were trying to do, what happened and the invoice or quote link if
                there is one. We will take it from there.
              </p>
            </div>
            <Link
              href="/contact"
              className={`${buttonStyles({ variant: 'outline', size: 'lg' })} shrink-0`}
            >
              Contact support <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
