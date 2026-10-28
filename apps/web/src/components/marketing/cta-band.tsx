import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { buttonStyles } from '@/components/ui/button';

export function CtaBand({
  title,
  copy,
  href,
  label,
}: {
  title: string;
  copy: string;
  href: string;
  label: string;
}) {
  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="rounded-card bg-mango p-6 text-on-mango sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-title-l">{title}</h2>
              <p className="mt-2 text-body-l text-on-mango/80">{copy}</p>
            </div>
            <Link
  href={href}
  className={`${buttonStyles({
    variant: 'outline',
    size: 'lg',
  })} shrink-0 border-on-mango bg-transparent text-on-mango hover:bg-on-mango/10`}
>
              {label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
