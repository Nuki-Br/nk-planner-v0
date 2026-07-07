"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { createFillLink, getFillLinkByToken, type FillLinkInput } from "@/lib/data/store";

import { queryKeys } from "./queryKeys";

/** Resolve o token do portal (/portal/[token]) para o link gerado. */
export function useFillLink(token: string | null) {
  return useQuery({
    queryKey: queryKeys.fillLink(token ?? ""),
    queryFn: () => getFillLinkByToken(token ?? ""),
    enabled: token !== null,
  });
}

export function useCreateFillLink() {
  return useMutation({
    mutationFn: (input: FillLinkInput) => createFillLink(input),
  });
}
