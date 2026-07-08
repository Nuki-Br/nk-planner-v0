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

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error) => {
            addToast({
              title: "Não foi possível concluir a ação",
              description: toastMessage(error),
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
        <ToastProvider placement="top-right" toastProps={{ timeout: 5000 }} />
        {children}
      </HeroUIProvider>
    </QueryClientProvider>
  );
}
