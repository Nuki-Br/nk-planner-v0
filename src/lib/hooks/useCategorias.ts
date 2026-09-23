"use client";

import React from "react";
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

/**
 * Materiais e kits guardam a categoria como NOME; o filtro do catálogo é por
 * id. "" (sem categoria no contexto) = undefined, e nome que não resolve (ou
 * categorias ainda carregando) também — filtrar por um id inexistente
 * esvaziaria a lista em vez de mostrar tudo.
 */
export function useCategoriaIdByNome(nome: string): number | undefined {
  const { data: categorias = [] } = useCategorias();
  return React.useMemo(() => {
    if (nome === "") return undefined;
    return categorias.find((c) => c.nome === nome)?.id;
  }, [nome, categorias]);
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
