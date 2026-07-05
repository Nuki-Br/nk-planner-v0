"use client";

import { Progress } from "@heroui/react";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  /** Texto à direita da barra; padrão "NN%". */
  label?: string;
  className?: string;
}

/** Barra de progresso fina com label à direita (ProgressBar do protótipo). */
export function ProgressBar({ value, max = 100, label, className }: ProgressBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress
        aria-label={label ?? `${pct}%`}
        value={value}
        maxValue={max}
        classNames={{
          base: "flex-1",
          track: "h-1.5 bg-neutral-gray-4",
          indicator: "bg-primary-7",
        }}
      />
      <span className="min-w-8 text-[11px] text-neutral-gray-7">
        {label ?? `${pct}%`}
      </span>
    </div>
  );
}
