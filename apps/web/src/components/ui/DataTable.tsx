'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  onRowClick?: (row: TRow) => void;
  getRowHref?: (row: TRow) => string;
};

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

const shellClass = 'overflow-hidden border-brut border-ink bg-surface';

const headerCellClass =
  'border-b-brut border-ink bg-surface-tint px-4 py-3 text-caption font-extrabold uppercase tracking-wide text-text-soft';

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

function LoadingTable<TRow>({
  columns,
  tableClassName,
}: {
  columns: ColumnDef<TRow>[];
  tableClassName?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading records">
      <div className={cn(shellClass, 'hidden md:block')} aria-hidden="true">
        <table className={cn('w-full text-left text-body', tableClassName)}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    headerCellClass,
                    alignClass[column.align ?? 'left'],
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-line-subtle">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-4',
                      alignClass[column.align ?? 'left'],
                      column.cellClassName,
                    )}
                  >
                    <div
                      className={cn(
                        'h-4 animate-pulse rounded-small bg-surface-tint',
                        'motion-reduce:animate-none',
                        column.align === 'right' ? 'ml-auto w-16' : 'w-3/4',
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              shellClass,
              'h-24 animate-pulse bg-surface-tint motion-reduce:animate-none',
            )}
          />
        ))}
      </div>

      <span className="sr-only">Loading records</span>
    </div>
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
  onRowClick,
  getRowHref,
}: DataTableProps<TRow>) {
  const router = useRouter();
  const isClickable = Boolean(onRowClick || getRowHref);

  const handleRowClick = (
    row: TRow,
    e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  ) => {
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        'button, a, input, select, textarea, [role="button"], [data-no-row-click]',
      )
    ) {
      return;
    }

    if (onRowClick) {
      onRowClick(row);
    } else if (getRowHref) {
      const href = getRowHref(row);
      if ('metaKey' in e && (e.metaKey || e.ctrlKey)) {
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }
      router.push(href);
    }
  };

  const handleRowAuxClick = (row: TRow, e: React.MouseEvent<HTMLElement>) => {
    if (e.button === 1 && getRowHref) {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          'button, a, input, select, textarea, [role="button"], [data-no-row-click]',
        )
      ) {
        return;
      }
      window.open(getRowHref(row), '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <LoadingTable
        columns={columns}
        tableClassName={tableClassName}
      />
    );
  }

  if (errorState) {
    return <>{errorState}</>;
  }

  if (rows.length === 0) {
    return (
      <div className={shellClass}>
        {emptyState ?? (
          <p className="px-6 py-12 text-center text-body text-text-muted">
            No records to display.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={cn(shellClass, 'hidden md:block')}>
        <div className="overflow-x-auto">
          <table
            className={cn('w-full text-left text-body', tableClassName)}
          >
            {caption && (
              <caption className="sr-only">{caption}</caption>
            )}

            <thead>
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
                        headerCellClass,
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
                            'text-inherit hover:text-text',
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

            <tbody className="divide-y divide-line-subtle">
              {rows.map((row) => (
                <tr
                  key={getRowKey(row)}
                  tabIndex={isClickable ? 0 : undefined}
                  role={isClickable ? 'button' : undefined}
                  onClick={isClickable ? (e) => handleRowClick(row, e) : undefined}
                  onAuxClick={isClickable ? (e) => handleRowAuxClick(row, e) : undefined}
                  onKeyDown={
                    isClickable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            const target = e.target as HTMLElement | null;
                            if (
                              target?.closest(
                                'button, a, input, select, textarea, [role="button"], [data-no-row-click]',
                              )
                            ) {
                              return;
                            }
                            e.preventDefault();
                            handleRowClick(row, e);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    'transition-colors',
                    isClickable
                      ? 'cursor-pointer hover:bg-surface-tint active:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink'
                      : 'hover:bg-surface-tint/60',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-4 align-middle',
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
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li
            key={getRowKey(row)}
            tabIndex={isClickable ? 0 : undefined}
            role={isClickable ? 'button' : undefined}
            onClick={isClickable ? (e) => handleRowClick(row, e) : undefined}
            onKeyDown={
              isClickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      const target = e.target as HTMLElement | null;
                      if (
                        target?.closest(
                          'button, a, input, select, textarea, [role="button"], [data-no-row-click]',
                        )
                      ) {
                        return;
                      }
                      e.preventDefault();
                      handleRowClick(row, e);
                    }
                  }
                : undefined
            }
            className={cn(
              isClickable &&
                'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink',
            )}
          >
            {renderMobileCard(row)}
          </li>
        ))}
      </ul>
    </>
  );
}
