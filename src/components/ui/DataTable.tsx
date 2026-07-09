"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  type SortDescriptor,
} from "@heroui/react";

import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  /** Identificador único da coluna. */
  key: string;
  label: string;
  /** Conteúdo da célula. */
  render: (row: T) => React.ReactNode;
  /**
   * Valor bruto usado na ordenação. Coluna é ordenável quando definido
   * (o DataTable do protótipo ordena por padrão; `sortable: false` opta fora).
   */
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  "aria-label": string;
}

/** Tabela simples com ordenação client-side (DataTable do protótipo). */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyText = "Nenhum item encontrado.",
  "aria-label": ariaLabel,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<SortDescriptor | undefined>(undefined);

  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.column);
    const sortValue = col?.sortValue;
    if (!sortValue) return rows;
    const dir = sort.direction === "descending" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const va = sortValue(a);
      const vb = sortValue(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "pt-BR", { numeric: true }) * dir;
    });
  }, [rows, sort, columns]);

  const byKey = React.useMemo(() => {
    const map = new Map<string, T>();
    for (const row of rows) map.set(String(rowKey(row)), row);
    return map;
  }, [rows, rowKey]);

  return (
    <Table
      aria-label={ariaLabel}
      removeWrapper
      sortDescriptor={sort}
      onSortChange={setSort}
      onRowAction={
        onRowClick
          ? (key) => {
              const row = byKey.get(String(key));
              if (row) onRowClick(row);
            }
          : undefined
      }
      classNames={{
        th: "bg-transparent px-3 text-[11px] font-bold uppercase tracking-wider text-neutral-gray-7 first:rounded-none last:rounded-none border-b-2 border-neutral-gray-4",
        td: "px-3 py-2.5 text-[13px] text-neutral-gray-11",
        tr: cn(
          "border-b border-neutral-gray-4 last:border-b-0",
          onRowClick && "cursor-pointer hover:bg-neutral-gray-2"
        ),
      }}
    >
      <TableHeader columns={columns}>
        {(col) => (
          <TableColumn
            key={col.key}
            align={col.align}
            allowsSorting={!!col.sortValue && col.sortable !== false}
            className={col.className}
          >
            {col.label}
          </TableColumn>
        )}
      </TableHeader>
      <TableBody
        items={sorted}
        emptyContent={<span className="text-[13px] text-neutral-gray-6">{emptyText}</span>}
      >
        {(row) => (
          <TableRow key={rowKey(row)}>
            {(columnKey) => {
              const col = columns.find((c) => c.key === columnKey);
              return (
                <TableCell className={col?.className}>
                  {col ? col.render(row) : null}
                </TableCell>
              );
            }}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
