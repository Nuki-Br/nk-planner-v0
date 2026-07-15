"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchMediaFiles, fetchRecentMediaFiles } from "@/lib/api/media";
import { queryKeys } from "@/lib/hooks/queryKeys";
import type { MediaFileType } from "@/shared/types/media";

const PAGE_SIZE = 60;

export const MEDIA_FILES_PAGE_SIZE = PAGE_SIZE;

/**
 * Listagem paginada. `fileType` vai para a API (where do Prisma) — no admin ele
 * é aplicado no cliente depois da paginação, o que faz a contagem de páginas
 * discordar dos resultados sempre que há filtro ativo.
 */
export function useMediaFiles({
  folderId,
  page,
  search,
  fileType,
  enabled = true,
}: {
  folderId?: number;
  page: number;
  search?: string;
  fileType?: MediaFileType;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.mediaFiles(folderId ?? null, page, search ?? "", fileType ?? "all"),
    queryFn: () =>
      fetchMediaFiles({
        folderId,
        page,
        limit: PAGE_SIZE,
        search: search?.trim() || undefined,
        fileType,
      }),
    enabled,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}

export function useRecentMediaFiles(enabled = true, fileType?: MediaFileType) {
  return useQuery({
    queryKey: queryKeys.mediaRecent(fileType ?? "all"),
    queryFn: () => fetchRecentMediaFiles(fileType),
    enabled,
    refetchOnWindowFocus: false,
  });
}
