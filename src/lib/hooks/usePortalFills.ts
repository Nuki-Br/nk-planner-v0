"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPortalFills, submitPortalFills } from "@/lib/data/store";
import type { PortalFill } from "@/shared/types/domain";

import { queryKeys } from "./queryKeys";

/** Fills já enviados pelo terceiro (matId → {mat, mo, comment}). */
export function usePortalFills() {
  return useQuery({ queryKey: queryKeys.portalFills, queryFn: getPortalFills });
}

/** Envio do preenchimento: aplica custos ao catálogo e limpa pendências. */
export function useSubmitPortalFills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fills: Record<string, PortalFill>) => submitPortalFills(fills),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.portalFills });
      void queryClient.invalidateQueries({ queryKey: queryKeys.materiais });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pendingItems });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}
