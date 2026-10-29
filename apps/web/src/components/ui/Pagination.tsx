"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { buttonStyles } from "./button";
import { BaggSelect } from "./BaggSelect";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  perPageOptions?: number[];
  onPerPageChange?: (n: number) => void;
  className?: string;
};

/** Returns page numbers to show, inserting null for ellipsis gaps. */
function getPageNumbers(
  current: number,
  total: number,
): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | null)[] = [];
  const addPage = (p: number) => {
    if (!pages.includes(p)) pages.push(p);
  };

  addPage(1);
  if (current > 3) pages.push(null); // left ellipsis
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    addPage(p);
  }
  if (current < total - 2) pages.push(null); // right ellipsis
  addPage(total);

  return pages;
}

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  perPageOptions = [10, 20, 50],
  onPerPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1 && total <= perPage) return null;

  const from = Math.min((page - 1) * perPage + 1, total);
  const to = Math.min(page * perPage, total);
  const pages = getPageNumbers(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 text-caption text-text-soft",
        className,
      )}
    >
      {/* Count */}
      <span>
        Showing {from}–{to} of {total}
      </span>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            buttonStyles({ variant: "outline", zone: "calm" }),
            "px-2",
          )}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === null ? (
            <span key={`ellipsis-${i}`} className="px-1">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(
                "flex h-9 min-w-9 items-center justify-center rounded-btn border px-2 text-body font-semibold transition-colors",
                p === page
                  ? "border-ink bg-ink text-surface"
                  : "border-line hover:border-ink hover:bg-surface-tint",
              )}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            buttonStyles({ variant: "outline", zone: "calm" }),
            "px-2",
          )}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {/* Per-page */}
      {onPerPageChange && (
        <BaggSelect
          label="Per page"
          hideLabel
          value={String(perPage)}
          onChange={(v) => onPerPageChange(Number(v))}
          options={perPageOptions.map((n) => ({
            value: String(n),
            label: `${n} per page`,
          }))}
        />
      )}
    </div>
  );
}
