import type { ReactNode } from 'react';

import { Container } from '@/components/marketing/container';
import { cn } from '@/lib/cn';

type PageHeroProps = {
  kicker?: ReactNode;
  title: ReactNode;
  copy?: ReactNode;
  children?: ReactNode;
  visual?: ReactNode;
  layout?: 'stacked' | 'split';
  className?: string;
  containerClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  copyClassName?: string;
};

export function PageHero({
  kicker,
  title,
  copy,
  children,
  visual,
  layout = 'stacked',
  className,
  containerClassName,
  contentClassName,
  titleClassName,
  copyClassName,
}: PageHeroProps) {
  const split = layout === 'split' && Boolean(visual);

  return (
    <section
      className={cn(
        'overflow-hidden border-b-2 border-ink bg-cream',
        className,
      )}
    >
      <Container
        className={cn(
          'py-12 sm:py-16 lg:py-20',
          split &&
            'grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12',
          containerClassName,
        )}
      >
        <div className={cn('min-w-0', !split && 'max-w-3xl', contentClassName)}>
          {kicker && <div>{kicker}</div>}

          <h1
            className={cn(
              'mt-5 max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.055em] text-ink',
              titleClassName,
            )}
          >
            {title}
          </h1>

          {copy && (
            <div
              className={cn(
                'mt-5 max-w-2xl text-body-l leading-relaxed text-text-soft',
                copyClassName,
              )}
            >
              {copy}
            </div>
          )}

          {children && <div className="mt-8">{children}</div>}
        </div>

        {split && (
          <div className="relative mx-auto w-full min-w-0">{visual}</div>
        )}
      </Container>
    </section>
  );
}