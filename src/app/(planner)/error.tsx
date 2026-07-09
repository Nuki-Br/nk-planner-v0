"use client";

import { Button, EmptyState } from "@/components/ui";

// Fronteira de erro das telas do planner (Fase 11): renderiza DENTRO do shell
// (o layout com sidebar/header fica acima do segmento), então o usuário não
// perde a navegação quando uma tela falha ao carregar.
export default function PlannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon="warning"
      title="Não foi possível carregar esta tela"
      subtitle={error.message || "Tente novamente em instantes."}
      action={
        <Button variant="bordered" onPress={reset}>
          Tentar novamente
        </Button>
      }
    />
  );
}
