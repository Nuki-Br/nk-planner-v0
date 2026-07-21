"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createVersion, listVersions, restoreVersion, type VersionInput } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useVersions(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.versions(projectId ?? 0),
    queryFn: () => listVersions(projectId ?? 0),
    enabled: projectId !== null,
  });
}

export function useCreateVersion(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VersionInput) => createVersion(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.versions(projectId) });
    },
  });
}

export function useRestoreVersion(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreVersion(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.versions(projectId) });
    },
  });
}
