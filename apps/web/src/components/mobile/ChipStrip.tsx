'use client';

import { Chip } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ChipItem {
  value: string;
  label: string;
  count?: number;
}

interface ChipStripProps {
  chips: ChipItem[];
  value: string;
  onChange: (value: string) => void;
  /** Screen-reader name for the group, for example "Filter invoices by status". */
  label?: string;
  className?: string;
}

/** One-line filter row. Scrolls sideways on phones, wraps on larger screens. */
export function ChipStrip({ chips, value, onChange, label = 'Filter', className }: ChipStripProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0',
        className,
      )}
    >
      {chips.map((chip) => (
        <Chip
          key={chip.value}
          selected={chip.value === value}
          onClick={() => chip.value !== value && onChange(chip.value)}
          className="shrink-0 whitespace-nowrap"
        >
          {chip.label}
          {chip.count !== undefined && <span className="tabular ml-1.5 font-extrabold">{chip.count}</span>}
        </Chip>
      ))}
    </div>
  );
}
