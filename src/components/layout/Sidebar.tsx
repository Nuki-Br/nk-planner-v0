"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";
import { WORKFLOW_NAV } from "@/shared/constants/navigation";

const SIDEBAR_WIDTH = 212;
const SIDEBAR_COLLAPSED_WIDTH = 64;

interface NavItemProps {
  href: string;
  icon: IconName;
  label: string;
  active: boolean;
  done?: boolean;
  collapsed?: boolean;
}

function NavItem({ href, icon, label, active, done = false, collapsed = false }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "mb-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] transition-colors",
        collapsed && "justify-center px-0 py-2",
        active
          ? "bg-primary-1 font-bold text-primary-7"
          : "text-neutral-gray-9 hover:bg-primary-1 hover:text-primary-7",
        !active && done && "text-neutral-gray-8"
      )}
    >
      <Icon
        name={done ? "check" : icon}
        size={collapsed ? 17 : 15}
        className={cn(active || done ? "text-primary-7" : "text-neutral-gray-7", done && "opacity-60")}
      />
      {!collapsed && label}
    </Link>
  );
}

interface SidebarProps {
  /** Modo compacto (só ícones). Estado vive no AppShell (offset do conteúdo). */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

// Sidebar flutuante do modo projeto: apenas os passos do fluxo. O bloco do
// projeto ativo vive no Header; em modo dashboard a sidebar nem é montada
// (AppShell). Recolhível para só ícones (padrão no Construtor de Preço).
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();

  const activeIndex = WORKFLOW_NAV.findIndex(
    (step) => pathname === step.href || pathname.startsWith(`${step.href}/`)
  );

  return (
    <aside
      style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      className="fixed left-4 top-[80px] z-20 max-h-[calc(100vh-96px)] overflow-y-auto rounded-nk-2xl border border-neutral-gray-3 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.08)] transition-[width] duration-200"
    >
      <nav className={cn("py-3", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-gray-6">
            NAVEGAÇÃO
          </p>
        )}
        {WORKFLOW_NAV.map((step, i) => (
          <NavItem
            key={step.key}
            href={step.href}
            icon={step.icon}
            label={step.label}
            active={i === activeIndex}
            done={false}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div
        className={cn(
          "flex items-center border-t border-neutral-gray-3 py-2",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && <span className="text-xs-p text-neutral-gray-6">v0.0.3</span>}
        <button
          type="button"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          onClick={onToggleCollapsed}
          className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-gray-6 transition-colors hover:bg-primary-1 hover:text-primary-7"
        >
          <Icon name={collapsed ? "panel_open" : "panel_close"} size={15} />
        </button>
      </div>
    </aside>
  );
}

export const SIDEBAR_WIDTH_PX = SIDEBAR_WIDTH;
export const SIDEBAR_COLLAPSED_WIDTH_PX = SIDEBAR_COLLAPSED_WIDTH;

/** Offset do conteúdo em modo projeto: 16px de margem + sidebar. */
export const CONTENT_LEFT_OFFSET_PX = 16 + SIDEBAR_WIDTH;
export const CONTENT_LEFT_OFFSET_COLLAPSED_PX = 16 + SIDEBAR_COLLAPSED_WIDTH;
