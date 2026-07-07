"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createVersion, listVersions, restoreVersion, type VersionInput } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useVersions() {
  return useQuery({ queryKey: queryKeys.versions, queryFn: listVersions });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VersionInput) => createVersion(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.versions });
    },
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreVersion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.versions });
    },
  });
}
