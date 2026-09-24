"use client";

import type { Mutation, QueryClient } from "@tanstack/react-query";

import { mutationKeys } from "./queryKeys";

// Gravações do Construtor de Preço — serialização por célula + gate de
// publicação.
//
// As gravações de preço/custo são OTIMISTAS e disparam o PATCH na hora. Duas
// edições rápidas da MESMA célula geram dois PATCH concorrentes; se o mais novo
// chega ao banco antes do mais velho, o banco fica com o valor velho e a
// reconciliação depois sobrescreve o cache correto — a edição do usuário some.
//
// `useMutation({ scope: { id } })` do React Query é estático por hook (não dá
// para chavear pelo `optionId` de cada `.mutate()`), então a serialização por
// célula vive aqui: uma cadeia de promessas por chave. Edições de células
// DIFERENTES seguem em paralelo; só as da mesma chave esperam a anterior.

/** Fim da cadeia por chave (`pricing:<pid>:<optionId>` etc.) — nunca rejeita. */
const tails = new Map<string, Promise<void>>();

/**
 * Enfileira `run` atrás da última gravação da MESMA `key`, garantindo ordem de
 * submissão. Um erro numa gravação não trava a fila (a próxima segue), mas a
 * promessa devolvida rejeita normalmente para o `onError` do React Query rodar.
 */
export function enqueueWrite<T>(key: string, run: () => Promise<T>): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  const p = prev.then(run);
  // A cadeia guarda só o "terminou", sem o resultado nem o erro: senão uma
  // falha travaria a célula para sempre.
  const done = () => {
    if (tails.get(key) === tail) tails.delete(key);
  };
  const tail = p.then(done, done);
  tails.set(key, tail);
  return p;
}

// ─── Gate de publicação ────────────────────────────────────────────────
// O publish lê o rascunho DO BANCO, então precisa esperar as gravações em voo.
// A fonte da verdade é o MutationCache do React Query (a mesma que o
// `isMutating` da reconciliação consulta): uma mutação conta como "pending"
// desde o `mutate()` — inclusive durante o onMutate e pausada offline —, e não
// só depois que o PATCH saiu.

export type SaveGateResult =
  /** Nada em voo, ou tudo o que estava em voo gravou. */
  | "ok"
  /** Alguma gravação esperada falhou — o rascunho no banco não é o da tela. */
  | "failed"
  /** Alguma gravação não terminou no prazo (rede travada). */
  | "timeout";

/** Prazo do gate — o fetch não tem timeout próprio, então um PATCH travado prenderia o botão. */
export const SAVE_GATE_TIMEOUT_MS = 15_000;

/**
 * Resolve quando não há mais gravações de preço/custo em voo no empreendimento,
 * dizendo se alguma das esperadas falhou. Acompanha também as que começarem
 * durante a espera.
 */
export function waitForSaves(
  qc: QueryClient,
  projectId: number,
  timeoutMs = SAVE_GATE_TIMEOUT_MS
): Promise<SaveGateResult> {
  const cache = qc.getMutationCache();
  // Preço de insumo e composição movem o preço final tanto quanto o custo base.
  const keys = [
    mutationKeys.savePricing(projectId),
    mutationKeys.saveCusto(projectId),
    mutationKeys.saveCostItem(projectId),
    mutationKeys.composicao(projectId),
  ];
  const watched = new Set<Mutation>();

  return new Promise((resolve) => {
    let finished = false;
    const finish = (result: SaveGateResult) => {
      if (finished) return;
      finished = true;
      unsubscribe();
      clearTimeout(timer);
      resolve(result);
    };
    const check = () => {
      for (const mutationKey of keys) {
        for (const m of cache.findAll({ mutationKey, status: "pending" })) watched.add(m);
      }
      const statuses = [...watched].map((m) => m.state.status);
      if (statuses.includes("pending")) return;
      finish(statuses.includes("error") ? "failed" : "ok");
    };
    const unsubscribe = cache.subscribe(check);
    const timer = setTimeout(() => finish("timeout"), timeoutMs);
    check();
  });
}
