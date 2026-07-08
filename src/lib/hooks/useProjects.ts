"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getProject,
  listProjects,
  publishProject,
  updateProject,
  type ProjectPatch,
} from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: listProjects });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: queryKeys.project(id ?? ""),
    queryFn: () => getProject(id ?? ""),
    enabled: id !== null,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProjectPatch }) => updateProject(id, patch),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) });
    },
  });
}

/** Publica o orçamento (Fase 9) — o store passa a ser somente leitura. */
export function usePublishProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishProject(id),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) });
    },
  });
}
