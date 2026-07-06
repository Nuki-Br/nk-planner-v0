"use client";

import { Icon } from "@/components/ui";

// Header do shell (planner): organização à direita + sair, como no protótipo
// (PlannerHeader). Auth real entra na Fase 10 — org e logout são mock.
export function Header() {
  return (
    <header
      className="fixed right-0 top-0 z-10 flex h-16 items-center justify-end gap-4 border-b border-neutral-gray-3 bg-white px-5"
      style={{ left: 212 }}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary-1 text-[11px] font-bold text-primary-7">
          GA
        </div>
        <span className="text-[13px] text-neutral-gray-11">Grupo Axis</span>
      </div>
      <button
        type="button"
        aria-label="Sair"
        className="flex items-center text-neutral-gray-7 transition-colors hover:text-neutral-gray-10"
      >
        <Icon name="logout" size={17} />
      </button>
    </header>
  );
}
