"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCategoria,
  deleteCategoria,
  listCategorias,
  updateCategoria,
  type CategoriaInput,
} from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

export function useCategorias() {
  return useQuery({ queryKey: queryKeys.categorias, queryFn: listCategorias });
}

export function useCreateCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoriaInput) => createCategoria(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
    },
  });
}

// Renomear/excluir muda o `categoria` materializado nos materiais e kits —
// invalidar os recursos todos (incluindo as listas paginadas do catálogo)
// mantém chips e filtros coerentes.
export function useUpdateCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<CategoriaInput> }) =>
      updateCategoria(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
      void queryClient.invalidateQueries({ queryKey: queryKeys.materiais });
      void queryClient.invalidateQueries({ queryKey: queryKeys.kits });
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogEntitiesAll });
    },
  });
}

export function useDeleteCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteCategoria(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categorias });
      void queryClient.invalidateQueries({ queryKey: queryKeys.materiais });
      void queryClient.invalidateQueries({ queryKey: queryKeys.kits });
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogEntitiesAll });
    },
  });
}
