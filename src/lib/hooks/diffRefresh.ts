"use client";

import type { QueryClient } from "@tanstack/react-query";

import { mutationKeys, queryKeys } from "./queryKeys";

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
/**
 * Empreendimentos cuja árvore de tipologias também precisa reconciliar (a qtd
 * de sub-item de kit vive nela). Separado porque é a query mais pesada da tela:
 * edições só de preço/custo não a recarregam.
 */
const treeDirty = new Set<number>();

/** Chaves de cache reconciliadas quando o usuário para de editar. */
function reconcileKeys(projectId: number) {
  return [
    queryKeys.pricing(projectId),
    queryKeys.custosBase(projectId),
    queryKeys.costItems(projectId),
    queryKeys.pricingDiff(projectId),
  ];
}

/**
 * Reagenda a reconciliação do empreendimento para `delay`ms à frente. Chamado no
 * `onSettled` de cada gravação; cada nova edição empurra o timer, então o
 * refetch só dispara quando a edição cessa.
 */
export function scheduleReconcile(
  qc: QueryClient,
  projectId: number,
  delay = 700,
  { tipologias = false }: { tipologias?: boolean } = {}
): void {
  if (tipologias) treeDirty.add(projectId);
  const existing = timers.get(projectId);
  if (existing) clearTimeout(existing);
  timers.set(
    projectId,
    setTimeout(() => {
      timers.delete(projectId);
      // Ainda há gravação em voo? Um refetch agora leria o servidor SEM a última
      // edição e sobrescreveria o cache otimista — a célula "voltaria" e só
      // reapareceria no próximo ciclo. Não precisa reagendar: o onSettled da
      // gravação em voo chama scheduleReconcile de novo quando ela assentar.
      const busy =
        qc.isMutating({ mutationKey: mutationKeys.savePricing(projectId) }) +
        qc.isMutating({ mutationKey: mutationKeys.saveCusto(projectId) }) +
        qc.isMutating({ mutationKey: mutationKeys.saveCostItem(projectId) }) +
        qc.isMutating({ mutationKey: mutationKeys.composicao(projectId) }) +
        qc.isMutating({ mutationKey: mutationKeys.kitQtds(projectId) });
      if (busy > 0) return;
      for (const key of reconcileKeys(projectId)) {
        void qc.invalidateQueries({ queryKey: key });
      }
      if (treeDirty.delete(projectId)) {
        // Raiz: lista (Construtor de Preço, canvas) e detalhe (config do componente).
        void qc.invalidateQueries({ queryKey: queryKeys.tipologiasRoot });
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
