"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ColumnDef<TRow> = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
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
  emptyState?: React.ReactNode;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  renderMobileCard: (row: TRow) => React.ReactNode;
  caption?: string;
  tableClassName?: string;
};

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

function SortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: ColumnDef<unknown>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  if (!column.sortable) return null;
  const active = sortBy === column.key;
  if (!active)
    return (
      <ArrowUpDown
        aria-hidden
        className="ml-1 inline-block h-3.5 w-3.5 opacity-40"
      />
    );
  return sortOrder === "asc" ? (
    <ArrowUp aria-hidden className="ml-1 inline-block h-3.5 w-3.5" />
  ) : (
    <ArrowDown aria-hidden className="ml-1 inline-block h-3.5 w-3.5" />
  );
}

export function DataTable<TRow>({
  columns,
  rows,
  getRowKey,
  loading = false,
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
        className="flex justify-center py-16 text-text-muted"
      >
        <Loader2 aria-hidden className="h-6 w-6 animate-spin" />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-row border border-line-subtle md:block">
        <table
          className={cn(
            "w-full text-left text-body",
            tableClassName,
          )}
        >
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-surface-tint text-caption text-text-soft">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 font-semibold",
                    alignClass[col.align ?? "left"],
                    col.sortable &&
                      "cursor-pointer select-none hover:text-text",
                    col.headerClassName,
                  )}
                  aria-sort={
                    sortBy === col.key
                      ? sortOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : col.sortable
                        ? "none"
                        : undefined
                  }
                  onClick={
                    col.sortable && onSort
                      ? () => onSort(col.key)
                      : undefined
                  }
                >
                  {col.header}
                  <SortIcon
                    column={col as ColumnDef<unknown>}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-t border-line-subtle hover:bg-surface-tint"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-4",
                      alignClass[col.align ?? "left"],
                      col.cellClassName,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)}>{renderMobileCard(row)}</li>
        ))}
      </ul>
    </>
  );
}
