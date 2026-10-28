'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Wordmark } from '@/components/brand';
import { Container } from '@/components/marketing/container';
import { buttonStyles } from '@/components/ui/button';
import { marketingNav } from '@/content/marketing';
import { cn } from '@/lib/cn';

export function MarketingHeader() {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line-subtle bg-canvas/95 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="bagg home"
            className="inline-flex min-h-11 items-center"
            onClick={() => setOpen(false)}
          >
            <Wordmark />
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {marketingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full px-3 text-label font-bold transition-colors',
                  isActive(item.href)
                    ? 'bg-peach-chip text-ink'
                    : 'text-ink-soft hover:bg-tint hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden min-h-11 items-center rounded-full px-3 text-label font-bold text-link hover:underline sm:inline-flex"
            >
              Log in
            </Link>
            <Link
  href="/signup"
  className={`${buttonStyles()} hidden sm:inline-flex`}
>
  Start free
</Link>
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-tint lg:hidden"
            >
              {open ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-b border-line-subtle bg-canvas px-4 pb-5 pt-2 shadow-sheet lg:hidden"
        >
          <nav aria-label="Mobile" className="mx-auto flex max-w-[75rem] flex-col gap-1">
            {marketingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex min-h-12 items-center rounded-row px-3 text-body font-bold',
                  isActive(item.href)
                    ? 'bg-peach-chip text-ink'
                    : 'text-ink-soft hover:bg-tint hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-line-subtle pt-3">
              <Link
  href="/login"
  onClick={() => setOpen(false)}
  className={`${buttonStyles({ variant: 'outline' })} w-full`}
>
  Log in
</Link>
              <Link
  href="/signup"
  onClick={() => setOpen(false)}
  className={`${buttonStyles()} w-full`}
>
  Start free
</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
