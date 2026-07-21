import type { SortDescriptor } from "@heroui/react";

import type { DataTableColumn } from "./DataTable";

/**
 * Ordena linhas por uma coluna do DataTable.
 *
 * Vive num módulo .ts próprio (e não dentro do DataTable.tsx) por dois
 * motivos: o setup do vitest não transforma JSX, então só assim dá para testar
 * a comparação; e quem usa a ordenação controlada precisa importar a função
 * sem arrastar o componente junto.
 *
 * Usada nos dois lados — pelo DataTable no modo interno e pelo caller no modo
 * controlado — para que tabela e caller nunca ordenem por critérios diferentes.
 */
export function sortRows<T>(
  rows: T[],
  // Só `key` + `sortValue` são usados: assim o caller pode passar uma tabela de
  // ordenação estável em vez do array de colunas, que carrega closures de
  // render e muda de identidade a cada render.
  columns: readonly Pick<DataTableColumn<T>, "key" | "sortValue">[],
  sort: SortDescriptor | undefined
): T[] {
  if (!sort) return rows;
  const sortValue = columns.find((c) => c.key === sort.column)?.sortValue;
  if (!sortValue) return rows;
  const dir = sort.direction === "descending" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a);
    const vb = sortValue(b);
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb), "pt-BR", { numeric: true }) * dir;
  });
}
