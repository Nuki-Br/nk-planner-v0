import React from "react";

import { cn } from "@/lib/utils";

import { Icon } from "./Icon";

export interface Step {
  key: string;
  label: string;
}

interface StepNavProps {
  steps: Step[];
  /** Passo atual; passos anteriores aparecem como concluídos. */
  currentKey: string;
  className?: string;
}

/** Indicador de passos do fluxo (StepNav do protótipo). */
export function StepNav({ steps, currentKey, className }: StepNavProps) {
  const idx = steps.findIndex((s) => s.key === currentKey);
  if (idx < 0) return null;
  return (
    <div
      className={cn(
        "mb-5 flex items-center rounded-lg border border-neutral-gray-5 bg-white px-4 py-2",
        className
      )}
    >
      {steps.map((step, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div
                className={cn(
                  "mx-1 h-px w-6",
                  done ? "bg-primary-7" : "bg-neutral-gray-4"
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  done
                    ? "bg-primary-7 text-white"
                    : active
                      ? "bg-neutral-gray-11 text-white"
                      : "bg-neutral-gray-4 text-neutral-gray-7"
                )}
              >
                {done ? <Icon name="check" size={11} /> : i + 1}
              </div>
              <span
                className={cn(
                  "whitespace-nowrap text-[11px]",
                  active
                    ? "font-bold text-neutral-gray-11"
                    : done
                      ? "text-primary-7"
                      : "text-neutral-gray-6"
                )}
              >
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
