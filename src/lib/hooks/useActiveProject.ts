"use client";

import { useSelection } from "@/lib/store/selection";

import { useProjects } from "./useProjects";

/**
 * Empreendimento ativo: a seleção persistida (dashboard → "Abrir"), VALIDADA
 * contra a lista da org. null enquanto rehidrata/carrega, se ninguém escolheu,
 * ou se o id guardado não existe mais (projeto apagado, troca de conta na mesma
 * máquina) — nesse caso vira null em vez de gerar 404 em cascata.
 *
 * Sem fallback para projects[0]: com N empreendimentos, "o primeiro" é o mais
 * antigo por CreatedAt, isto é, arbitrário. Cair editando um empreendimento que
 * o usuário não escolheu é pior que não ter nenhum — e o Construtor de Preço
 * grava por diff. "Ninguém escolheu" é um estado legítimo; quem trata é o
 * useRequireActiveProject, mandando para o dashboard escolher.
 */
export function useActiveProjectId(): number | null {
  const selected = useSelection((s) => s.activeProjectId);
  const hasHydrated = useSelection((s) => s.hasHydrated);
  const { data: projects } = useProjects();
  if (!hasHydrated || selected === null || projects === undefined) return null;
  return projects.some((p) => p.id === selected) ? selected : null;
}
