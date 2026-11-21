
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

const shellClass =
  'overflow-hidden border-brut border-ink bg-surface';

const headerCellClass =
  'border-b-brut border-ink bg-surface-tint px-4 py-3 text-caption font-extrabold uppercase tracking-wide text-text-soft';

const INTERACTIVE_SELECTOR = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[data-no-row-click]',
].join(', ');

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest(INTERACTIVE_SELECTOR))
  );
}

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

  if (sortBy !== column.key) {
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
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading records"
    >
      <div
        className={cn(shellClass, 'hidden md:block')}
        aria-hidden="true"
      >
        <table
          className={cn('w-full text-left text-body', tableClassName)}
        >
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
                        'h-4 rounded-small bg-surface-tint',
                        'animate-pulse motion-reduce:animate-none',
                        column.align === 'right'
                          ? 'ml-auto w-16'
                          : 'w-3/4',
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="space-y-3 md:hidden"
        aria-hidden="true"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              shellClass,
              'h-24 bg-surface-tint',
              'animate-pulse motion-reduce:animate-none',
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

  const activateRow = (row: TRow) => {
    if (onRowClick) {
      onRowClick(row);
      return;
    }

    if (getRowHref) {
      router.push(getRowHref(row));
    }
  };

  const handleRowClick = (
    row: TRow,
    event: React.MouseEvent<HTMLElement>,
  ) => {
    if (isInteractiveTarget(event.target)) return;

    if (getRowHref && (event.metaKey || event.ctrlKey)) {
      window.open(getRowHref(row), '_blank', 'noopener,noreferrer');
      return;
    }

    activateRow(row);
  };

  const handleRowAuxClick = (
    row: TRow,
    event: React.MouseEvent<HTMLElement>,
  ) => {
    if (
      event.button !== 1 ||
      !getRowHref ||
      isInteractiveTarget(event.target)
    ) {
      return;
    }

    window.open(getRowHref(row), '_blank', 'noopener,noreferrer');
  };

  const handleRowKeyDown = (
    row: TRow,
    event: React.KeyboardEvent<HTMLElement>,
  ) => {
    if (
      (event.key !== 'Enter' && event.key !== ' ') ||
      isInteractiveTarget(event.target)
    ) {
      return;
    }

    event.preventDefault();
    activateRow(row);
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
                  aria-label={
                    isClickable ? 'Open record' : undefined
                  }
                  onClick={
                    isClickable
                      ? (event) => handleRowClick(row, event)
                      : undefined
                  }
                  onAuxClick={
                    isClickable
                      ? (event) => handleRowAuxClick(row, event)
                      : undefined
                  }
                  onKeyDown={
                    isClickable
                      ? (event) => handleRowKeyDown(row, event)
                      : undefined
                  }
                  className={cn(
                    'transition-colors',
                    isClickable
                      ? [
                          'cursor-pointer hover:bg-surface-tint',
                          'active:bg-surface-sunken',
                          'focus-visible:outline',
                          'focus-visible:outline-2',
                          'focus-visible:outline-ink',
                          'focus-visible:outline-offset-[-2px]',
                        ]
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
            aria-label={
              isClickable ? 'Open record' : undefined
            }
            onClick={
              isClickable
                ? (event) => handleRowClick(row, event)
                : undefined
            }
            onKeyDown={
              isClickable
                ? (event) => handleRowKeyDown(row, event)
                : undefined
            }
            className={cn(
              isClickable && [
                'cursor-pointer',
                'focus-visible:outline',
                'focus-visible:outline-2',
                'focus-visible:outline-ink',
              ],
            )}
          >
            {renderMobileCard(row)}
          </li>
        ))}
      </ul>
    </>
  );
}
