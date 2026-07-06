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
    ({ id, patch }: { id: string; patch: Partial<TipologiaInput & Pick<Tipologia, "status">> }) =>
      updateTipologia(id, patch)
  );
}

export function useDeleteTipologia() {
  return useTreeMutation((id: string) => deleteTipologia(id));
}

export function useDuplicateTipologia() {
  return useTreeMutation((id: string) => duplicateTipologia(id));
}

// ─── Ambientes ────────────────────────────────────────────────────────

export function useCreateAmbiente() {
  return useTreeMutation(
    ({ tipologiaId, input }: { tipologiaId: string; input: AmbienteInput }) =>
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
      tipologiaId: string;
      ambienteId: string;
      patch: Partial<AmbienteInput>;
    }) => updateAmbiente(tipologiaId, ambienteId, patch)
  );
}

export function useDeleteAmbiente() {
  return useTreeMutation(
    ({ tipologiaId, ambienteId }: { tipologiaId: string; ambienteId: string }) =>
      deleteAmbiente(tipologiaId, ambienteId),
    [queryKeys.sharedAmbientes]
  );
}

export function useCloneAmbiente() {
  return useTreeMutation(
    ({ tipologiaId, ambienteId }: { tipologiaId: string; ambienteId: string }) =>
      cloneAmbiente(tipologiaId, ambienteId)
  );
}

export function useReorderAmbientes() {
  return useTreeMutation(
    ({ tipologiaId, orderedIds }: { tipologiaId: string; orderedIds: string[] }) =>
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
      srcTipologiaId,
      srcAmbienteId,
    }: {
      targetTipologiaId: string;
      srcTipologiaId: string;
      srcAmbienteId: string;
    }) => linkAmbiente(targetTipologiaId, srcTipologiaId, srcAmbienteId),
    [queryKeys.sharedAmbientes]
  );
}

// ─── Componentes ──────────────────────────────────────────────────────

interface CompPath {
  tipologiaId: string;
  ambienteId: string;
  componenteId: string;
}

export function useCreateComponente() {
  return useTreeMutation(
    ({
      tipologiaId,
      ambienteId,
      input,
    }: {
      tipologiaId: string;
      ambienteId: string;
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
      tipologiaId: string;
      ambienteId: string;
      orderedIds: string[];
    }) => reorderComponentes(tipologiaId, ambienteId, orderedIds)
  );
}

export function useSetPadrao() {
  return useTreeMutation(({ tipologiaId, ambienteId, componenteId, padraoId }: CompPath & { padraoId: string | null }) =>
    setPadrao(tipologiaId, ambienteId, componenteId, padraoId)
  );
}

export function useAddUpgrade() {
  return useTreeMutation(({ tipologiaId, ambienteId, componenteId, upgradeId }: CompPath & { upgradeId: string }) =>
    addUpgrade(tipologiaId, ambienteId, componenteId, upgradeId)
  );
}

export function useRemoveUpgrade() {
  return useTreeMutation(({ tipologiaId, ambienteId, componenteId, upgradeId }: CompPath & { upgradeId: string }) =>
    removeUpgrade(tipologiaId, ambienteId, componenteId, upgradeId)
  );
}

export function useSetKitQtds() {
  return useTreeMutation(
    ({
      tipologiaId,
      ambienteId,
      componenteId,
      kitId,
      qtds,
    }: CompPath & { kitId: string; qtds: Record<string, number> }) =>
      setKitQtds(tipologiaId, ambienteId, componenteId, kitId, qtds)
  );
}
