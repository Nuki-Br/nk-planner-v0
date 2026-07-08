"use client";

import React from "react";
import { HeroUIProvider } from "@heroui/system";
import { ToastProvider, addToast } from "@heroui/react";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Single shared QueryClient for the app. Server state lives in React Query;
// canvas/budget local state stays in component state/context (see docs/conventions.md).
//
// Fase 11: MutationCache.onError dá uma superfície de erro GLOBAL — qualquer
// mutação (save/publish/create/delete) que rejeite vira um toast, sem cada
// hook precisar de onError. Telas que já tratam o erro inline (ex.
// CostReviewScreen) usam mutateAsync/try-catch e não dependem disto.
function toastMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Erro inesperado. Tente novamente.";
}

// Dedup: uma ação em lote (N mutações) ou um autosave por tecla pode disparar
// várias falhas com a MESMA mensagem — não empilhamos um toast idêntico
// enquanto um ainda está visível (janela = timeout do toast, 5s).
const ERROR_TOAST_TIMEOUT = 5000;
let lastErrorToast: { msg: string; at: number } | null = null;
function shouldShowErrorToast(msg: string): boolean {
  const now = Date.now();
  if (lastErrorToast && lastErrorToast.msg === msg && now - lastErrorToast.at < ERROR_TOAST_TIMEOUT) {
    return false;
  }
  lastErrorToast = { msg, at: now };
  return true;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error) => {
            const description = toastMessage(error);
            if (!shouldShowErrorToast(description)) return;
            addToast({
              title: "Não foi possível concluir a ação",
              description,
              color: "danger",
              severity: "danger",
            });
          },
        }),
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <ToastProvider placement="top-right" toastProps={{ timeout: ERROR_TOAST_TIMEOUT }} />
        {children}
      </HeroUIProvider>
    </QueryClientProvider>
  );
}
