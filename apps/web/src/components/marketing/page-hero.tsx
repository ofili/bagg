
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
      <section className={cn('border-b-2 border-ink bg-cream', className)}>
        <Container className="py-12 sm:py-16 lg:py-20">
          <div className="max-w-3xl">
            {kicker && (
                <span className="inline-flex rounded-full bg-peach-chip px-3 py-1 text-caption font-extrabold text-text-soft">
              {kicker}
            </span>
            )}

            <h1 className="mt-5 text-[clamp(2.25rem,6vw,3.5rem)] font-extrabold leading-[1.05] tracking-tight text-ink">
              {title}
            </h1>

            <p className="mt-5 max-w-2xl text-body-l leading-relaxed text-text-soft">
              {copy}
            </p>

            {children && <div className="mt-8">{children}</div>}
          </div>
        </Container>
      </section>
  );
}
