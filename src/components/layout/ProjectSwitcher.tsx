"use client";

import { usePathname, useRouter } from "next/navigation";

import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Icon,
  StatusBadge,
} from "@/components/ui";
import { useProjects } from "@/lib/hooks/useProjects";
import { useSelection } from "@/lib/store/selection";
import type { Project } from "@/shared/types/domain";

interface ProjectSwitcherProps {
  project: Project;
}

/**
 * Troca de empreendimento sem passar pelo dashboard. As sub-seleções são
 * limpas pelo próprio setActiveProject (ver selection.ts).
 */
export function ProjectSwitcher({ project }: ProjectSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const setActiveProject = useSelection((s) => s.setActiveProject);
  const { data: projects = [] } = useProjects();

  const switchTo = (id: number) => {
    if (id === project.id) return;
    setActiveProject(id);
    // Rotas de detalhe carregam ids de tipologia/componente do empreendimento
    // ANTIGO no path — trocar de projeto sem sair delas deixaria a tela pedindo
    // um recurso de outro projeto. As telas de fluxo (sem id) seguem na mesma.
    if (pathname.startsWith("/tipologias/")) router.push("/tipologias");
  };

  // Com um único empreendimento não há o que trocar: mantém o texto estático.
  if (projects.length < 2) {
    return (
      <span className="max-w-[280px] truncate text-[13px] font-bold text-neutral-gray-11">
        {project.nome}
      </span>
    );
  }

  return (
    <Dropdown placement="bottom-start">
      <DropdownTrigger>
        <button
          type="button"
          aria-label="Trocar de empreendimento"
          title="Trocar de empreendimento"
          className="flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-primary-1"
        >
          <span className="max-w-[280px] truncate text-[13px] font-bold text-neutral-gray-11">
            {project.nome}
          </span>
          <Icon name="chevD" size={15} className="shrink-0 text-neutral-gray-6" />
        </button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Empreendimentos"
        selectionMode="single"
        selectedKeys={[String(project.id)]}
        onAction={(key) => switchTo(Number(key))}
      >
        {projects.map((p) => (
          <DropdownItem key={String(p.id)} endContent={<StatusBadge status={p.status} />}>
            {p.nome}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
