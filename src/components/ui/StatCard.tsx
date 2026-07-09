"use client";

import { cn } from "@/lib/utils";

import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  /** Destaca o valor em teal (ex.: "Em andamento" no dashboard). */
  accent?: boolean;
}

/** Cartão de métrica do dashboard (StatCard do protótipo). */
export function StatCard({ label, value, sub, accent = false }: StatCardProps) {
  return (
    <Card padding={20}>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wider text-neutral-gray-7">
          {label}
        </span>
        <span
          className={cn(
            "text-[28px] font-extrabold leading-none",
            accent ? "text-primary-7" : "text-neutral-gray-11"
          )}
        >
          {value}
        </span>
        {sub && <span className="text-xs text-neutral-gray-7">{sub}</span>}
      </div>
    </Card>
  );
}
