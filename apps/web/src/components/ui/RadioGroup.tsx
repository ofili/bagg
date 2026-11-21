
'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface RadioGroupOption {
  label: string;
  value: string;
  description?: string;
  icon?: ReactNode;
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
  variant?: 'default' | 'cards';
  columns?: 1 | 2 | 3;
  className?: string;
}

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

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
  variant = 'default',
  columns = 2,
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
          variant === 'cards'
            ? cn('grid gap-3', COLUMNS[columns])
            : cn(
                'flex gap-x-5 gap-y-3',
                direction === 'vertical'
                  ? 'flex-col'
                  : 'flex-row flex-wrap',
              ),
        )}
      >
        {options.map((option, index) => {
          const optionId = `${id}-${index}`;
          const optionDisabled = disabled || option.disabled;
          const selected = value === option.value;

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'flex cursor-pointer items-start gap-3',
                variant === 'cards'
                  ? 'min-h-20 border-brut-thin border-ink p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink'
                  : 'min-h-11',
                variant === 'cards' &&
                  (selected
                    ? 'bg-peach-chip'
                    : 'bg-surface hover:bg-surface-tint'),
                optionDisabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={groupName}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                disabled={optionDisabled}
                required={required}
                aria-describedby={describedBy}
                aria-invalid={error ? true : undefined}
                aria-errormessage={error ? errorId : undefined}
                className={cn(
                  'mt-0.5 h-5 w-5 shrink-0 accent-[var(--bagg-mango)]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2',
                  'focus-visible:outline-ink',
                )}
              />

              <span className={cn('min-w-0', variant === 'cards' && 'flex-1')}>
                {option.icon && variant === 'cards' && (
                  <span
                    aria-hidden="true"
                    className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text"
                  >
                    {option.icon}
                  </span>
                )}

                <span className="flex items-center gap-2">
                  {option.icon && variant !== 'cards' && (
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-text-muted"
                    >
                      {option.icon}
                    </span>
                  )}

                  <span
                    className={cn(
                      'block text-body text-text',
                      variant === 'cards'
                        ? 'font-extrabold'
                        : 'font-medium',
                    )}
                  >
                    {option.label}
                  </span>
                </span>

                {option.description && (
                  <span className="mt-1 block text-caption text-text-muted">
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
