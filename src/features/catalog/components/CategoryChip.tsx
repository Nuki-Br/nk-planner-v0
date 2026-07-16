"use client";

import React from "react";

import { cn } from "@/lib/utils";
import { CHIP_FALLBACK, COLOR_SCHEMES, toColorKey } from "@/shared/constants/categorias";
import type { CategoriaCatalogo } from "@/shared/types/domain";

interface CategoryChipProps {
  /** Nome da categoria ("" = sem categoria). */
  nome: string;
  /** Lista buscada (useCategorias) — resolve a cor pelo nome. */
  categorias: CategoriaCatalogo[];
  className?: string;
}

/** Chip de categoria com cor dinâmica (MaterialCategory.ColorScheme). */
export function CategoryChip({ nome, categorias, className }: CategoryChipProps) {
  if (nome === "") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-[9px] py-0.5 text-[11px] font-semibold",
          "border border-dashed border-neutral-gray-5 text-neutral-gray-6",
          className
        )}
      >
        Sem categoria
      </span>
    );
  }
  const cat = categorias.find((c) => c.nome === nome);
  const chip = cat ? COLOR_SCHEMES[toColorKey(cat.cor)].chip : CHIP_FALLBACK;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[9px] py-0.5 text-[11px] font-semibold",
        chip,
        className
      )}
    >
      {nome}
    </span>
  );
}
