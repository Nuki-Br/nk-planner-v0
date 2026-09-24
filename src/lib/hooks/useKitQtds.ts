"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setKitQtds } from "@/lib/data/store";
import type { Tipologia } from "@/shared/types/domain";

import { scheduleReconcile } from "./diffRefresh";
import { mutationKeys, queryKeys } from "./queryKeys";
import { enqueueWrite } from "./writeQueue";

export interface KitQtdInput {
  tipologiaId: number;
  /** BlueprintRoom id — a aparição do ambiente NESTA planta. */
  ambienteId: number;
  componenteId: number;
  /** MaterialKitItem id. */
  kitItemId: number;
  /** Quantidade líquida; null = apaga (volta a herdar ou fica pendente). */
  qtd: number | null;
}

/**
 * Aplica a quantidade no componente DESTA planta dentro da lista em cache. O
 * mesmo componente aparece em outras tipologias (ambiente compartilhado), mas
 * a qtd de sub-item é por planta — só a tipologia editada muda.
 */
function applyKitQtd(prev: Tipologia[] | undefined, input: KitQtdInput): Tipologia[] | undefined {
  if (!prev) return prev;
  return prev.map((tip) =>
    tip.id !== input.tipologiaId
      ? tip
      : {
          ...tip,
          ambientes: tip.ambientes.map((amb) =>
            amb.blueprintRoomId !== input.ambienteId
              ? amb
              : {
                  ...amb,
                  componentes: amb.componentes.map((c) => {
                    if (c.id !== input.componenteId) return c;
                    const kitQtds = { ...c.kitQtds };
                    if (input.qtd === null) delete kitQtds[input.kitItemId];
                    else kitQtds[input.kitItemId] = input.qtd;
                    return { ...c, kitQtds };
                  }),
                }
          ),
        }
  );
}

/**
 * Grava a quantidade de UM sub-item de kit nesta planta, direto da tabela do
 * Construtor de Preço. Otimista como as demais células da tabela (a planilha
 * não pode parecer travada); a fila por sub-item garante a ordem, e a key de
 * mutação põe a gravação no gate de publicar. A árvore é reconciliada no
 * debounce compartilhado, quando o usuário para de editar.
 */
export function useSaveKitQtd(projectId: number | null) {
  const queryClient = useQueryClient();
  const pid = projectId ?? 0;
  const key = queryKeys.tipologias(pid);
  return useMutation({
    mutationKey: mutationKeys.kitQtds(pid),
    mutationFn: (input: KitQtdInput) =>
      enqueueWrite(`kitqtd:${pid}:${input.ambienteId}:${input.kitItemId}`, () =>
        setKitQtds(input.tipologiaId, input.ambienteId, input.componenteId, {
          [input.kitItemId]: input.qtd,
        })
      ),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<Tipologia[]>(key, (prev) => applyKitQtd(prev, input));
    },
    // Sem rollback cirúrgico: a reconciliação recarrega a árvore do servidor e
    // o toast global do MutationCache avisa a falha.
    onSettled: () => scheduleReconcile(queryClient, pid, 700, { tipologias: true }),
  });
}
