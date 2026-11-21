
'use client';

import { cn } from '@/lib/cn';
import { ChipStrip } from '@/components/mobile/ChipStrip';
import { BaggSelect } from './BaggSelect';
import { SearchInput } from './SearchInput';

export type FilterConfig = {
  key: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hideLabel?: boolean;
};

type TableToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  chips?: { value: string; label: string; count?: number }[];
  chipValue?: string;
  onChipChange?: (value: string) => void;
  chipLabel?: string;
  filters?: FilterConfig[];
  actions?: React.ReactNode;
  className?: string;
};

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  chips,
  chipValue = '',
  onChipChange,
  chipLabel,
  filters,
  actions,
  className,
}: TableToolbarProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {chips && chips.length > 0 && onChipChange && (
        <ChipStrip
          chips={chips}
          value={chipValue}
          onChange={onChipChange}
          label={chipLabel ?? 'Filter by status'}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="w-full min-w-0 sm:w-auto sm:flex-1"
        />

        {filters?.map((filter) => (
          <div
            key={filter.key}
            className="min-w-0 flex-1 sm:w-auto sm:flex-none"
          >
            <BaggSelect
              label={filter.label}
              hideLabel={filter.hideLabel ?? true}
              value={filter.value}
              onChange={filter.onChange}
              options={filter.options}
              width="auto"
              className="w-full sm:w-auto"
            />
          </div>
        ))}

        {actions && (
          <div className="ml-auto flex w-full justify-end sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
