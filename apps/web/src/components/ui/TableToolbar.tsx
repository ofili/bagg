"use client";

import { cn } from "@/lib/cn";
import { ChipStrip } from "@/components/mobile/ChipStrip";
import { BaggSelect } from "./BaggSelect";
import { SearchInput } from "./SearchInput";

export type FilterConfig = {
  key: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  hideLabel?: boolean;
};

type TableToolbarProps = {
  // Search
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  // Status chips (optional)
  chips?: { value: string; label: string; count?: number }[];
  chipValue?: string;
  onChipChange?: (v: string) => void;
  chipLabel?: string;
  // Extra filter dropdowns
  filters?: FilterConfig[];
  // Right-side CTA
  actions?: React.ReactNode;
  className?: string;
};

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  chips,
  chipValue = "",
  onChipChange,
  chipLabel,
  filters,
  actions,
  className,
}: TableToolbarProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Row 1: Chip strip (status filters) */}
      {chips && chips.length > 0 && onChipChange && (
        <ChipStrip
          chips={chips}
          value={chipValue}
          onChange={onChipChange}
          label={chipLabel ?? "Filter by status"}
        />
      )}

      {/* Row 2: Search + dropdowns + CTA */}
      <div className="flex items-center gap-2 sm:flex-wrap sm:gap-3">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1"
        />

        {filters?.map((f) => (
          <div key={f.key} className="shrink-0 sm:shrink sm:w-auto">
            <BaggSelect
              label={f.label}
              hideLabel={f.hideLabel ?? true}
              value={f.value}
              onChange={f.onChange}
              options={f.options}
              width="auto"
              className="w-auto"
            />
          </div>
        ))}

        {actions && <div className="ml-auto shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
