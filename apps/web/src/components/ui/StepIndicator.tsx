import { Check } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface StepIndicatorItem {
  id: string;
  label: string;
}

export interface StepIndicatorProps {
  steps: StepIndicatorItem[];
  current: string;
  /** Accessible name for the ordered list. */
  label?: string;
  className?: string;
}

/**
 * Compact progress indicator for multi-step forms. Completed steps show a
 * check, the current step is filled, and upcoming steps stay quiet.
 */
export function StepIndicator({
  steps,
  current,
  label = 'Progress',
  className,
}: StepIndicatorProps) {
  const currentIndex = steps.findIndex((step) => step.id === current);

  return (
    <ol
      aria-label={label}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2',
        className,
      )}
    >
      {steps.map((step, index) => {
        const done = currentIndex >= 0 && index < currentIndex;
        const active = index === currentIndex;

        return (
          <li
            key={step.id}
            aria-current={active ? 'step' : undefined}
            className="flex items-center gap-2"
          >
            {index > 0 && (
              <span aria-hidden="true" className="h-0.5 w-6 bg-line-subtle" />
            )}

            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-brut-thin text-caption font-extrabold',
                done && 'border-leaf bg-leaf text-on-leaf',
                active && 'border-ink bg-mango text-on-mango',
                !done && !active && 'border-ink bg-surface text-text-muted',
              )}
            >
              {done ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>

            <span
              className={cn(
                'text-caption font-bold',
                active ? 'text-text' : 'text-text-muted',
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
