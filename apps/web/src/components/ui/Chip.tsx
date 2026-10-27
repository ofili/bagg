import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Chip look for anything that is not a <button> (filter links, for example). */
export function chipStyles({ selected = false }: { selected?: boolean } = {}) {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-brut-thin border-ink px-4 text-body',
    selected ? 'bg-mango font-extrabold text-on-mango shadow-brut-sm' : 'bg-surface font-normal text-text',
  );
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

/** For 2 to 4 short options (currency, due date, tone). Use a select for longer lists. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { selected = false, className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(chipStyles({ selected }), 'disabled:pointer-events-none disabled:opacity-40', className)}
      {...props}
    />
  );
});
