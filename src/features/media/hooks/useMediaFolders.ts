"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFolders, fetchFolderTree, fetchStorageUsage } from "@/lib/api/media";
import { queryKeys } from "@/lib/hooks/queryKeys";

/** Filhas diretas de `parentFolderId` (raiz quando undefined). */
export function useMediaFolders(parentFolderId?: number) {
  return useQuery({
    queryKey: queryKeys.mediaFolders(parentFolderId ?? null),
    queryFn: () => fetchFolders(parentFolderId),
    refetchOnWindowFocus: false,
  });
}

/** Árvore completa a partir da raiz — usada pelo seletor "mover para". */
export function useMediaFolderTree(enabled = true) {
  return useQuery({
    queryKey: queryKeys.mediaFolderTree,
    queryFn: () => fetchFolderTree(),
    enabled,
    refetchOnWindowFocus: false,
  });
}

export function useStorageUsage() {
  return useQuery({
    queryKey: queryKeys.mediaUsage,
    queryFn: () => fetchStorageUsage(),
    refetchOnWindowFocus: false,
  });
}
