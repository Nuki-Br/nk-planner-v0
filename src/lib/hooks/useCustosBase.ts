"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listCustosBase, saveCustoBase, type CustoBaseInput } from "@/lib/data/store";
import type { CustoBaseRow, CustosBase } from "@/shared/types/domain";

import { scheduleReconcile } from "./diffRefresh";
import { queryKeys } from "./queryKeys";

/** Linhas da aba "Custos base" — todo material que precisa de custo no projeto. */
export function useCustosBase(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.custosBase(projectId ?? 0),
    queryFn: () => listCustosBase(projectId ?? 0),
    enabled: projectId !== null,
  });
}

/** As mesmas linhas indexadas por baseId — é o que o motor de cálculo consome. */
export function toCustosBaseMap(rows: CustoBaseRow[] | undefined): CustosBase {
  const out: CustosBase = {};
  for (const r of rows ?? []) {
    out[r.baseId] = { baseId: r.baseId, custoMat: r.custoMat, custoMO: r.custoMO };
  }
  return out;
}

/**
 * Aplica o patch na linha certa do cache. Só o campo enviado muda — a grade
 * grava `custoMat` OU `custoMO` por vez (blur de cada campo), então mandar o
 * outro como 0 apagaria o valor já preenchido.
 */
function applyCustoPatch(prev: CustoBaseRow[] | undefined, input: CustoBaseInput): CustoBaseRow[] {
  return (prev ?? []).map((r) =>
    r.baseId === input.baseId
      ? {
          ...r,
          ...(input.custoMat !== undefined ? { custoMat: input.custoMat } : {}),
          ...(input.custoMO !== undefined ? { custoMO: input.custoMO } : {}),
        }
      : r
  );
}

/**
 * Grava o custo base. Otimista: a grade e o preço (que consome o custo) refletem
 * a edição na hora e o servidor confirma em background; reverte no erro. A
 * reconciliação e o refresh do badge ficam no debounce compartilhado (dispara
 * ~700ms depois que o usuário para de editar).
 */
export function useSaveCustoBase(projectId: number | null) {
  const queryClient = useQueryClient();
  const key = queryKeys.custosBase(projectId ?? 0);
  return useMutation({
    mutationFn: (input: CustoBaseInput) => saveCustoBase(projectId ?? 0, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CustoBaseRow[]>(key);
      queryClient.setQueryData<CustoBaseRow[]>(key, (prev) => applyCustoPatch(prev, input));
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => scheduleReconcile(queryClient, projectId ?? 0),
  });
}
