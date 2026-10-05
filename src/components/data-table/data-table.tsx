"use client";

import * as React from "react";
import {
  columnVisibilityFeature,
  createSortedRowModel,
  flexRender,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type ColumnVisibilityState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, Columns3Icon, DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DataColumnMeta = {
  /** Translated label used by the column picker and as the CSV header. */
  label: string;
  /** Numbers are end-aligned and set in mono with tabular figures. */
  numeric?: boolean;
  /** Raw value for CSV export when the cell renders something richer. */
  csv?: (row: object) => string | number | null;
  /** Columns that cannot be hidden. */
  pinned?: boolean;
  className?: string;
};

/** Shared v9 feature set: sorting + column visibility, client-side sorted rows. */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, text: sortFn_text, datetime: sortFn_datetime },
  columnMeta: {} as DataColumnMeta,
});

export type DataColumn<T extends object> = ColumnDef<typeof dataTableFeatures, T>;

function toCsv<T extends object>(rows: T[], columns: DataColumn<T>[]): string {
  const visible = columns.filter((c) => c.meta);
  const escape = (value: unknown) => {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const header = visible.map((c) => escape(c.meta?.label)).join(",");
  const body = rows.map((row) =>
    visible
      .map((c) => {
        if (c.meta?.csv) return escape(c.meta.csv(row));
        const key = "accessorKey" in c ? (c.accessorKey as keyof T) : undefined;
        return escape(key ? row[key] : "");
      })
      .join(","),
  );
  return [header, ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export function DataTable<T extends object>({
  data,
  columns,
  loading = false,
  empty,
  toolbar,
  csvFilename,
  density = "default",
  maxHeight = 560,
  minWidth = 720,
  getRowId,
  caption,
}: {
  data: T[];
  /** Keep stable (module scope or useMemo); a new array re-derives every row model. */
  columns: DataColumn<T>[];
  loading?: boolean;
  /** Rendered in place of the body when there are no rows. */
  empty?: React.ReactNode;
  /** Start-side toolbar content (tabs, filters). */
  toolbar?: React.ReactNode;
  csvFilename?: string;
  density?: "default" | "compact";
  /** The header sticks inside a scroll area of this height. */
  maxHeight?: number;
  minWidth?: number;
  getRowId?: (row: T) => string;
  caption: string;
}) {
  const t = useTranslations("table");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [visibility, setVisibility] = React.useState<ColumnVisibilityState>({});

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
  });

  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide() && !c.columnDef.meta?.pinned);
  const rows = table.getRowModel().rows;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">{toolbar}</div>
        <div className="flex items-center gap-2">
          {hideable.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary">
                  <Columns3Icon aria-hidden />
                  {t("columns")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("showColumns")}</DropdownMenuLabel>
                {hideable.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {column.columnDef.meta?.label ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {csvFilename && (
            <Button
              size="sm"
              variant="secondary"
              disabled={loading || data.length === 0}
              onClick={() =>
                downloadCsv(
                  csvFilename,
                  toCsv(
                    table.getSortedRowModel().rows.map((r) => r.original),
                    columns.filter((c) => {
                      const id = c.id ?? ("accessorKey" in c ? String(c.accessorKey) : "");
                      return visibility[id] !== false;
                    }),
                  ),
                )
              }
            >
              <DownloadIcon aria-hidden />
              {t("exportCsv")}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-auto border-t border-border" style={{ maxHeight }}>
        <Table density={density} containerClassName="overflow-visible" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <TableHeader className="sticky top-0 z-10">
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      className={cn(meta?.numeric && "text-end", meta?.className)}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className={cn(
                            "inline-flex items-center gap-1 uppercase hover:text-fg",
                            meta?.numeric && "flex-row-reverse",
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUpIcon aria-hidden className="size-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon aria-hidden className="size-3" />
                          ) : (
                            <ChevronsUpDownIcon aria-hidden className="size-3 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 6 }, (_, i) => (
                  <TableRow key={`s${i}`}>
                    {table.getVisibleLeafColumns().map((c) => (
                      <TableCell key={c.id} className={cn(c.columnDef.meta?.numeric && "text-end")}>
                        <Skeleton className={cn("h-3.5", c.columnDef.meta?.numeric ? "ms-auto w-10" : "w-3/4")} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <TableCell key={cell.id} className={cn(meta?.numeric && "text-end num", meta?.className)}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {!loading && rows.length === 0 && (
          <div className="p-5">{empty ?? <p className="text-body text-fg-3">{t("empty")}</p>}</div>
        )}
      </div>
    </div>
  );
}
