import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FormSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}

/**
 * One bounded form surface: square panel, 2px ink outline, header rule and
 * optional icon/action. Use it instead of one-off section wrappers.
 */
export function FormSection({
  title,
  description,
  icon,
  action,
  children,
  id,
  className,
}: FormSectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  const descriptionId = id ? `${id}-description` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'border-brut border-ink bg-surface p-4 sm:p-6',
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-line-subtle pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peach-chip text-text"
            >
              {icon}
            </span>
          )}

          <div className="min-w-0">
            <h2
              id={headingId}
              className="text-heading font-extrabold text-text"
            >
              {title}
            </h2>

            {description && (
              <p
                id={descriptionId}
                className="mt-0.5 max-w-2xl text-caption text-text-muted"
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      <div className="space-y-4 pt-4">{children}</div>
    </section>
  );
}
