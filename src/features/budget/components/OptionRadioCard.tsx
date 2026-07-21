"use client";

import { cn } from "@/lib/utils";

/**
 * Cartão de escolha única dos modais do Construtor de Preço. Não é o
 * `RadioCard` de `@/components/ui`: aquele é o cartão horizontal largo do
 * admin (p-4, max-w-300) e destoa da tipografia densa desta tela.
 */
export function OptionRadioCard({
  selected,
  title,
  desc,
  onSelect,
  className,
}: {
  selected: boolean;
  title: string;
  desc: string;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-left",
        selected ? "border-primary-7 bg-primary-1" : "border-neutral-gray-4 bg-white",
        className
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full border",
            selected ? "border-primary-7 bg-primary-7" : "border-neutral-gray-5"
          )}
        />
        <span
          className={cn(
            "text-xs font-bold",
            selected ? "text-primary-8" : "text-neutral-gray-9"
          )}
        >
          {title}
        </span>
      </div>
      <p className="mt-1 pl-4 text-[11px] leading-snug text-neutral-gray-7">{desc}</p>
    </button>
  );
}
