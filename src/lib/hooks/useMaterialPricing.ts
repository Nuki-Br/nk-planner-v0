"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPricingDiff,
  listPricing,
  publishBudget,
  savePricing,
  type PricingInput,
  type PricingMap,
  type PublishBudgetInput,
} from "@/lib/data/store";
import { EMPTY_PRICING } from "@/shared/types/domain";

import { scheduleReconcile } from "./diffRefresh";
import { queryKeys } from "./queryKeys";

/** Rascunho de precificação do empreendimento (optionId → overrides). */
export function usePricing(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.pricing(projectId ?? 0),
    queryFn: () => listPricing(projectId ?? 0),
    enabled: projectId !== null,
  });
}

/**
 * Aplica o patch no mapa em cache. `undefined` não toca no campo e `null` limpa
 * o override — a mesma semântica do servidor, senão a atualização otimista
 * discorda do que volta do PATCH e a célula "pisca" de volta.
 */
function applyPatch(prev: PricingMap | undefined, input: PricingInput): PricingMap {
  const cur = prev?.[input.optionId] ?? EMPTY_PRICING;
  return {
    ...prev,
    [input.optionId]: {
      valorUnitario: input.valorUnitario !== undefined ? input.valorUnitario : cur.valorUnitario,
      qtd: input.qtd !== undefined ? input.qtd : cur.qtd,
      rt: input.rt !== undefined ? input.rt : cur.rt,
      unidade: input.unidade !== undefined ? input.unidade : cur.unidade,
      colunas: input.colunas !== undefined ? input.colunas : cur.colunas,
    },
  };
}

/**
 * Grava um override. Otimista: a tabela recalcula na hora (é uma planilha — o
 * round-trip apareceria como travada), e reverte no erro. O refetch de
 * reconciliação + o refresh do badge ficam no debounce compartilhado (dispara
 * ~700ms depois que o usuário para de editar) — invalidar por tecla causava
 * corrida entre edições rápidas.
 */
export function useSavePricing(projectId: number | null) {
  const queryClient = useQueryClient();
  const key = queryKeys.pricing(projectId ?? 0);
  return useMutation({
    mutationFn: (input: PricingInput) => savePricing(projectId ?? 0, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PricingMap>(key);
      queryClient.setQueryData<PricingMap>(key, (prev) => applyPatch(prev, input));
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => scheduleReconcile(queryClient, projectId ?? 0),
  });
}

/** O que mudou desde a última publicação (badge + modal). */
export function usePricingDiff(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.pricingDiff(projectId ?? 0),
    queryFn: () => getPricingDiff(projectId ?? 0),
    enabled: projectId !== null,
  });
}

export function usePublishBudget(projectId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishBudgetInput) => publishBudget(projectId ?? 0, input),
    onSuccess: () => {
      const id = projectId ?? 0;
      void queryClient.invalidateQueries({ queryKey: queryKeys.pricingDiff(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.versions(id) });
      // O publicado vive no Material, que chega dentro da árvore de tipologias.
      void queryClient.invalidateQueries({ queryKey: queryKeys.tipologiasRoot });
    },
  });
}
