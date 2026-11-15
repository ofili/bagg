'use client';

import { forwardRef } from 'react';
import { TextField, type TextFieldProps } from './Input';

export type EmailFieldProps = Omit<TextFieldProps, 'type'>;

export const EmailField = forwardRef<HTMLInputElement, EmailFieldProps>(
  function EmailField(props, ref) {
    return (
      <TextField
        ref={ref}
        type="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        {...props}
      />
    );
  },
);
