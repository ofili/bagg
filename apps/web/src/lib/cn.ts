import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge needs to know the custom scales in tailwind.config.ts.
 * Without this, it reads `border-brut` as a border colour and drops it when
 * `border-ink` follows, and it reads `text-body` as a text colour and drops it
 * when `text-text` follows. Registering the scales keeps width, colour, type
 * and elevation classes independent.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['btn', 'card', 'row', 'input', 'small', 'sheet'],
      shadow: ['brut-sm', 'brut', 'brut-lg', 'sheet', 'menu'],
      text: [
        'display',
        'title-l',
        'title',
        'heading',
        'body-l',
        'body',
        'label',
        'caption',
        'amount-s',
        'amount-m',
        'amount-l',
        'amount-xl',
      ],
    },
    classGroups: {
      'border-w': [{ border: ['brut', 'brut-thin'] }],
      'border-w-x': [{ 'border-x': ['brut', 'brut-thin'] }],
      'border-w-y': [{ 'border-y': ['brut', 'brut-thin'] }],
      'border-w-s': [{ 'border-s': ['brut', 'brut-thin'] }],
      'border-w-e': [{ 'border-e': ['brut', 'brut-thin'] }],
      'border-w-t': [{ 'border-t': ['brut', 'brut-thin'] }],
      'border-w-r': [{ 'border-r': ['brut', 'brut-thin'] }],
      'border-w-b': [{ 'border-b': ['brut', 'brut-thin'] }],
      'border-w-l': [{ 'border-l': ['brut', 'brut-thin'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
