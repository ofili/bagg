import Link from 'next/link';
import { Container } from '@/components/marketing/container';

const legalLinks = [
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Cookies', href: '/legal/cookies' },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-canvas">
      <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[14rem_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <p className="text-caption font-extrabold text-ink-muted">legal</p>
          <nav aria-label="Legal" className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex min-h-10 items-center rounded-full px-3 text-label font-bold text-ink-soft hover:bg-tint hover:text-ink lg:rounded-row"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="mt-5 text-caption text-ink-muted">Draft · 23 October 2026</p>
        </aside>
        <div className="min-w-0 max-w-3xl">{children}</div>
      </Container>
    </div>
  );
}
