"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { useSelection } from "@/lib/store/selection";

import { useActiveProjectId } from "./useActiveProject";
import { useProjects } from "./useProjects";

/**
 * Como useActiveProjectId, mas manda para o dashboard quando não há
 * empreendimento escolhido — para as telas de NÍVEL DE ROTA, que não têm o que
 * mostrar sem um. Componentes aninhados (Header, modais, drawers) devem usar o
 * useActiveProjectId puro: dois componentes competindo para redirecionar viram
 * loop.
 *
 * Espera hasHydrated (senão o primeiro render, antes do localStorage, sempre
 * redirecionaria) e usa isSuccess em vez de !isLoading, para não redirecionar
 * durante um erro de rede — aí quem manda é o estado de erro da própria tela.
 */
export function useRequireActiveProject(): number | null {
  const router = useRouter();
  const projectId = useActiveProjectId();
  const hasHydrated = useSelection((s) => s.hasHydrated);
  const { isSuccess } = useProjects();

  React.useEffect(() => {
    if (hasHydrated && isSuccess && projectId === null) router.replace("/dashboard");
  }, [hasHydrated, isSuccess, projectId, router]);

  return projectId;
}
