"use client";

import { useQuery } from "@tanstack/react-query";

import { listPendingItems } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

/**
 * Itens aguardando custo do terceiro. O store guarda string[] (serializável);
 * a borda expõe Set<string> para lookup O(1) no motor (calcKitRow) e nas telas.
 */
export function usePendingItems() {
  return useQuery({
    queryKey: queryKeys.pendingItems,
    queryFn: listPendingItems,
    select: (keys: string[]) => new Set(keys),
  });
}
