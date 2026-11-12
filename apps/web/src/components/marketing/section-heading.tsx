
import { cn } from '@/lib/cn';

export function SectionHeading({
                                 title,
                                 copy,
                                 align = 'left',
                                 className,
                               }: {
  title: string;
  copy?: string;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
      <div
          className={cn(
              'w-full',
              align === 'center' && 'mx-auto max-w-2xl text-center',
              align === 'left' && 'max-w-2xl',
              className,
          )}
      >
        <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-extrabold leading-tight tracking-tight text-ink">
          {title}
        </h2>

        {copy && (
            <p className="mt-3 text-body-l leading-relaxed text-text-soft">
              {copy}
            </p>
        )}
      </div>
  );
}
