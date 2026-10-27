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
        align === 'center' && 'mx-auto max-w-2xl text-center',
        align === 'left' && 'max-w-2xl',
        className,
      )}
    >
      <h2 className="text-title-l text-ink sm:text-[2rem] sm:leading-[2.15rem]">{title}</h2>
      {copy && <p className="mt-3 text-body-l text-ink-soft">{copy}</p>}
    </div>
  );
}
