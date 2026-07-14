"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addUpgrade,
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
  updateTipologia,
  type AmbienteInput,
  type ComponenteInput,
  type TipologiaInput,
} from "@/lib/data/store";
import type { Tipologia } from "@/shared/types/domain";

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
      void queryClient.invalidateQueries({ queryKey: queryKeys.tipologias });
      for (const key of extraKeys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

// ─── Tipologias ───────────────────────────────────────────────────────

export function useCreateTipologia() {
  return useTreeMutation((input: TipologiaInput) => createTipologia(input));
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
    [queryKeys.sharedAmbientes]
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

export function useSharedInfo() {
  return useQuery({ queryKey: queryKeys.sharedAmbientes, queryFn: getSharedInfo });
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
    [queryKeys.sharedAmbientes]
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
    }: CompPath & { qtds: Record<number, number> }) =>
      setKitQtds(tipologiaId, ambienteId, componenteId, qtds)
  );
}
