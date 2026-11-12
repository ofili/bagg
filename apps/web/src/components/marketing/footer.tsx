
import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { Container } from '@/components/marketing/container';
import { footerGroups } from '@/content/marketing';

export function MarketingFooter() {
  return (
      <footer className="border-t border-line-subtle bg-surface">
        <Container className="py-12 sm:py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <Link
                  href="/"
                  aria-label="Bagg home"
                  className="inline-flex rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
              >
                <Wordmark />
              </Link>

              <p className="mt-4 max-w-xs text-body leading-relaxed text-text-soft">
                Invoice like a pro. Get paid without chasing.
                <br />
                A get-paid workspace for independent work.
              </p>
            </div>

            {footerGroups.map((group) => (
                <nav key={group.title} aria-label={group.title}>
                  <h2 className="text-label font-extrabold text-ink">{group.title}</h2>

                  <ul className="mt-3 space-y-1">
                    {group.links.map((link) => (
                        <li key={link.href}>
                          <Link
                              href={link.href}
                              className="inline-flex min-h-9 items-center rounded-sm text-body text-text-soft hover:text-link hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                          >
                            {link.label}
                          </Link>
                        </li>
                    ))}
                  </ul>
                </nav>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-line-subtle pt-6 text-caption text-text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Bagg</p>
            <p>Built for independent work across Africa.</p>
          </div>
        </Container>
      </footer>
  );
}
