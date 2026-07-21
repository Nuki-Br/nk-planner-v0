"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createProject,
  getProject,
  listProjects,
  publishProject,
  updateProject,
  type ProjectInput,
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

/** Cria o empreendimento com as torres numa transação só (ver createProject). */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => createProject(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
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
