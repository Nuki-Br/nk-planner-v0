"use client";

import type { QueryClient } from "@tanstack/react-query";

import { queryKeys } from "./queryKeys";

// Reconciliação em background das telas de edição do Construtor de Preço.
//
// As gravações de custo base e de precificação são OTIMISTAS: o cache é
// corrigido no `onMutate` e a tela reflete a edição na hora. O servidor
// confirma em background. Um refetch por tecla, além de desnecessário, causava
// corrida entre edições rápidas — a sensação de planilha travada que o usuário
// pediu para tirar.
//
// Em vez disso, agenda-se UM refetch ~700ms depois que o usuário PARA de editar.
// Ele serve para dois fins:
//   - reconciliar divergências reais/centavos (ex.: "12,345" → 12,34 no banco);
//   - atualizar o badge/diff de publicação (recalculado no servidor).
// O timer é module-level e chaveado por empreendimento, então edições rápidas
// nas DUAS abas (Preço final e Custos base) coalescem num refetch só.

const timers = new Map<number, ReturnType<typeof setTimeout>>();

/** Chaves de cache reconciliadas quando o usuário para de editar. */
function reconcileKeys(projectId: number) {
  return [
    queryKeys.pricing(projectId),
    queryKeys.custosBase(projectId),
    queryKeys.pricingDiff(projectId),
  ];
}

/**
 * Reagenda a reconciliação do empreendimento para `delay`ms à frente. Chamado no
 * `onSettled` de cada gravação; cada nova edição empurra o timer, então o
 * refetch só dispara quando a edição cessa.
 */
export function scheduleReconcile(qc: QueryClient, projectId: number, delay = 700): void {
  const existing = timers.get(projectId);
  if (existing) clearTimeout(existing);
  timers.set(
    projectId,
    setTimeout(() => {
      timers.delete(projectId);
      for (const key of reconcileKeys(projectId)) {
        void qc.invalidateQueries({ queryKey: key });
      }
    }, delay)
  );
}

/**
 * Força o refetch do diff AGORA — usado ao abrir o modal de publicar, para o
 * preview não ficar até `delay`ms atrás do que será publicado. Não mexe no timer
 * pendente (a reconciliação completa segue agendada).
 */
export function flushDiff(qc: QueryClient, projectId: number): void {
  void qc.invalidateQueries({ queryKey: queryKeys.pricingDiff(projectId) });
}
