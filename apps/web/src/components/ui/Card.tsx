import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import type { Zone } from './button';

export type CardTone = 'surface' | 'mango' | 'peach' | 'sun' | 'pink';

const TONES: Record<CardTone, string> = {
  surface: 'bg-surface text-text',
  mango: 'bg-mango text-on-mango',
  peach: 'bg-peach text-text',
  sun: 'bg-sun text-on-sun',
  pink: 'bg-pink text-on-pink',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * expressive: 2px ink outline + hard shadow (the one dominant dashboard card,
   * marketing, empty states).
   * calm: 2px ink outline, no shadow. Use it for client pages, documents and
   * anywhere money is the focus, and inside tables and forms.
   */
  zone?: Zone;
  /** Never place mango and pink cards directly next to each other. */
  tone?: CardTone;
}

export function Card({ zone = 'expressive', tone = 'surface', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'p-4',
        TONES[tone],
        zone === 'expressive'
          ? 'border-brut border-ink shadow-brut'
          : 'border-brut border-ink',
        className,
      )}
      {...props}
    />
  );
}
