
'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface RadioGroupOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label: string;
  value: string;
  options: RadioGroupOption[];
  onChange: (value: string) => void;
  name?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

export function RadioGroup({
  label,
  value,
  options,
  onChange,
  name,
  hint,
  error,
  required = false,
  optional = false,
  disabled = false,
  direction = 'vertical',
  className,
}: RadioGroupProps) {
  const id = useId();
  const groupName = name ?? id;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [
    hint ? hintId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <fieldset
      disabled={disabled}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      className={cn('min-w-0 space-y-2', className)}
    >
      <legend className="text-label font-medium text-text">
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
      </legend>

      {hint && (
        <p id={hintId} className="text-caption text-text-muted">
          {hint}
        </p>
      )}

      <div
        className={cn(
          'flex gap-x-5 gap-y-3',
          direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        )}
      >
        {options.map((option, index) => {
          const optionId = `${id}-${index}`;
          const optionDisabled = disabled || option.disabled;

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'flex min-h-11 cursor-pointer items-start gap-3',
                optionDisabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={groupName}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                disabled={optionDisabled}
                required={required}
                aria-describedby={describedBy}
                aria-invalid={error ? true : undefined}
                className={cn(
                  'mt-0.5 h-5 w-5 shrink-0 accent-[var(--bagg-mango)]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2',
                  'focus-visible:outline-ink',
                )}
              />

              <span className="min-w-0">
                <span className="block text-body font-medium text-text">
                  {option.label}
                </span>

                {option.description && (
                  <span className="mt-0.5 block text-caption text-text-muted">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-caption font-medium text-danger"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
