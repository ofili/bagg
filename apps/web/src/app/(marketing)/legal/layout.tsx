
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Scale } from 'lucide-react';

import { Container } from '@/components/marketing/container';
import { LegalSubnav } from '@/components/marketing/legal-subnav';
import React from "react";

export default function LegalLayout({
                                      children,
                                    }: {
  children: React.ReactNode;
}) {
  return (
      <div className="bg-canvas">
        <Container className="py-10 sm:py-14 lg:py-16">
          <div className="mb-8 flex items-center justify-between gap-4 border-b-2 border-ink pb-5">
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-bold text-ink-soft transition hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to bagg
            </Link>

            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink-muted">
              <Scale className="h-4 w-4" aria-hidden="true" />
              Legal centre
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="border-2 border-ink bg-surface p-4 shadow-[4px_4px_0_0_#171717]">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink-muted">
                  Document index
                </p>

                <h2 className="mt-2 text-xl font-black tracking-tight text-ink">
                  The small print.
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  How the service works, how information is handled, and what
                  happens in your browser.
                </p>

                <div className="mt-5 border-t-2 border-ink pt-4">
                  <LegalSubnav />
                </div>
              </div>

              <div className="mt-5 border-2 border-ink bg-peach p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink">
                  Need help?
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  If a policy is unclear, our help centre is a good place to start.
                </p>
                <Link
                    href="/help"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-extrabold text-ink underline decoration-2 underline-offset-4"
                >
                  Visit help centre
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </aside>

            <main className="min-w-0">
              <div className="mx-auto max-w-3xl">{children}</div>
            </main>
          </div>
        </Container>
      </div>
  );
}
