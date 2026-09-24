"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addUpgrade,
  addUpgrades,
  cloneAmbiente,
  createAmbiente,
  createComponente,
  createTipologia,
  deleteAmbiente,
  deleteComponente,
  deleteTipologia,
  duplicateTipologia,
  getSharedInfo,
  linkAmbiente,
  removeUpgrade,
  reorderAmbientes,
  replaceUpgrade,
  reorderComponentes,
  setKitQtds,
  setPadrao,
  updateAmbiente,
  updateComponente,
  updateMetragens,
  updateTipologia,
  type AmbienteInput,
  type ComponenteInput,
  type TipologiaInput,
} from "@/lib/data/store";
import type { MetragemInput, Tipologia } from "@/shared/types/domain";

import { queryKeys } from "./queryKeys";

// Toda mutação na árvore de tipologias invalida o prefixo ["tipologias"]
// (cobre a lista e cada ["tipologias", id]); vínculos também invalidam o
// registro de compartilhamento.
function useTreeMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  extraKeys: readonly (readonly string[])[] = []
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tipologiasRoot });
      for (const key of extraKeys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

// ─── Tipologias ───────────────────────────────────────────────────────

export function useCreateTipologia(projectId: number) {
  return useTreeMutation((input: TipologiaInput) => createTipologia(projectId, input));
}

export function useUpdateTipologia() {
  return useTreeMutation(
    ({ id, patch }: { id: number; patch: Partial<TipologiaInput & Pick<Tipologia, "status">> }) =>
      updateTipologia(id, patch)
  );
}

export function useDeleteTipologia() {
  return useTreeMutation((id: number) => deleteTipologia(id));
}

export function useDuplicateTipologia() {
  return useTreeMutation((id: number) => duplicateTipologia(id));
}

// ─── Ambientes ────────────────────────────────────────────────────────

export function useCreateAmbiente() {
  return useTreeMutation(
    ({ tipologiaId, input }: { tipologiaId: number; input: AmbienteInput }) =>
      createAmbiente(tipologiaId, input)
  );
}

export function useUpdateAmbiente() {
  return useTreeMutation(
    ({
      tipologiaId,
      ambienteId,
      patch,
    }: {
      tipologiaId: number;
      ambienteId: number;
      patch: Partial<AmbienteInput>;
    }) => updateAmbiente(tipologiaId, ambienteId, patch)
  );
}

export function useDeleteAmbiente() {
  return useTreeMutation(
    ({ tipologiaId, ambienteId }: { tipologiaId: number; ambienteId: number }) =>
      deleteAmbiente(tipologiaId, ambienteId),
    [queryKeys.sharedAmbientesRoot]
  );
}

export function useCloneAmbiente() {
  return useTreeMutation(
    ({ tipologiaId, ambienteId }: { tipologiaId: number; ambienteId: number }) =>
      cloneAmbiente(tipologiaId, ambienteId)
  );
}

export function useReorderAmbientes() {
  return useTreeMutation(
    ({ tipologiaId, orderedIds }: { tipologiaId: number; orderedIds: number[] }) =>
      reorderAmbientes(tipologiaId, orderedIds)
  );
}

// ─── Compartilhamento ─────────────────────────────────────────────────

export function useSharedInfo(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.sharedAmbientes(projectId ?? 0),
    queryFn: () => getSharedInfo(projectId ?? 0),
    enabled: projectId !== null,
  });
}

export function useLinkAmbiente() {
  return useTreeMutation(
    ({
      targetTipologiaId,
      srcAmbienteId,
    }: {
      targetTipologiaId: number;
      srcAmbienteId: number;
    }) => linkAmbiente(targetTipologiaId, srcAmbienteId),
    [queryKeys.sharedAmbientesRoot]
  );
}

// ─── Componentes ──────────────────────────────────────────────────────

interface CompPath {
  tipologiaId: number;
  ambienteId: number;
  componenteId: number;
}

export function useCreateComponente() {
  return useTreeMutation(
    ({
      tipologiaId,
      ambienteId,
      input,
    }: {
      tipologiaId: number;
      ambienteId: number;
      input: ComponenteInput;
    }) => createComponente(tipologiaId, ambienteId, input)
  );
}

export function useUpdateComponente() {
  return useTreeMutation(({ tipologiaId, ambienteId, componenteId, patch }: CompPath & { patch: Partial<ComponenteInput> }) =>
    updateComponente(tipologiaId, ambienteId, componenteId, patch)
  );
}

/**
 * "Editar metragens" (qtd/RT em lote). A quantidade move o preço, então o diff
 * rascunho × publicado também é recarregado.
 */
export function useUpdateMetragens() {
  return useTreeMutation(
    ({ tipologiaId, itens }: { tipologiaId: number; itens: MetragemInput[] }) =>
      updateMetragens(tipologiaId, itens),
    [queryKeys.pricingDiffRoot]
  );
}

export function useDeleteComponente() {
  return useTreeMutation(({ tipologiaId, ambienteId, componenteId }: CompPath) =>
    deleteComponente(tipologiaId, ambienteId, componenteId)
  );
}

export function useReorderComponentes() {
  return useTreeMutation(
    ({
      tipologiaId,
      ambienteId,
      orderedIds,
    }: {
      tipologiaId: number;
      ambienteId: number;
      orderedIds: number[];
    }) => reorderComponentes(tipologiaId, ambienteId, orderedIds)
  );
}

export function useSetPadrao() {
  return useTreeMutation(({ tipologiaId, ambienteId, componenteId, padraoBaseId }: CompPath & { padraoBaseId: number | null }) =>
    setPadrao(tipologiaId, ambienteId, componenteId, padraoBaseId)
  );
}

export function useAddUpgrade() {
  return useTreeMutation(({ tipologiaId, ambienteId, componenteId, baseId }: CompPath & { baseId: number }) =>
    addUpgrade(tipologiaId, ambienteId, componenteId, baseId)
  );
}

export function useAddUpgrades() {
  return useTreeMutation(({ tipologiaId, ambienteId, componenteId, baseIds }: CompPath & { baseIds: number[] }) =>
    addUpgrades(tipologiaId, ambienteId, componenteId, baseIds)
  );
}

export function useReplaceUpgrade() {
  return useTreeMutation(
    ({
      tipologiaId,
      ambienteId,
      componenteId,
      optionId,
      newBaseId,
    }: CompPath & { optionId: number; newBaseId: number }) =>
      replaceUpgrade(tipologiaId, ambienteId, componenteId, optionId, newBaseId)
  );
}

export function useRemoveUpgrade() {
  return useTreeMutation(({ tipologiaId, ambienteId, componenteId, optionId }: CompPath & { optionId: number }) =>
    removeUpgrade(tipologiaId, ambienteId, componenteId, optionId)
  );
}

export function useSetKitQtds() {
  return useTreeMutation(
    ({
      tipologiaId,
      ambienteId,
      componenteId,
      qtds,
    }: CompPath & { qtds: Record<number, number | null> }) =>
      setKitQtds(tipologiaId, ambienteId, componenteId, qtds)
  );
}
