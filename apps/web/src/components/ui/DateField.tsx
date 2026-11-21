
'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
} from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Field, inputStyles } from './Input';

export interface DateFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  function DateField(
    {
      id,
      label,
      hint,
      error,
      optional,
      className,
      required,
      disabled,
      readOnly,
      'aria-describedby': externalDescribedBy,
      'aria-invalid': externalInvalid,
      'aria-errormessage': externalErrorMessage,
      ...props
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

    const unavailable = disabled || readOnly;

    function openPicker() {
      const input = inputRef.current;
      if (!input || unavailable) return;

      if (typeof input.showPicker === 'function') {
        try {
          input.showPicker();
          return;
        } catch {
          // Fall back to native focus/click where showPicker is unavailable.
        }
      }

      input.focus();
      input.click();
    }

    return (
      <Field
        id={id}
        label={label}
        hint={hint}
        error={error}
        required={required}
        optional={optional}
      >
        {(a11y) => {
          const describedBy = [
            a11y['aria-describedby'],
            externalDescribedBy,
          ]
            .filter(Boolean)
            .join(' ') || undefined;

          return (
            <div className="relative">
              <input
                ref={inputRef}
                type="date"
                required={required}
                disabled={disabled}
                readOnly={readOnly}
                className={cn(
                  inputStyles,
                  'pr-11',
                  '[&::-webkit-calendar-picker-indicator]:hidden',
                  className,
                )}
                {...props}
                {...a11y}
                aria-describedby={describedBy}
                aria-invalid={
                  a11y['aria-invalid'] || externalInvalid
                    ? true
                    : undefined
                }
                aria-errormessage={
                  a11y['aria-errormessage'] ?? externalErrorMessage
                }
              />

              <button
                type="button"
                onClick={openPicker}
                disabled={unavailable}
                aria-label={`Open ${label.toLocaleLowerCase()} calendar`}
                tabIndex={unavailable ? -1 : 0}
                className={cn(
                  'absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2',
                  'items-center justify-center rounded-small text-text-soft',
                  'hover:bg-surface-tint hover:text-text',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <CalendarDays aria-hidden className="h-4 w-4" />
              </button>
            </div>
          );
        }}
      </Field>
    );
  },
);
