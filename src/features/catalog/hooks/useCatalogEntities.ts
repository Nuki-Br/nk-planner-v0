"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchCatalogEntities } from "@/lib/api/catalog";
import { queryKeys } from "@/lib/hooks/queryKeys";
import type { CatalogTipo } from "@/shared/types/catalog";

/** Página dos pickers. O catálogo pagina no cliente e usa outro tamanho. */
export const CATALOG_PICKER_PAGE_SIZE = 20;

/**
 * Listagem paginada do catálogo. Espelha useMediaFiles: busca, filtros e
 * exclusões vão TODOS para a API (where do Prisma), nunca aplicados no cliente
 * depois da paginação — senão a contagem de páginas discorda dos resultados.
 */
export function useCatalogEntities({
  tipo = "all",
  page,
  search,
  categoriaId,
  excludeIds,
  pageSize = CATALOG_PICKER_PAGE_SIZE,
  enabled = true,
}: {
  tipo?: CatalogTipo;
  page: number;
  search?: string;
  /** undefined = sem filtro; null = sem categoria; number = a categoria. */
  categoriaId?: number | null;
  excludeIds?: readonly number[];
  pageSize?: number;
  enabled?: boolean;
}) {
  // Normaliza para string ordenada ANTES de entrar na query key: os call sites
  // montam esse array inline (`itens.map(...)`), então a identidade muda a cada
  // render e a key sozinha nunca estabilizaria.
  const excludeKey = React.useMemo(
    () => [...(excludeIds ?? [])].sort((a, b) => a - b).join(","),
    [excludeIds]
  );

  return useQuery({
    queryKey: queryKeys.catalogEntities(
      tipo,
      page,
      search?.trim() ?? "",
      categoriaId === undefined ? "" : String(categoriaId),
      excludeKey
    ),
    queryFn: () =>
      fetchCatalogEntities({
        tipo,
        page,
        limit: pageSize,
        search: search?.trim() || undefined,
        categoriaId,
        // Reconstrói a partir da key normalizada: garante que o que foi para a
        // cache e o que vai para a URL são exatamente a mesma lista.
        excludeIds: excludeKey === "" ? undefined : excludeKey.split(",").map(Number),
      }),
    enabled,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
