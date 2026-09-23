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
import { mutationKeys, queryKeys } from "./queryKeys";
import { enqueueWrite } from "./writeQueue";

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
 * round-trip apareceria como travada), e reverte no erro (o toast global do
 * MutationCache avisa). O refetch de reconciliação + o refresh do badge ficam
 * no debounce compartilhado (dispara ~700ms depois que o usuário para de
 * editar) — invalidar por tecla causava corrida entre edições rápidas.
 */
export function useSavePricing(projectId: number | null) {
  const queryClient = useQueryClient();
  const pid = projectId ?? 0;
  const key = queryKeys.pricing(pid);
  return useMutation({
    // A key deixa o `isMutating` (reconciliação) e o `waitForSaves` (gate de
    // publicar) mirarem só estas gravações; a fila por optionId garante ordem
    // de submissão.
    mutationKey: mutationKeys.savePricing(pid),
    mutationFn: (input: PricingInput) =>
      enqueueWrite(`pricing:${pid}:${input.optionId}`, () => savePricing(pid, input)),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<PricingMap>(key)?.[input.optionId];
      queryClient.setQueryData<PricingMap>(key, (prev) => applyPatch(prev, input));
      // Lido de volta do cache (o structural sharing copia o objeto): é a
      // referência que o onError compara para saber se a célula mudou depois.
      const applied = queryClient.getQueryData<PricingMap>(key)?.[input.optionId];
      return { before, applied };
    },
    // Reverte SÓ a linha desta gravação — restaurar o mapa inteiro apagaria as
    // edições otimistas de outras células feitas nesse meio-tempo. E só se
    // ninguém a editou depois: uma edição mais nova da mesma linha (na fila)
    // já carrega o estado atual e vai gravá-lo.
    onError: (_err, input, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData<PricingMap>(key, (cur) => {
        if (!cur || cur[input.optionId] !== ctx.applied) return cur;
        const next = { ...cur };
        if (ctx.before) next[input.optionId] = ctx.before;
        else delete next[input.optionId];
        return next;
      });
    },
    onSettled: () => scheduleReconcile(queryClient, pid),
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
