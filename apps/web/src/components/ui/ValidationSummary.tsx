
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ValidationError {
  message: string;
  field?: string;
  fieldId?: string;
}

export interface ValidationSummaryProps {
  errors: readonly ValidationError[];
  title?: string;
  className?: string;
}

export function ValidationSummary({
  errors,
  title = 'There are some things to fix',
  className,
}: ValidationSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'rounded-card border-brut-thin border-danger bg-surface p-4',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-danger"
        />

        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-body font-extrabold text-text">
            {title}
          </h2>

          <ul className="list-disc space-y-1 pl-5 text-body text-text">
            {errors.map((error, index) => (
              <li key={`${error.fieldId ?? error.field ?? 'error'}-${index}`}>
                {error.field && (
                  <span className="font-semibold">
                    {error.field}:{' '}
                  </span>
                )}

                {error.fieldId ? (
                  <a
                    href={`#${error.fieldId}`}
                    className="underline underline-offset-2 hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {error.message}
                  </a>
                ) : (
                  error.message
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
