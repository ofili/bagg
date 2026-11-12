
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
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-heading text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>

                <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peach-chip text-ink"
                    aria-hidden="true"
                >
              <Plus className="h-4 w-4 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" />
            </span>
              </summary>

              <p className="mt-3 max-w-[65ch] text-body leading-relaxed text-text-soft">
                {item.answer}
              </p>
            </details>
        ))}
      </div>
  );
}
