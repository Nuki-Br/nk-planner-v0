"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  appendComment,
  getComments,
  listCommentThreads,
  type CommentInput,
} from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

/** Todas as threads (rowKey → Comment[]) — contadores por linha. */
export function useCommentThreads(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.commentThreads(projectId ?? 0),
    queryFn: () => listCommentThreads(projectId ?? 0),
    enabled: projectId !== null,
  });
}

/** Thread de comentários de uma linha (rowKey = `${compId}-${optId}`). */
export function useComments(rowKey: string | null) {
  return useQuery({
    queryKey: queryKeys.comments(rowKey ?? ""),
    queryFn: () => getComments(rowKey ?? ""),
    enabled: rowKey !== null,
  });
}

export function useAppendComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rowKey, input }: { rowKey: string; input: CommentInput }) =>
      appendComment(rowKey, input),
    onSuccess: () => {
      // A RAIZ ["comments"] cobre a thread específica e o mapa de contadores.
      void queryClient.invalidateQueries({ queryKey: queryKeys.commentsRoot });
    },
  });
}
