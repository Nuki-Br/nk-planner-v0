"use client";

import { Icon } from "@/components/ui";
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

// Header do shell (planner): organização real (membership) + sair. O reload
// completo no logout limpa os caches do React Query junto com a sessão.
export function Header({ orgName, email }: { orgName: string; email: string }) {
  const logout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header
      className="fixed right-0 top-0 z-10 flex h-16 items-center justify-end gap-4 border-b border-neutral-gray-3 bg-white px-5"
      style={{ left: 212 }}
    >
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
    </header>
  );
}
