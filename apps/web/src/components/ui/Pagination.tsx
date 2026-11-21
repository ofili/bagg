
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { buttonStyles } from './button';
import { BaggSelect } from './BaggSelect';

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
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages: (number | null)[] = [];

  pages.push(1);

  if (current > 3) {
    pages.push(null);
  }

  for (
    let page = Math.max(2, current - 1);
    page <= Math.min(total - 1, current + 1);
    page += 1
  ) {
    pages.push(page);
  }

  if (current < total - 2) {
    pages.push(null);
  }

  pages.push(total);

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
  const safeTotal = Math.max(0, total);
  const safePerPage = Math.max(1, perPage);
  const safeTotalPages = Math.max(
    0,
    Math.ceil(safeTotal / safePerPage),
    totalPages,
  );

  if (safeTotalPages <= 1 && safeTotal <= safePerPage) {
    return null;
  }

  const safePage = Math.min(
    Math.max(1, page),
    Math.max(1, safeTotalPages),
  );

  const from =
    safeTotal === 0
      ? 0
      : Math.min((safePage - 1) * safePerPage + 1, safeTotal);

  const to = Math.min(safePage * safePerPage, safeTotal);
  const pages = getPageNumbers(safePage, safeTotalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3',
        'text-caption text-text-soft',
        className,
      )}
    >
      <span aria-live="polite" aria-atomic="true">
        Showing {from}–{to} of {safeTotal}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className={cn(
            buttonStyles({ variant: 'outline', zone: 'calm' }),
            'px-2',
          )}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>

        {pages.map((pageNumber, index) =>
          pageNumber === null ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="px-1"
            >
              …
            </span>
          ) : (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                'flex h-9 min-w-9 items-center justify-center',
                'rounded-btn border px-2 text-body font-semibold',
                'transition-colors',
                pageNumber === safePage
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line hover:border-ink hover:bg-surface-tint',
              )}
              aria-current={
                pageNumber === safePage ? 'page' : undefined
              }
              aria-label={`Page ${pageNumber}`}
            >
              {pageNumber}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={safePage >= safeTotalPages}
          onClick={() => onPageChange(safePage + 1)}
          className={cn(
            buttonStyles({ variant: 'outline', zone: 'calm' }),
            'px-2',
          )}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {onPerPageChange && (
        <BaggSelect
          label="Per page"
          hideLabel
          value={String(safePerPage)}
          onChange={(value) => onPerPageChange(Number(value))}
          options={perPageOptions.map((count) => ({
            value: String(count),
            label: `${count} per page`,
          }))}
        />
      )}
    </nav>
  );
}
