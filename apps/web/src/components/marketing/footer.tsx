import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { Container } from '@/components/marketing/container';
import { footerGroups } from '@/content/marketing';

export function MarketingFooter() {
  return (
    <footer className="border-t border-line-subtle bg-surface">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" aria-label="bagg home" className="inline-flex">
              <Wordmark />
            </Link>
            <p className="mt-4 max-w-xs text-body text-ink-soft">
              send. chase. get paid.
              <br />
              Invoicing for African freelancers and creators.
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-label font-extrabold text-ink">{group.title}</h2>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-8 items-center text-body text-ink-soft hover:text-link hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line-subtle pt-6 text-caption text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} bagg</p>
          <p>Built for independent work across Africa.</p>
        </div>
      </Container>
    </footer>
  );
}
