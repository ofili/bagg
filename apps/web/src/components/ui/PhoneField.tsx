'use client';

import { forwardRef } from 'react';
import { TextField, type TextFieldProps } from './Input';

export type PhoneFieldProps = Omit<TextFieldProps, 'type'>;

export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(
  function PhoneField(props, ref) {
    return (
      <TextField
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        {...props}
      />
    );
  },
);
