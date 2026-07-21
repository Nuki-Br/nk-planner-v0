"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
 * de qual empreendimento é o grupo, e descobrir custaria um fetch a mais.
 */
function useUnitGroupMutation<TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.unitGroupsRoot });
    },
  });
}

export function useCreateUnitGroup(projectId: number) {
  return useUnitGroupMutation((input: UnitGroupInput) => createUnitGroup(projectId, input));
}

export function useUpdateUnitGroup() {
  return useUnitGroupMutation(
    ({ id, patch }: { id: number; patch: Partial<UnitGroupInput> }) => updateUnitGroup(id, patch)
  );
}

export function useDeleteUnitGroup() {
  return useUnitGroupMutation((id: number) => deleteUnitGroup(id));
}
