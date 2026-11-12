'use client';

import {
  forwardRef,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';
import { Field, inputStyles } from './Input';

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextAreaProps
>(function TextArea(
  {
    id,
    label,
    hint,
    error,
    optional,
    required,
    className,
    rows = 4,
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
        <textarea
          ref={ref}
          rows={rows}
          required={required}
          className={cn(
            inputStyles,
            'min-h-28 resize-y py-3 leading-6',
            className,
          )}
          {...a11y}
          {...props}
        />
      )}
    </Field>
  );
});
