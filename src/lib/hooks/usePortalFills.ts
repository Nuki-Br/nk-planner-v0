"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { httpGet, httpSend } from "@/lib/api/http";
import type { PortalData } from "@/shared/types/api";
import type { PortalFill } from "@/shared/types/domain";

import { queryKeys } from "./queryKeys";

// Hooks do portal do terceiro (rota PÚBLICA /api/portal/[token]) — o escopo
// (tipologias, campos, senha) é resolvido no servidor a partir do token.

/**
 * Payload do portal. `senha` acompanha o GET quando o link é protegido;
 * senha errada rejeita com "Senha incorreta." (o gate trata o erro).
 */
export function usePortalData(token: string, senha: string | null) {
  return useQuery({
    queryKey: queryKeys.portal(token, senha),
    queryFn: () =>
      httpGet<PortalData | null>(
        senha === null
          ? `/api/portal/${token}`
          : `/api/portal/${token}?senha=${encodeURIComponent(senha)}`
      ),
    retry: false,
  });
}

/** Envio do preenchimento: aplica custos ao catálogo e limpa pendências. */
export function useSubmitPortalFills(token: string, senha: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fills: Record<string, PortalFill>) =>
      httpSend<number, { fills: Record<string, PortalFill>; senha?: string }>(
        `/api/portal/${token}/fills`,
        "POST",
        senha === null ? { fills } : { fills, senha }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal", token] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.materiais });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}
