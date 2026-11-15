'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';
import { Field, inputStyles } from './Input';

export interface OtpFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'inputMode'
  > {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  optional?: boolean;
  /** Number of digits to accept. Defaults to 6. */
  length?: number;
}

/** Single-field one-time-code input. Paste and OS autofill both work. */
export const OtpField = forwardRef<HTMLInputElement, OtpFieldProps>(
  function OtpField(
    {
      id,
      label,
      value,
      onChange,
      hint,
      error,
      optional,
      required = true,
      length = 6,
      className,
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
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={length}
            required={required}
            value={value}
            onChange={(event) =>
              onChange(
                event.target.value.replace(/\D/g, '').slice(0, length),
              )
            }
            className={cn(
              inputStyles,
              'text-center font-mono text-title tracking-[0.4em]',
              className,
            )}
            {...props}
            {...a11y}
          />
        )}
      </Field>
    );
  },
);
