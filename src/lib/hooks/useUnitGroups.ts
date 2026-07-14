"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createUnitGroup,
  deleteUnitGroup,
  listTorres,
  listUnitGroups,
  updateUnitGroup,
  type UnitGroupInput,
} from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useUnitGroups() {
  return useQuery({ queryKey: queryKeys.unitGroups, queryFn: listUnitGroups });
}

export function useTorres() {
  return useQuery({ queryKey: queryKeys.torres, queryFn: listTorres });
}

function useUnitGroupMutation<TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.unitGroups });
    },
  });
}

export function useCreateUnitGroup() {
  return useUnitGroupMutation((input: UnitGroupInput) => createUnitGroup(input));
}

export function useUpdateUnitGroup() {
  return useUnitGroupMutation(
    ({ id, patch }: { id: number; patch: Partial<UnitGroupInput> }) => updateUnitGroup(id, patch)
  );
}

export function useDeleteUnitGroup() {
  return useUnitGroupMutation((id: number) => deleteUnitGroup(id));
}
