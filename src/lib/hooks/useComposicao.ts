"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { composicaoOp } from "@/lib/data/store";
import type { ComposicaoOp } from "@/shared/types/costItems";
import type { CustoBaseRow } from "@/shared/types/domain";

import { scheduleReconcile } from "./diffRefresh";
import { mutationKeys, queryKeys } from "./queryKeys";
import { enqueueWrite } from "./writeQueue";

export interface ComposicaoInput {
  baseId: number;
  body: ComposicaoOp;
}

/**
 * Operações ESTRUTURAIS da composição (adicionar/remover/reordenar linhas,
 * aplicar em outros materiais): não são otimistas — o servidor devolve a
 * composição resolvida no refetch de custos base, e o diff/insumos vão junto.
 */
export function useComposicaoOp(projectId: number | null) {
  const queryClient = useQueryClient();
  const pid = projectId ?? 0;
  return useMutation({
    mutationKey: mutationKeys.composicao(pid),
    mutationFn: ({ baseId, body }: ComposicaoInput) => composicaoOp(pid, baseId, body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.custosBase(pid) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.costItems(pid) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pricingDiff(pid) }),
      ]),
  });
}

/**
 * Edição otimista de UMA linha de custos base (mesmo molde de useSaveCustoBase):
 * a grade reflete na hora, a fila por baseId serializa dois blur seguidos, a
 * reconciliação e o gate de publicar já acompanham a key `saveCusto`.
 */
function useOptimisticCustoRow<I extends { baseId: number }>(
  projectId: number | null,
  run: (pid: number, input: I) => Promise<unknown>,
  apply: (row: CustoBaseRow, input: I) => CustoBaseRow
) {
  const queryClient = useQueryClient();
  const pid = projectId ?? 0;
  const key = queryKeys.custosBase(pid);
  const rowOf = (rows: CustoBaseRow[] | undefined, baseId: number) =>
    rows?.find((r) => r.baseId === baseId);
  return useMutation({
    mutationKey: mutationKeys.saveCusto(pid),
    mutationFn: (input: I) => enqueueWrite(`custo:${pid}:${input.baseId}`, () => run(pid, input)),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = rowOf(queryClient.getQueryData<CustoBaseRow[]>(key), input.baseId);
      queryClient.setQueryData<CustoBaseRow[]>(key, (prev) =>
        prev?.map((r) => (r.baseId === input.baseId ? apply(r, input) : r))
      );
      const applied = rowOf(queryClient.getQueryData<CustoBaseRow[]>(key), input.baseId);
      return { before, applied };
    },
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

export interface UpdateLineInput {
  baseId: number;
  lineId: number;
  qtd: number;
}

/** Quantitativo de uma linha da composição (blur da célula). */
export function useUpdateComposicaoLine(projectId: number | null) {
  return useOptimisticCustoRow<UpdateLineInput>(
    projectId,
    (pid, { baseId, lineId, qtd }) =>
      composicaoOp(pid, baseId, { op: "updateLine", lineId, qtd }),
    (row, { lineId, qtd }) => ({
      ...row,
      composicao: row.composicao.map((l) => (l.id === lineId ? { ...l, qtd } : l)),
    })
  );
}

export interface SetCustoQtdInput {
  baseId: number;
  custoQtd: number;
}

/** Coeficiente do próprio material na composição (blur da célula). */
export function useSetCustoQtd(projectId: number | null) {
  return useOptimisticCustoRow<SetCustoQtdInput>(
    projectId,
    (pid, { baseId, custoQtd }) => composicaoOp(pid, baseId, { op: "setCostQuantity", custoQtd }),
    (row, { custoQtd }) => ({ ...row, custoQtd })
  );
}
