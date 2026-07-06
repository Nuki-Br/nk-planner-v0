"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createKit, listKits, updateKit, type KitInput } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useKits() {
  return useQuery({ queryKey: queryKeys.kits, queryFn: listKits });
}

export function useCreateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: KitInput) => createKit(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.kits });
    },
  });
}

export function useUpdateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<KitInput> }) =>
      updateKit(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.kits });
    },
  });
}
