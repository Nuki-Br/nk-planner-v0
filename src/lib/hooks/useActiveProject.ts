"use client";

import { useSelection } from "@/lib/store/selection";

import { useProjects } from "./useProjects";

/**
 * Projeto âncora ativo da org (MVP single-project): a seleção explícita
 * (dashboard → "Abrir") ou, na falta dela, o primeiro projeto da org. Retorna
 * null enquanto a lista carrega ou se a org ainda não tem projeto. Substitui o
 * antigo ACTIVE_PROJECT_ID fixo — cada org resolve o seu.
 */
export function useActiveProjectId(): number | null {
  const selected = useSelection((s) => s.activeProjectId);
  const { data: projects = [] } = useProjects();
  return selected ?? projects[0]?.id ?? null;
}
