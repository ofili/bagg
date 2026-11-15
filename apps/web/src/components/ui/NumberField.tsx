'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';
import { Field, inputStyles } from './Input';

export interface NumberFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  /** Short unit shown inside the field, such as "%" or "days". */
  suffix?: string;
}

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  function NumberField(
    {
      id,
      label,
      hint,
      error,
      optional,
      suffix,
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
          <div className="relative">
            <input
              ref={ref}
              type="number"
              inputMode="decimal"
              required={required}
              className={cn(
                inputStyles,
                'tabular',
                suffix && 'pr-14',
                className,
              )}
              {...props}
              {...a11y}
            />

            {suffix && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body text-text-muted"
              >
                {suffix}
              </span>
            )}
          </div>
        )}
      </Field>
    );
  },
);
