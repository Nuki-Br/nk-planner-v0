"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Icon, Skeleton, StatusBadge } from "@/components/ui";
import { useActiveProjectId } from "@/lib/hooks/useActiveProject";
import { useProject } from "@/lib/hooks/useProjects";
import { useSelection } from "@/lib/store/selection";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Iniciais da organização para o avatar (ex.: "Grupo Axis" → "GA"). */
function initials(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

interface HeaderProps {
  orgName: string;
  email: string;
  /** Fora do modo dashboard: mostra voltar + projeto ativo à esquerda. */
  inProject: boolean;
}

// Header do shell (planner): logo + projeto ativo à esquerda, organização real
// (membership) + sair à direita. O reload completo no logout limpa os caches
// do React Query junto com a sessão.
export function Header({ orgName, email, inProject }: HeaderProps) {
  const router = useRouter();
  const clearSelection = useSelection((s) => s.clearSelection);
  const projectId = useActiveProjectId();
  const { data: project, isLoading: projectLoading } = useProject(
    inProject ? projectId : null,
  );

  const logout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Voltar limpa a seleção antes de navegar para o dashboard não piscar o
  // projeto antigo enquanto a rota troca.
  const backToDashboard = () => {
    clearSelection();
    router.push("/dashboard");
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-neutral-gray-3 bg-white px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <Image
            src="/img/logos/nuki-logo-black-horizontal.svg"
            alt="Nuki"
            width={62}
            height={36}
            priority
            className="h-[32px] w-auto object-contain"
          />
          <span className="border-l border-neutral-gray-4 pl-2 text-[14px] font-semibold text-neutral-gray-6">
            Planner
          </span>
        </div>

        {inProject && (
          <div className="flex min-w-0 items-center gap-2 border-l border-neutral-gray-4 pl-3">
            <button
              type="button"
              aria-label="Voltar aos empreendimentos"
              title="Voltar aos empreendimentos"
              onClick={backToDashboard}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-gray-7 transition-colors hover:bg-primary-1 hover:text-primary-7"
            >
              <Icon name="back" size={17} />
            </button>
            {project ? (
              <>
                <span className="max-w-[280px] truncate text-[13px] font-bold text-neutral-gray-11">
                  {project.nome}
                </span>
                <StatusBadge status={project.status} />
              </>
            ) : projectLoading ? (
              <>
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary-1 text-[11px] font-bold text-primary-7">
            {initials(orgName)}
          </div>
          <div className="leading-tight">
            <span className="block text-[13px] text-neutral-gray-11">{orgName}</span>
            <span className="block text-[10px] text-neutral-gray-6">{email}</span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Sair"
          title="Sair"
          onClick={() => void logout()}
          className="flex items-center text-neutral-gray-7 transition-colors hover:text-neutral-gray-10"
        >
          <Icon name="logout" size={17} />
        </button>
      </div>
    </header>
  );
}
