"use client";

import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui";
import { SEED_ACTIVE_PROJECT_ID } from "@/lib/data/seed";
import { useProject } from "@/lib/hooks/useProjects";
import { useSelection } from "@/lib/store/selection";
import { DASHBOARD_MODE_ROUTES } from "@/shared/constants/navigation";

// Faixa de somente-leitura (Fase 9): aparece nas telas de projeto quando o
// empreendimento ativo foi publicado — o store rejeita qualquer mutação.
export function ReadOnlyBanner() {
  const pathname = usePathname();
  const activeProjectId = useSelection((s) => s.activeProjectId);
  const { data: project } = useProject(activeProjectId ?? SEED_ACTIVE_PROJECT_ID);

  const isDashboardMode = DASHBOARD_MODE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (isDashboardMode || project?.status !== "publicado") return null;

  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-functional-warning/40 bg-functional-warning-light px-4 py-2.5">
      <Icon name="lock" size={15} className="shrink-0 text-functional-warning" />
      <p className="text-[13px] text-tint-orange-fg">
        <strong>Empreendimento publicado</strong> — somente leitura. Para fazer alterações, será
        necessário criar uma nova revisão.
      </p>
    </div>
  );
}
