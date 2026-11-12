'use client';

import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'checked' | 'defaultChecked' | 'onChange'
  > {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
  error,
  optional,
  required,
  disabled,
  className,
  id: suppliedId,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [
    hint ? hintId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={cn('min-w-0', className)}>
      <label
        htmlFor={id}
        className={cn(
          'flex min-h-11 cursor-pointer items-start gap-3',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.currentTarget.checked)}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-errormessage={error ? errorId : undefined}
          className={cn(
            'peer sr-only',
            'focus-visible:outline-none',
          )}
          {...props}
        />

        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center',
            'rounded-small border-brut-thin border-ink bg-surface',
            'text-on-mango transition-colors duration-100',
            'peer-checked:bg-mango',
            'peer-focus-visible:outline-2',
            'peer-focus-visible:outline-offset-2',
            'peer-focus-visible:outline-ink',
            'peer-disabled:opacity-50',
          )}
        >
          {checked && (
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
            >
              <path
                d="m3 8 3.2 3.2L13 4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-text">
            {label}
            {required && (
              <span className="ml-1 text-danger" aria-hidden="true">
                *
              </span>
            )}
            {optional && !required && (
              <span className="ml-1 text-caption font-normal text-text-muted">
                (optional)
              </span>
            )}
          </span>

          {hint && (
            <span
              id={hintId}
              className="mt-0.5 block text-caption text-text-muted"
            >
              {hint}
            </span>
          )}
        </span>
      </label>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="ml-8 mt-1 text-caption font-medium text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
