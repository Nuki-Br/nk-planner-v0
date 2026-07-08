"use client";

import React from "react";

import { Button } from "@/components/ui";

// Fronteira de erro global (Fase 11): captura throws de render/loader fora do
// shell (ex. /login, /portal). As telas do planner têm a sua própria em
// (planner)/error.tsx, que preserva sidebar/header.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background-standard px-6 text-center">
      <div>
        <h1 className="text-lg font-bold text-neutral-gray-11">Algo deu errado</h1>
        <p className="mt-1 max-w-md text-[13px] text-neutral-gray-7">
          Não foi possível carregar esta tela. Tente novamente ou volte ao início.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="bordered" onPress={reset}>
          Tentar novamente
        </Button>
        <Button variant="teal" onPress={() => (window.location.href = "/dashboard")}>
          Ir para o início
        </Button>
      </div>
    </div>
  );
}
