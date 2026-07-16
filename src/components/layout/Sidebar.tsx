"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";
import { WORKFLOW_NAV } from "@/shared/constants/navigation";

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

// Sidebar flutuante do modo projeto: apenas os passos do fluxo, com passos
// anteriores marcados como concluídos (check teal). O bloco do projeto ativo
// vive no Header; em modo dashboard a sidebar nem é montada (AppShell).
export function Sidebar() {
  const pathname = usePathname();

  const activeIndex = WORKFLOW_NAV.findIndex(
    (step) => pathname === step.href || pathname.startsWith(`${step.href}/`)
  );

  return (
    <aside
      style={{ width: SIDEBAR_WIDTH }}
      className="fixed left-4 top-[80px] z-20 max-h-[calc(100vh-96px)] overflow-y-auto rounded-nk-2xl border border-neutral-gray-3 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
    >
      <nav className="px-3 py-3">
        <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-neutral-gray-6">
          NAVEGAÇÃO
        </p>
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
      </nav>

      <div className="border-t border-neutral-gray-3 px-4 py-2 text-xs-p text-neutral-gray-6 text-center">
        v0.0.3
      </div>
    </aside>
  );
}

export const SIDEBAR_WIDTH_PX = SIDEBAR_WIDTH;

/** Offset do conteúdo em modo projeto: 16px de margem + sidebar + 16px de vão. */
export const CONTENT_LEFT_OFFSET_PX = 16 + SIDEBAR_WIDTH + 16;
