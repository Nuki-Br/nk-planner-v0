"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createMateriais,
  createMaterial,
  listMateriais,
  updateMaterial,
  type MaterialInput,
} from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useMateriais() {
  return useQuery({ queryKey: queryKeys.materiais, queryFn: listMateriais });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MaterialInput) => createMaterial(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.materiais });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<MaterialInput> }) =>
      updateMaterial(id, patch),
    onSuccess: () => {
      // custoMat > 0 tira a pendência (derivada do custo) — refletir na UI.
      void queryClient.invalidateQueries({ queryKey: queryKeys.materiais });
    },
  });
}

/** Importação em lote (wizard CSV). */
export function useImportMateriais() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputs: MaterialInput[]) => createMateriais(inputs),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.materiais });
    },
  });
}
