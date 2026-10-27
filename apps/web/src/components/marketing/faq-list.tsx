import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function FaqList({
  items,
  className,
}: {
  items: { question: string; answer: string }[];
  className?: string;
}) {
  return (
    <div className={cn('divide-y divide-line-subtle border-y border-line-subtle', className)}>
      {items.map((item) => (
        <details key={item.question} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-heading text-ink [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink">
              <Plus
                className="h-4 w-4 transition-transform group-open:rotate-45"
                aria-hidden="true"
              />
            </span>
          </summary>
          <p className="mt-3 max-w-[65ch] text-body text-ink-soft">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
