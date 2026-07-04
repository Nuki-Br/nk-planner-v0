"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLANNER_NAV } from "@/shared/constants/navigation";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 212;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{ width: SIDEBAR_WIDTH }}
      className="fixed left-0 top-0 z-20 flex h-screen flex-col border-r border-neutral-gray-5 bg-white"
    >
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-4 text-white font-bold">
          N
        </div>
        <span className="text-sm-p-bold text-neutral-gray-10">Nuki Planner</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {PLANNER_NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm-p transition-colors",
                active
                  ? "bg-primary-1 text-primary-7 font-semibold"
                  : "text-neutral-gray-8 hover:bg-neutral-gray-3"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-xs-p text-neutral-gray-6">MVP · v0</div>
    </aside>
  );
}

export const SIDEBAR_WIDTH_PX = SIDEBAR_WIDTH;
