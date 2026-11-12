
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

export const inputStyles = cn(
  'block w-full min-h-11 rounded-input border-brut-thin border-ink',
  'bg-surface px-3 text-body-l text-text',
  'placeholder:text-text-muted',
  'read-only:cursor-default read-only:bg-surface-sunken',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-[invalid=true]:border-danger',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
);

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(inputStyles, className)}
      {...props}
    />
  );
});

export interface FieldA11yProps {
  id: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-errormessage'?: string;
}

export interface FieldProps {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: (a11y: FieldA11yProps) => ReactNode;
}

export function Field({
  id: suppliedId,
  label,
  hint,
  error,
  required = false,
  optional = false,
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [
    hint ? hintId : undefined,
    error ? errorId : undefined,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <label htmlFor={id} className="block text-label font-medium text-text">
        {label}
        {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        {optional && !required && (
          <span className="ml-1 text-caption font-normal text-text-muted">(optional)</span>
        )}
      </label>

      {children({
        id,
        required,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-errormessage': error ? errorId : undefined,
      })}

      {hint && <p id={hintId} className="text-caption text-text-muted">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="text-caption font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextFieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      id,
      label,
      hint,
      error,
      optional,
      className,
      required,
      ...props
    },
    ref,
  ) {
    return (
      <Field
        id={id}
        label={label}
        hint={hint}
        error={error}
        required={required}
        optional={optional}
      >
        {(a11y) => (
          <Input
            ref={ref}
            className={className}
            {...props}
            {...a11y}
            required={required}
          />
        )}
      </Field>
    );
  },
);
