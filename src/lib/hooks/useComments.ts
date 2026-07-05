"use client";

import { useQuery } from "@tanstack/react-query";

import { getComments } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

/** Thread de comentários de uma linha (rowKey = `${compId}-${optId}`). */
export function useComments(rowKey: string | null) {
  return useQuery({
    queryKey: queryKeys.comments(rowKey ?? ""),
    queryFn: () => getComments(rowKey ?? ""),
    enabled: rowKey !== null,
  });
}
