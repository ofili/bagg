import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** 44px tall, 16px text (stops iOS zoom-on-focus), 1.5px ink outline, no shadow. */
export const inputStyles =
  'block w-full min-h-11 rounded-input border-brut-thin border-ink bg-surface px-3 text-body-l text-text ' +
  'placeholder:text-text-muted disabled:opacity-50 aria-[invalid=true]:border-danger';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputStyles, className)} {...props} />;
});

interface FieldProps {
  label: string;
  hint?: string;
  /** Say what is wrong and how to fix it. */
  error?: string;
  children: (a11y: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: true;
  }) => ReactNode;
}

/** Label above, hint or error below, wired together for screen readers. */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-body font-medium text-text">
        {label}
      </label>
      {children({
        id,
        'aria-describedby': note ? noteId : undefined,
        'aria-invalid': error ? true : undefined,
      })}
      {note && (
        <p
          id={noteId}
          role={error ? 'alert' : undefined}
          className={cn('text-caption', error ? 'text-danger dark:text-[#FFB3A8]' : 'text-text-muted')}
        >
          {note}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, className, ...props },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(a11y) => <Input ref={ref} className={className} {...a11y} {...props} />}
    </Field>
  );
});
