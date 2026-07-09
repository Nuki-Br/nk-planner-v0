"use client";

import { useQuery } from "@tanstack/react-query";

import { listPendingItems } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

// Referência estável do select: definido no módulo, o React Query não re-roda o
// select nem devolve um Set novo a cada render (o que estouraria memos que
// dependem do Set — ex.: o `deps` do BudgetScreen).
const keysToSet = (keys: string[]): Set<string> => new Set(keys);

/**
 * Itens aguardando custo do terceiro. O store guarda string[] (serializável);
 * a borda expõe Set<string> para lookup O(1) no motor (calcKitRow) e nas telas.
 */
export function usePendingItems() {
  return useQuery({
    queryKey: queryKeys.pendingItems,
    queryFn: listPendingItems,
    select: keysToSet,
  });
}
