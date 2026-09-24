"use client";

import React from "react";

import { Icon } from "@/components/ui";
import { cn, fmtBRL } from "@/lib/utils";
import type { PricingDiff, PricingDiffField, PricingDiffRow } from "@/shared/types/domain";

export const TIPO_META: Record<PricingDiffRow["tipo"], { label: string; className: string }> = {
  novo: {
    label: "Novo",
    className: "bg-functional-success-light text-functional-success",
  },
  alterado: {
    label: "Alterado",
    className: "bg-primary-1 text-primary-7",
  },
  // "Removido" = deixou de ser calculável (custo apagado). Publicar LIMPA o
  // preço dessa linha, então o rótulo precisa soar como perda, não como neutro.
  removido: {
    label: "Sai do orçamento",
    className: "bg-functional-error-light text-functional-error",
  },
};

/** Ordem de leitura: o que quebra primeiro, o que é novidade por último. */
export const ORDEM: PricingDiffRow["tipo"][] = ["removido", "alterado", "novo"];

/** "R$ 1.200,00 → R$ 1.350,00" — riscado quando a linha sai do orçamento. */
export function DiffPrice({ row }: { row: PricingDiffRow }) {
  return (
    <span className="whitespace-nowrap">
      {row.de != null && (
        <span className={cn("text-neutral-gray-6", row.tipo === "removido" && "line-through")}>
          {fmtBRL(row.de)}
        </span>
      )}
      {row.de != null && row.para != null && <span className="mx-1.5 text-neutral-gray-5">→</span>}
      {row.para != null && <span className="font-bold text-neutral-gray-11">{fmtBRL(row.para)}</span>}
    </span>
  );
}

/** Por que o preço mudou: os campos do snapshot que diferem ("Qtd 18,00 → 20,00"). */
export function DiffMotivos({ motivos }: { motivos: PricingDiffField[] }) {
  if (motivos.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] leading-snug text-neutral-gray-7">
      {motivos.map((m, i) => (
        <span key={i}>
          <span className="text-neutral-gray-6">{m.campo}</span>{" "}
          <span className="whitespace-nowrap">{m.de}</span>
          <span className="mx-1 text-neutral-gray-5">→</span>
          <span className="whitespace-nowrap font-semibold text-neutral-gray-9">{m.para}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * O que "Publicar orçamento" vai gravar. Vem do servidor, do MESMO resolvedor
 * que a publicação usa — o que esta lista promete é o que o publish faz.
 */
export function PublishDiffList({ diff }: { diff: PricingDiff | undefined }) {
  if (!diff) {
    return <p className="text-[13px] text-neutral-gray-6">Calculando alterações…</p>;
  }

  const rows = [...diff.rows].sort(
    (a, b) => ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo)
  );

  return (
    <div className="flex flex-col gap-3">
      {diff.avisos.map((aviso, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-lg border border-[#fde68a] bg-functional-warning-light px-3 py-2"
        >
          <Icon name="warning" size={13} className="mt-0.5 shrink-0 text-tint-orange-fg" />
          <p className="text-[11.5px] leading-snug text-neutral-gray-9">{aviso}</p>
        </div>
      ))}

      {rows.length === 0 ? (
        <p className="rounded-lg bg-neutral-gray-2 px-3 py-2.5 text-[13px] text-neutral-gray-7">
          {diff.nuncaPublicado
            ? "Nenhum preço calculável ainda — preencha os custos base para publicar."
            : "Nenhuma alteração de preço desde a última publicação."}
        </p>
      ) : (
        <div className="max-h-[280px] overflow-y-auto rounded-lg border border-neutral-gray-4">
          <table className="w-full border-collapse">
            <tbody>
              {rows.map((r) => {
                const meta = TIPO_META[r.tipo];
                return (
                  <tr key={r.optionId} className="border-b border-neutral-gray-4 last:border-b-0">
                    <td className="px-3 py-2 align-top">
                      <div className="text-[12px] font-semibold text-neutral-gray-11">
                        {r.especificacao}
                      </div>
                      <div className="mt-px text-[10.5px] text-neutral-gray-6">
                        {r.ambiente} · {r.componente}
                      </div>
                      <DiffMotivos motivos={r.motivos} />
                    </td>
                    <td className="px-3 py-2 text-right align-top text-[11.5px]">
                      <DiffPrice row={r} />
                    </td>
                    <td className="w-[110px] px-3 py-2 text-right align-top">
                      <span
                        className={cn(
                          "rounded px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide",
                          meta.className
                        )}
                      >
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
