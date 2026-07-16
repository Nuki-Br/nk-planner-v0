"use client";

import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

import { PLANTA_CARACTERISTICAS } from "../../shared";

interface CaracteristicasPickerProps {
  value: string[];
  onToggle: (caracteristica: string) => void;
}

/** Pills de toggle das características da planta (compartilhado entre criar/editar tipologia). */
export function CaracteristicasPicker({ value, onToggle }: CaracteristicasPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {PLANTA_CARACTERISTICAS.map((c) => {
        const on = value.includes(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => onToggle(c)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-[7px] text-xs font-semibold transition-colors",
              on
                ? "border-primary-7 bg-primary-1 text-primary-7"
                : "border-neutral-gray-5 bg-white text-neutral-gray-8 hover:border-neutral-gray-6"
            )}
          >
            <Icon name={on ? "check" : "plus"} size={13} />
            {c}
          </button>
        );
      })}
    </div>
  );
}
