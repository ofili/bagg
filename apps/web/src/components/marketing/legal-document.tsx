import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Cookie, LockKeyhole, Scale } from 'lucide-react';

import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export type LegalTone = 'sun' | 'pink' | 'mango' | 'peach';

const toneClasses: Record<LegalTone, string> = {
  sun: 'bg-sun text-on-sun',
  pink: 'bg-pink text-on-pink',
  mango: 'bg-mango text-on-mango',
  peach: 'bg-peach text-ink',
};

const nextDocument = {
  terms: { label: 'Privacy', href: '/legal/privacy', icon: Scale },
  privacy: { label: 'Cookies', href: '/legal/cookies', icon: LockKeyhole },
  cookies: { label: 'Terms', href: '/legal/terms', icon: Cookie },
} as const;

export function LegalDocumentHeader({
  eyebrow,
  title,
  description,
  icon,
  tone = 'sun',
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  icon: ReactNode;
  tone?: LegalTone;
}) {
  return (
    <header className="mb-8">
      <div
        className={cn(
          'mb-5 inline-flex items-center gap-2 border-brut border-ink px-3 py-2',
          'text-caption font-extrabold uppercase tracking-wider shadow-brut-sm',
          toneClasses[tone],
        )}
      >
        {icon}
        {eyebrow}
      </div>

      <h1 className="text-display font-extrabold leading-[0.98] tracking-tight text-ink sm:text-5xl lg:text-6xl">
        {title}
      </h1>

      <p className="mt-5 max-w-2xl text-body-l leading-relaxed text-text-soft">
        {description}
      </p>
    </header>
  );
}

export function LegalSection({
  id,
  number,
  title,
  icon,
  tone = 'peach',
  children,
}: {
  id?: string;
  number: string;
  title: string;
  icon?: ReactNode;
  tone?: LegalTone;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t-brut border-ink pt-6">
      <div className="flex items-start gap-4">
        <span
          className={cn(
            'border-brut border-ink px-2 py-1 text-caption font-bold tabular-nums',
            toneClasses[tone],
          )}
        >
          {number}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-ink">
            {icon}
            <h2 className="text-title font-extrabold tracking-tight text-ink">
              {title}
            </h2>
          </div>

          <div className="mt-4 space-y-4 text-body-l leading-relaxed text-text-soft">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LegalDocumentFooter({
  current,
  eyebrow,
  title,
  copy,
  tone = 'sun',
  nextLabel,
  nextHref,
  nextIcon,
}: {
  current: keyof typeof nextDocument;
  eyebrow: string;
  title?: string;
  copy: string;
  tone?: LegalTone;
  nextLabel?: string;
  nextHref?: string;
  nextIcon?: ReactNode;
}) {
  const next = nextDocument[current];
  const Icon = next.icon;
  const label = nextLabel ?? next.label;
  const href = nextHref ?? next.href;

  return (
    <div
      className={cn(
        'mt-14 border-brut border-ink p-5 shadow-brut sm:p-6',
        toneClasses[tone],
      )}
    >
      <div className="flex items-center gap-2 text-caption font-extrabold uppercase tracking-wider">
        {nextIcon ?? <Icon className="h-4 w-4" aria-hidden="true" />}
        {eyebrow}
      </div>

      {title && (
        <h2 className="mt-3 text-title-l font-extrabold tracking-tight">
          {title}
        </h2>
      )}

      <p className="mt-3 max-w-2xl text-body leading-relaxed">{copy}</p>

      <Link
        href={href}
        className={cn(buttonStyles({ variant: 'outline', size: 'md' }), 'mt-5')}
      >
        Read {label}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
