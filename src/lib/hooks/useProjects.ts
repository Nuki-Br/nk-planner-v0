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

export function useProject(id: number | null) {
  return useQuery({
    queryKey: queryKeys.project(id ?? 0),
    queryFn: () => getProject(id ?? 0),
    enabled: id !== null,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: ProjectPatch }) => updateProject(id, patch),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) });
    },
  });
}

/** Marca o planejamento como concluído (status "publicado") — sem bloquear edição. */
export function usePublishProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => publishProject(id),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      void queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) });
    },
  });
}
