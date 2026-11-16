import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FormSubsectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  /** Adds a top rule when this group follows another group in the same panel. */
  divided?: boolean;
  className?: string;
}

/**
 * A lighter group inside a FormSection. Use it when one panel holds two
 * distinct concerns (for example identity and contact details).
 */
export function FormSubsection({
  title,
  description,
  children,
  divided = false,
  className,
}: FormSubsectionProps) {
  return (
    <div
      className={cn(
        'space-y-4',
        divided && 'border-t border-line-subtle pt-5',
        className,
      )}
    >
      {title && (
        <div>
          <h3 className="text-label font-extrabold uppercase tracking-wide text-text-muted">
            {title}
          </h3>

          {description && (
            <p className="mt-1 text-caption text-text-muted">{description}</p>
          )}
        </div>
      )}

      <div className="space-y-4">{children}</div>
    </div>
  );
}
