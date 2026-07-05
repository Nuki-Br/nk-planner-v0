"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createMaterial, listMateriais, type MaterialInput } from "@/lib/data/store";

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
