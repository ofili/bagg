
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { Doodle } from '@/components/marketing/doodle';
import { buttonStyles } from '@/components/ui/button';

export function CtaBand({
  title,
  copy,
  href,
  label,
  doodle = false,
}: {
  title: string;
  copy: string;
  href: string;
  label: string;
  /** Render the milestone-star doodle mark. Home page only. */
  doodle?: boolean;
}) {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="relative overflow-hidden border-brut border-ink bg-mango p-6 text-on-mango shadow-brut sm:p-10 lg:p-12">
          {doodle && (
            <Doodle
              variant="milestone-star"
              className="absolute right-6 top-6 opacity-70 sm:right-10 sm:top-10"
            />
          )}
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-title-l font-extrabold tracking-tight sm:text-[2rem] sm:leading-tight">
                {title}
              </h2>
              <p className="mt-3 max-w-lg text-body-l leading-relaxed text-on-mango/80">
                {copy}
              </p>
            </div>

            <Link
              href={href}
              className={`${buttonStyles({
                variant: 'ink',
                size: 'lg',
                mobileFullWidth: true,
              })} shrink-0`}
            >
              {label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}