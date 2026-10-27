import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  Camera,
  Check,
  Code2,
  FileText,
  Link2,
  Palette,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { ProductPreview } from '@/components/marketing/product-preview';
import { SectionHeading } from '@/components/marketing/section-heading';
import { buttonStyles } from '@/components/ui/button';
import { creativeRoles } from '@/content/marketing';
import { marketingMetadata } from '@/lib/metadata';
import { demoInvoiceHref } from '@/lib/site';

const ROLE_ICONS = [Palette, Code2, PenLine, Camera, Briefcase, Sparkles];

export const metadata = marketingMetadata({
  title: 'for creatives',
  description:
    'Invoicing and getting paid for designers, developers, writers, photographers, consultants and creators.',
  path: '/creatives',
});

export default function CreativesPage() {
  return (
    <>
      <PageHero
        kicker="for the people who make the thing"
        title="your work is the point. the admin isn’t."
        copy="You did not start doing this to build a spreadsheet, chase a client for the third time, or hunt for a receipt in your camera roll. bagg handles the get-paid part so you can get back to the work."
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link href="/signup" className={buttonStyles({ size: 'lg' })}>
            Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={demoInvoiceHref}
            className="inline-flex min-h-11 items-center gap-2 text-label font-bold text-link hover:underline"
          >
            See what your client sees <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </PageHero>

      <section className="bg-canvas">
        <Container className="py-16 sm:py-20">
          <SectionHeading
            title="made for the work you actually do."
            copy="Different disciplines, different deliverables. The same awkward moment when it is time to ask for the money."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creativeRoles.map((role, index) => {
              const Icon = ROLE_ICONS[index] ?? Sparkles;
              return (
                <div key={role.title} className="rounded-card border border-line-subtle bg-surface p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach-chip text-ink">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 text-heading text-ink">{role.title}</h2>
                  <p className="mt-1 text-body text-ink-soft">{role.copy}</p>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-surface">
        <Container className="grid gap-10 py-16 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <SectionHeading
              title="the work changes. the money admin doesn’t."
              copy="Whether it is a brand sprint, a retainer or a one-off shoot, you need the same few things to go right."
            />
            <ul className="mt-6 space-y-3">
              {[
                'The invoice looks like your business, not a generic template.',
                'Your client knows exactly what to pay and where.',
                'You know whether the link was opened and whether the money landed.',
                'A receipt is ready when the payment is confirmed.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-body text-ink-soft">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <ProductPreview />
        </Container>
      </section>

      <section className="bg-canvas">
        <Container className="grid gap-4 py-16 sm:py-20 md:grid-cols-3">
          <StoryCard
            icon={<FileText className="h-5 w-5" />}
            title="one project, one clean trail"
            copy="Keep the quote, the invoice and the receipt together. When a client asks what was paid, you have the answer."
          />
          <StoryCard
            icon={<Link2 className="h-5 w-5" />}
            title="share it where you already are"
            copy="Send the link in WhatsApp, email or your client portal. They do not need to make an account to pay you."
          />
          <StoryCard
            icon={<Sparkles className="h-5 w-5" />}
            title="a little less performing"
            copy="The reminder can be polite without being a whole personality. The schedule handles the follow-up so you can keep your energy for the work."
          />
        </Container>
      </section>

      <section className="border-y border-line-subtle bg-peach">
        <Container className="py-14 sm:py-16">
          <div className="max-w-3xl">
            <h2 className="text-title-l text-ink">we’ll show real stories when we have them.</h2>
            <p className="mt-2 text-body-l text-ink-soft">
              No invented testimonials. No borrowed logos. For now, the product is the proof: open
              the demo invoice and judge the client experience for yourself.
            </p>
            <Link
              href={demoInvoiceHref}
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-label font-bold text-link hover:underline"
            >
              Open the demo invoice <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <CtaBand
        title="get back to the work."
        copy="Make the next invoice, send one link and let bagg keep the follow-up tidy."
        href="/signup"
        label="Start free"
      />
    </>
  );
}

function StoryCard({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-card border border-line-subtle bg-surface p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach-chip text-ink">
        {icon}
      </span>
      <h2 className="mt-4 text-heading text-ink">{title}</h2>
      <p className="mt-1 text-body text-ink-soft">{copy}</p>
    </div>
  );
}
