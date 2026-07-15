"use client";

import { addToast } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createFolder,
  deleteFolder,
  deleteMediaFile,
  updateFolder,
  updateMediaFile,
} from "@/lib/api/media";
import { queryKeys } from "@/lib/hooks/queryKeys";
import type {
  CreateFolderBody,
  UpdateFileBody,
  UpdateFolderBody,
} from "@/shared/types/media";

// Sem onError aqui, de propósito: o MutationCache global (app/providers.tsx)
// já toasta QUALQUER mutação que rejeite, com dedup de 5s. Portar os onError do
// admin (que existiam porque lá não há essa rede) duplicaria todo toast de erro.
function toastSuccess(title: string): void {
  addToast({ title, color: "success", severity: "success" });
}

export function useMediaMutations() {
  const queryClient = useQueryClient();

  const invalidateFolders = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mediaFoldersAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.mediaFolderTree });
  };
  const invalidateFiles = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.mediaFilesAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.mediaRecentAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.mediaUsage });
  };

  const createFolderMutation = useMutation({
    mutationFn: (body: CreateFolderBody) => createFolder(body),
    onSuccess: () => {
      invalidateFolders();
      toastSuccess("Pasta criada com sucesso!");
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateFolderBody }) =>
      updateFolder(id, body),
    onSuccess: () => {
      invalidateFolders();
      invalidateFiles();
      toastSuccess("Pasta atualizada com sucesso!");
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: number) => deleteFolder(id),
    onSuccess: () => {
      invalidateFolders();
      invalidateFiles();
      toastSuccess("Pasta excluída. Os arquivos foram movidos para o nível acima.");
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateFileBody }) =>
      updateMediaFile(id, body),
    onSuccess: () => {
      invalidateFiles();
      toastSuccess("Arquivo atualizado com sucesso!");
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: number) => deleteMediaFile(id),
    onSuccess: () => {
      invalidateFiles();
      toastSuccess("Arquivo excluído com sucesso!");
    },
  });

  return {
    createFolderMutation,
    updateFolderMutation,
    deleteFolderMutation,
    updateFileMutation,
    deleteFileMutation,
  };
}
