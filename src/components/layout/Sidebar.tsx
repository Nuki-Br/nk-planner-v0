"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, StatusBadge, type IconName } from "@/components/ui";
import { ACTIVE_PROJECT_ID } from "@/shared/constants/project";
import { useProject } from "@/lib/hooks/useProjects";
import { useSelection } from "@/lib/store/selection";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_ITEM,
  DASHBOARD_MODE_ROUTES,
  WORKFLOW_NAV,
} from "@/shared/constants/navigation";

const SIDEBAR_WIDTH = 212;

interface NavItemProps {
  href: string;
  icon: IconName;
  label: string;
  active: boolean;
  done?: boolean;
}

function NavItem({ href, icon, label, active, done = false }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
        active
          ? "bg-primary-1 font-bold text-primary-7"
          : "text-neutral-gray-9 hover:bg-primary-1 hover:text-primary-7",
        !active && done && "text-neutral-gray-8"
      )}
    >
      <Icon
        name={done ? "check" : icon}
        size={15}
        className={cn(active || done ? "text-primary-7" : "text-neutral-gray-7", done && "opacity-60")}
      />
      {label}
    </Link>
  );
}

// Sidebar com os dois modos do protótipo:
//  - dashboard/config-base: apenas "Empreendimentos"
//  - projeto ativo: bloco do projeto (nome + status) + passos do fluxo,
//    com passos anteriores marcados como concluídos (check teal).
export function Sidebar() {
  const pathname = usePathname();
  const { activeProjectId, setActiveProject, clearSelection } = useSelection();

  const isDashboardMode = DASHBOARD_MODE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Espelha o navigate() do protótipo: entrar no fluxo sem projeto ativa o
  // p001 (THE_PROJECT); voltar ao dashboard limpa a seleção. Reage APENAS à
  // mudança de rota (ler o id via getState evita apagar uma seleção feita
  // no próprio dashboard, ex.: "Abrir" antes de navegar).
  React.useEffect(() => {
    if (pathname === "/dashboard") {
      clearSelection();
    } else if (!isDashboardMode && useSelection.getState().activeProjectId === null) {
      setActiveProject(ACTIVE_PROJECT_ID);
    }
  }, [pathname, isDashboardMode, setActiveProject, clearSelection]);

  const { data: project } = useProject(activeProjectId);
  const inProject = !isDashboardMode && !!project;

  const activeIndex = WORKFLOW_NAV.findIndex(
    (step) => pathname === step.href || pathname.startsWith(`${step.href}/`)
  );

  return (
    <aside
      style={{ width: SIDEBAR_WIDTH }}
      className="fixed left-0 top-0 z-20 flex h-screen flex-col overflow-y-auto border-r border-neutral-gray-3 bg-white"
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-neutral-gray-3 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-4 font-bold text-white">
          N
        </div>
        <span className="text-sm-p-bold text-neutral-gray-10">Nuki</span>
        <span className="border-l border-neutral-gray-4 pl-2 text-[10px] font-semibold text-neutral-gray-6">
          Planejamento
        </span>
      </div>

      <nav className="flex-1 px-3 py-3">
        <NavItem
          href={DASHBOARD_ITEM.href}
          icon={DASHBOARD_ITEM.icon}
          label={DASHBOARD_ITEM.label}
          active={pathname === DASHBOARD_ITEM.href}
        />

        {inProject && (
          <>
            <div className="mb-2 mt-3 px-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-gray-6">
                Projeto ativo
              </p>
              <p className="mb-0.5 mt-1 text-xs font-bold leading-snug text-neutral-gray-11">
                {project.nome}
              </p>
              <StatusBadge status={project.status} />
            </div>
            <div className="mt-2 border-t border-neutral-gray-4 pt-2">
              {WORKFLOW_NAV.map((step, i) => (
                <NavItem
                  key={step.key}
                  href={step.href}
                  icon={step.icon}
                  label={step.label}
                  active={i === activeIndex}
                  done={activeIndex > -1 && i < activeIndex}
                />
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-neutral-gray-3 px-5 py-3 text-xs-p text-neutral-gray-6">
        MVP · v0
      </div>
    </aside>
  );
}

export const SIDEBAR_WIDTH_PX = SIDEBAR_WIDTH;
