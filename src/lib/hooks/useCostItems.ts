"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createCostItems, deleteCostItem, listCostItems, updateCostItem } from "@/lib/data/store";
import type { CostItemLineInput, CostItemPatch } from "@/shared/types/costItems";
import type { CompositionLine, CostItemRow, CustoBaseRow } from "@/shared/types/domain";

import { scheduleReconcile } from "./diffRefresh";
import { mutationKeys, queryKeys } from "./queryKeys";
import { enqueueWrite } from "./writeQueue";

/** Insumos da org com o preço deste empreendimento (aba "Itens de custo" + autocomplete). */
export function useCostItems(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.costItems(projectId ?? 0),
    queryFn: () => listCostItems(projectId ?? 0),
    enabled: projectId !== null,
  });
}

export interface UpdateCostItemInput {
  itemId: number;
  patch: CostItemPatch;
}

function applyItemPatch(r: CostItemRow, p: CostItemPatch): CostItemRow {
  return {
    ...r,
    ...(p.codigo !== undefined ? { codigo: p.codigo } : {}),
    ...(p.nome !== undefined ? { nome: p.nome } : {}),
    ...(p.unidade !== undefined ? { unidade: p.unidade } : {}),
    ...(p.preco !== undefined ? { preco: p.preco } : {}),
  };
}

function applyLinePatch(l: CompositionLine, p: CostItemPatch): CompositionLine {
  return {
    ...l,
    ...(p.codigo !== undefined ? { codigo: p.codigo } : {}),
    ...(p.nome !== undefined ? { nome: p.nome } : {}),
    ...(p.unidade !== undefined ? { unidade: p.unidade } : {}),
    ...(p.preco !== undefined ? { preco: p.preco } : {}),
  };
}

/**
 * Edita identidade/preço de um insumo. Otimista nos DOIS caches: a lista de
 * itens e toda linha de composição (custos base) que usa o insumo — o preço é
 * compartilhado, então o total de cada material muda na hora. Reverte só a
 * linha desta gravação (se ninguém a editou depois), mesma regra de
 * useSaveCustoBase; a reconciliação fica no debounce compartilhado.
 */
export function useUpdateCostItem(projectId: number | null) {
  const queryClient = useQueryClient();
  const pid = projectId ?? 0;
  const itemsKey = queryKeys.costItems(pid);
  const custosKey = queryKeys.custosBase(pid);
  const itemOf = (rows: CostItemRow[] | undefined, id: number) => rows?.find((r) => r.id === id);
  return useMutation({
    mutationKey: mutationKeys.saveCostItem(pid),
    mutationFn: ({ itemId, patch }: UpdateCostItemInput) =>
      enqueueWrite(`cost-item:${pid}:${itemId}`, () => updateCostItem(pid, itemId, patch)),
    onMutate: async ({ itemId, patch }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: itemsKey }),
        queryClient.cancelQueries({ queryKey: custosKey }),
      ]);
      const beforeItem = itemOf(queryClient.getQueryData<CostItemRow[]>(itemsKey), itemId);
      queryClient.setQueryData<CostItemRow[]>(itemsKey, (prev) =>
        prev?.map((r) => (r.id === itemId ? applyItemPatch(r, patch) : r))
      );
      const appliedItem = itemOf(queryClient.getQueryData<CostItemRow[]>(itemsKey), itemId);

      const beforeCustos = queryClient.getQueryData<CustoBaseRow[]>(custosKey);
      queryClient.setQueryData<CustoBaseRow[]>(custosKey, (prev) =>
        prev?.map((row) =>
          row.composicao.some((l) => l.itemId === itemId)
            ? {
                ...row,
                composicao: row.composicao.map((l) =>
                  l.itemId === itemId ? applyLinePatch(l, patch) : l
                ),
              }
            : row
        )
      );
      const appliedCustos = queryClient.getQueryData<CustoBaseRow[]>(custosKey);
      return { beforeItem, appliedItem, beforeCustos, appliedCustos };
    },
    onError: (_err, { itemId }, ctx) => {
      if (!ctx) return;
      const { beforeItem, appliedItem, beforeCustos, appliedCustos } = ctx;
      if (beforeItem) {
        queryClient.setQueryData<CostItemRow[]>(itemsKey, (cur) =>
          cur?.map((r) => (r.id === itemId && r === appliedItem ? beforeItem : r))
        );
      }
      if (beforeCustos) {
        queryClient.setQueryData<CustoBaseRow[]>(custosKey, (cur) =>
          cur === appliedCustos ? beforeCustos : cur
        );
      }
    },
    onSettled: () => scheduleReconcile(queryClient, pid),
  });
}

/** Invalida o que a criação/remoção de insumo toca — lista, custos base e diff. */
function useCostItemsInvalidate(pid: number) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.costItems(pid) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.custosBase(pid) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pricingDiff(pid) }),
    ]);
}

/** Grade "Adicionar itens" (aba Itens de custo): cria/atualiza vários num request. */
export function useCreateCostItems(projectId: number | null) {
  const pid = projectId ?? 0;
  const invalidate = useCostItemsInvalidate(pid);
  return useMutation({
    mutationKey: mutationKeys.composicao(pid),
    mutationFn: (lines: CostItemLineInput[]) => createCostItems(pid, lines),
    onSuccess: () => invalidate(),
  });
}

/** Remove o insumo da org (e das composições que o usam — a tela confirma antes). */
export function useDeleteCostItem(projectId: number | null) {
  const pid = projectId ?? 0;
  const invalidate = useCostItemsInvalidate(pid);
  return useMutation({
    mutationKey: mutationKeys.composicao(pid),
    mutationFn: (itemId: number) => deleteCostItem(pid, itemId),
    onSuccess: () => invalidate(),
  });
}
