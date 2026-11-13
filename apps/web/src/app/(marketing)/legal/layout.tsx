
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Scale } from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { LegalSubnav } from '@/components/marketing/legal-subnav';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-cream">
      <Container className="py-10 sm:py-14 lg:py-16">
        <div className="mb-8 flex items-center justify-between gap-4 border-b-brut border-ink pb-5">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-body font-bold text-text-soft transition hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to bagg
          </Link>

          <div className="flex items-center gap-2 text-caption font-extrabold uppercase tracking-wider text-text-muted">
            <Scale className="h-4 w-4" aria-hidden="true" />
            Legal centre
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border-brut border-ink bg-surface p-4 shadow-brut">
              <p className="text-caption font-extrabold uppercase tracking-[0.16em] text-text-muted">
                Document index
              </p>

              <p className="mt-2 text-title font-extrabold tracking-tight text-ink">
                The small print.
              </p>

              <p className="mt-2 text-body leading-relaxed text-text-soft">
                How the service works, how information is handled, and what
                happens in your browser.
              </p>

              <div className="mt-5 border-t-brut border-ink pt-4">
                <LegalSubnav />
              </div>
            </div>

            <div className="mt-5 border-brut border-ink bg-peach p-4">
              <p className="text-caption font-extrabold uppercase tracking-wider text-ink">
                Need help?
              </p>
              <p className="mt-2 text-body leading-relaxed text-text-soft">
                If a policy is unclear, our help centre is a good place to start.
              </p>
              <Link
                href="/help"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-body font-extrabold text-link underline decoration-2 underline-offset-4"
              >
                Visit help centre
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mx-auto max-w-3xl">{children}</div>
          </div>
        </div>
      </Container>
    </div>
  );
}
