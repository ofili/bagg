import { cn } from '@/lib/cn';
import { Container } from '@/components/marketing/container';

export function PageHero({
  kicker,
  title,
  copy,
  children,
  className,
}: {
  kicker?: string;
  title: string;
  copy: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border-b border-line-subtle bg-canvas', className)}>
      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl">
          {kicker && (
            <span className="inline-flex rounded-full bg-peach-chip px-3 py-1 text-caption font-extrabold text-ink-soft">
              {kicker}
            </span>
          )}
          <h1 className="mt-5 text-display text-ink">{title}</h1>
          <p className="mt-5 max-w-2xl text-body-l text-ink-soft">{copy}</p>
          {children && <div className="mt-8">{children}</div>}
        </div>
      </Container>
    </section>
  );
}
