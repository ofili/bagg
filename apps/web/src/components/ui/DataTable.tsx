'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export type ColumnDef<TRow> = {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: TRow) => React.ReactNode;
};

type DataTableProps<TRow> = {
  columns: ColumnDef<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow) => string;
  loading?: boolean;
  errorState?: React.ReactNode;
  emptyState?: React.ReactNode;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  renderMobileCard: (row: TRow) => React.ReactNode;
  caption?: string;
  tableClassName?: string;
};

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

function SortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: ColumnDef<unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  if (!column.sortable) return null;

  const active = sortBy === column.key;

  if (!active) {
    return (
      <ArrowUpDown
        aria-hidden
        className="ml-1 inline-block h-3.5 w-3.5 opacity-40"
      />
    );
  }

  return sortOrder === 'asc' ? (
    <ArrowUp
      aria-hidden
      className="ml-1 inline-block h-3.5 w-3.5"
    />
  ) : (
    <ArrowDown
      aria-hidden
      className="ml-1 inline-block h-3.5 w-3.5"
    />
  );
}

export function DataTable<TRow>({
  columns,
  rows,
  getRowKey,
  loading = false,
  errorState,
  emptyState,
  sortBy,
  sortOrder,
  onSort,
  renderMobileCard,
  caption,
  tableClassName,
}: DataTableProps<TRow>) {
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex justify-center py-16 text-text-muted"
      >
        <Loader2
          aria-hidden
          className="h-6 w-6 animate-spin motion-reduce:animate-none"
        />
        <span className="sr-only">Loading records</span>
      </div>
    );
  }

  if (errorState) {
    return <>{errorState}</>;
  }

  if (rows.length === 0) {
    return (
      <>
        {emptyState ?? (
          <p className="py-10 text-center text-body text-text-muted">
            No records to display.
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-row border border-line-subtle md:block">
        <table
          className={cn('w-full text-left text-body', tableClassName)}
        >
          {caption && (
            <caption className="sr-only">{caption}</caption>
          )}

          <thead className="bg-surface-tint text-caption text-text-soft">
            <tr>
              {columns.map((column) => {
                const canSort = Boolean(
                  column.sortable && onSort,
                );

                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'px-4 py-3 font-semibold',
                      alignClass[column.align ?? 'left'],
                      column.headerClassName,
                    )}
                    aria-sort={
                      canSort && sortBy === column.key
                        ? sortOrder === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : canSort
                          ? 'none'
                          : undefined
                    }
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={() => onSort?.(column.key)}
                        className={cn(
                          'inline-flex min-h-8 items-center gap-1',
                          'rounded-small text-inherit',
                          'hover:text-text',
                          'focus-visible:outline-2',
                          'focus-visible:outline-offset-2',
                          'focus-visible:outline-ink',
                        )}
                        aria-label={`Sort by ${column.header}${
                          sortBy === column.key
                            ? `, currently ${
                                sortOrder === 'asc'
                                  ? 'ascending'
                                  : 'descending'
                              }`
                            : ''
                        }`}
                      >
                        {column.header}
                        <SortIcon
                          column={column as ColumnDef<unknown>}
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-t border-line-subtle hover:bg-surface-tint"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-4',
                      alignClass[column.align ?? 'left'],
                      column.cellClassName,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)}>
            {renderMobileCard(row)}
          </li>
        ))}
      </ul>
    </>
  );
}
