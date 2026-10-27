import Link from 'next/link';
import { ArrowRight, Check, Clock, Mail } from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { EarlyAccessForm } from '@/components/marketing/early-access-form';
import { PageHero } from '@/components/marketing/page-hero';
import { marketingMetadata } from '@/lib/metadata';
import { contactEmail } from '@/lib/site';

export const metadata = marketingMetadata({
  title: 'early access',
  description: 'Join the bagg early-access list and tell us about the work you invoice for.',
  path: '/early-access',
});

export default function EarlyAccessPage() {
  return (
    <>
      <PageHero
        kicker="opening in stages"
        title="be first in line."
        copy="bagg is opening up gradually. Send us a note about the work you do and the clients you invoice. We will use it to decide who gets in next."
      />

      <section className="bg-canvas">
        <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="rounded-card border border-line-subtle bg-surface p-5 sm:p-8">
            <h2 className="text-title text-ink">tell us about your work</h2>
            <p className="mt-2 text-body text-ink-soft">
              This opens your email app with the note filled in. You can edit it before you send.
            </p>
            <div className="mt-7">
              <EarlyAccessForm />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-card border border-line-subtle bg-surface p-5">
              <h2 className="text-heading text-ink">what early access means</h2>
              <ul className="mt-4 space-y-3">
                <Expectation
                  icon={<Mail className="h-4 w-4" />}
                  copy="A real person reads your note."
                />
                <Expectation
                  icon={<Check className="h-4 w-4" />}
                  copy="You can ask for help with your first invoice."
                />
                <Expectation
                  icon={<Clock className="h-4 w-4" />}
                  copy="We do not have a launch date to promise yet."
                />
              </ul>
            </div>

            <div className="rounded-card border border-line-subtle bg-peach p-5">
              <h2 className="text-heading text-ink">already ready to send?</h2>
              <p className="mt-2 text-body text-ink-soft">
                You do not have to wait. Start free and make your first invoice today.
              </p>
              <Link
                href="/signup"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-label font-bold text-link hover:underline"
              >
                Start free <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <p className="text-caption text-ink-muted">
              Prefer a plain email? Write to{' '}
              <a href={`mailto:${contactEmail}`} className="font-extrabold text-link hover:underline">
                {contactEmail}
              </a>
              .
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}

function Expectation({ icon, copy }: { icon: React.ReactNode; copy: string }) {
  return (
    <li className="flex items-start gap-2.5 text-body text-ink-soft">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink">
        {icon}
      </span>
      {copy}
    </li>
  );
}
