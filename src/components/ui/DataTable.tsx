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

import { sortRows } from "./sortRows";

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
  /**
   * Ordenação controlada. Só faz sentido para quem PAGINA: com as linhas já
   * fatiadas, ordenar aqui dentro ordenaria apenas a página visível, e
   * "ordenar por código" não traria o menor código da lista inteira. Quem passa
   * estes props ordena o conjunto completo antes de fatiar (ver CatalogScreen).
   *
   * Omitidos, o estado interno continua valendo — é o modo dos demais callers.
   */
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
}

/** Tabela simples com ordenação client-side (DataTable do protótipo). */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyText = "Nenhum item encontrado.",
  "aria-label": ariaLabel,
  sortDescriptor,
  onSortChange,
}: DataTableProps<T>) {
  const [internalSort, setInternalSort] = React.useState<SortDescriptor | undefined>(undefined);
  const controlled = onSortChange !== undefined;
  const sort = controlled ? sortDescriptor : internalSort;
  const setSort = controlled ? onSortChange : setInternalSort;

  const sorted = React.useMemo(
    // No modo controlado as linhas já chegam ordenadas por quem controla —
    // reordenar aqui só reordenaria a página.
    () => (controlled ? rows : sortRows(rows, columns, sort)),
    [rows, sort, columns, controlled]
  );

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
