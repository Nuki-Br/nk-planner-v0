"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  createUnitGroup,
  deleteUnitGroup,
  listTorres,
  listUnitGroups,
  updateTorres,
  updateUnitGroup,
  type TorreInput,
  type UnitGroupInput,
} from "@/lib/data/store";
import type { UnitGroup } from "@/shared/types/domain";

import { queryKeys } from "./queryKeys";

export function useUnitGroups(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.unitGroups(projectId ?? 0),
    queryFn: () => listUnitGroups(projectId ?? 0),
    enabled: projectId !== null,
  });
}

export function useTorres(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.torres(projectId ?? 0),
    queryFn: () => listTorres(projectId ?? 0),
    enabled: projectId !== null,
  });
}

/** Salva a lista completa de torres de um empreendimento. */
export function useUpdateTorres() {
  const queryClient = useQueryClient();
  return useMutation({
    // projectId vem nos args (e não no hook) porque a invalidação precisa dele.
    mutationFn: ({ projectId, items }: { projectId: number; items: TorreInput[] }) =>
      updateTorres(projectId, items),
    onSuccess: (_torres, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.torres(projectId) });
      // Rename/exclusão muda o `torre` dos grupos e o TowerLabel do projeto.
      void queryClient.invalidateQueries({ queryKey: queryKeys.unitGroups(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}

/**
 * Invalida a RAIZ de unit-groups: as mutações por id (update/delete) não sabem
 * de qual empreendimento é o grupo, e descobrir custaria um fetch a mais. As
 * tipologias também: as "unidades" de cada planta derivam dos grupos
 * vinculados (vínculo e números das unidades).
 */
function useUnitGroupMutation<TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.unitGroupsRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tipologiasRoot });
    },
  });
}

export function useCreateUnitGroup(projectId: number) {
  return useUnitGroupMutation((input: UnitGroupInput) => createUnitGroup(projectId, input));
}

/** Aplica `fn` a cada grupo de todas as listas de grupos em cache. */
export function patchCachedUnitGroups(queryClient: QueryClient, fn: (g: UnitGroup) => UnitGroup) {
  queryClient.setQueriesData<UnitGroup[]>({ queryKey: queryKeys.unitGroupsRoot }, (prev) =>
    prev?.map(fn)
  );
}

/**
 * Vincular/desvincular (`tipologiaId`) é otimista: o chip e o contador de
 * unidades mudam na hora — o banco remoto leva segundos, e a demora parecia
 * "não salvou". Erro volta o cache. Nome/torre/unidades seguem o fluxo normal.
 */
export function useUpdateUnitGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<UnitGroupInput> }) =>
      updateUnitGroup(id, patch),
    onMutate: async ({ id, patch }) => {
      const tipologiaId = patch.tipologiaId;
      if (tipologiaId === undefined) return { snapshot: [] as [QueryKey, UnitGroup[] | undefined][] };
      await queryClient.cancelQueries({ queryKey: queryKeys.unitGroupsRoot });
      const snapshot = queryClient.getQueriesData<UnitGroup[]>({ queryKey: queryKeys.unitGroupsRoot });
      patchCachedUnitGroups(queryClient, (g) => (g.id === id ? { ...g, tipologiaId } : g));
      return { snapshot };
    },
    onError: (_e, _v, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.unitGroupsRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tipologiasRoot });
    },
  });
}

export function useDeleteUnitGroup() {
  return useUnitGroupMutation((id: number) => deleteUnitGroup(id));
}
