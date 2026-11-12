
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
  className?: string;
}

export function FormSection({
  title,
  description,
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
      className={cn('space-y-4', className)}
    >
      <div className="space-y-1">
        <h2
          id={headingId}
          className="text-heading font-extrabold text-text"
        >
          {title}
        </h2>

        {description && (
          <p
            id={descriptionId}
            className="max-w-2xl text-body text-text-muted"
          >
            {description}
          </p>
        )}
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}
