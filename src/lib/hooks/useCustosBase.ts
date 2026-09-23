"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listCustosBase, saveCustoBase, type CustoBaseInput } from "@/lib/data/store";
import type { CustoBaseRow, CustosBase } from "@/shared/types/domain";

import { scheduleReconcile } from "./diffRefresh";
import { mutationKeys, queryKeys } from "./queryKeys";
import { enqueueWrite } from "./writeQueue";

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
 * a edição na hora e o servidor confirma em background; reverte no erro (o toast
 * global do MutationCache avisa). A reconciliação e o refresh do badge ficam no
 * debounce compartilhado (dispara ~700ms depois que o usuário para de editar).
 */
export function useSaveCustoBase(projectId: number | null) {
  const queryClient = useQueryClient();
  const pid = projectId ?? 0;
  const key = queryKeys.custosBase(pid);
  const rowOf = (rows: CustoBaseRow[] | undefined, baseId: number) =>
    rows?.find((r) => r.baseId === baseId);
  return useMutation({
    // Mesma key que a reconciliação e o gate de publicar consultam; a fila por
    // baseId garante que dois blur seguidos do mesmo item não se atropelem.
    mutationKey: mutationKeys.saveCusto(pid),
    mutationFn: (input: CustoBaseInput) =>
      enqueueWrite(`custo:${pid}:${input.baseId}`, () => saveCustoBase(pid, input)),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = rowOf(queryClient.getQueryData<CustoBaseRow[]>(key), input.baseId);
      queryClient.setQueryData<CustoBaseRow[]>(key, (prev) => applyCustoPatch(prev, input));
      // Referência lida de volta do cache — ver useSavePricing.
      const applied = rowOf(queryClient.getQueryData<CustoBaseRow[]>(key), input.baseId);
      return { before, applied };
    },
    // Reverte SÓ a linha desta gravação, e só se ninguém a editou depois — mesma
    // regra do useSavePricing (não apagar edições otimistas mais novas).
    onError: (_err, input, ctx) => {
      const before = ctx?.before;
      if (!before) return;
      queryClient.setQueryData<CustoBaseRow[]>(key, (cur) =>
        cur?.map((r) => (r.baseId === input.baseId && r === ctx.applied ? before : r))
      );
    },
    onSettled: () => scheduleReconcile(queryClient, pid),
  });
}
