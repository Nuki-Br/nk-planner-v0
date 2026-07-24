"use client";

import React from "react";

import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PricingDiff } from "@/shared/types/domain";

interface PricingStatusBadgeProps {
  /** undefined enquanto o diff carrega — o badge some em vez de mentir. */
  diff: PricingDiff | undefined;
  /** Rótulo da versão atual ("v3"); "" quando ainda não há versão. */
  versionLabel: string;
  /** Abre o modal de publicar já no diff. */
  onClick: () => void;
}

/**
 * Estado da precificação em relação ao publicado. Três leituras possíveis:
 *   cinza  "Nunca publicado"           — nenhuma linha tem preço publicado
 *   verde  "Publicado · v3"            — rascunho idêntico ao publicado
 *   âmbar  "N alterações não publicadas" — clicável, leva ao diff
 *
 * Existe porque o rascunho é livre por design: sem este indicador não há como
 * saber, olhando a tabela, se o que está na tela é o que está valendo.
 */
export function PricingStatusBadge({ diff, versionLabel, onClick }: PricingStatusBadgeProps) {
  if (!diff) return null;

  const n = diff.rows.length;
  const temAviso = diff.avisos.length > 0;

  if (diff.nuncaPublicado) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Nenhum preço foi publicado ainda — publique para congelar os valores"
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-gray-5 bg-neutral-gray-2 px-2.5 py-1 text-[11px] font-semibold text-neutral-gray-7"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-gray-6" />
        Nunca publicado
      </button>
    );
  }

  if (n === 0 && !temAviso) {
    return (
      <span
        title="O rascunho está idêntico ao que foi publicado"
        className="inline-flex items-center gap-1.5 rounded-full border border-functional-success/30 bg-functional-success-light px-2.5 py-1 text-[11px] font-semibold text-functional-success"
      >
        <Icon name="check" size={11} />
        Publicado{versionLabel && ` · ${versionLabel}`}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title="Ver o que mudou desde a última publicação"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[#fde68a] bg-functional-warning-light px-2.5 py-1 text-[11px] font-semibold text-tint-amber-fg",
        "hover:border-functional-warning"
      )}
    >
      <Icon name="warning" size={11} />
      {n > 0
        ? `${n} ${n === 1 ? "alteração não publicada" : "alterações não publicadas"}`
        : "Revisar antes de publicar"}
    </button>
  );
}
