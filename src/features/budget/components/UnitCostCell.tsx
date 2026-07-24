"use client";

import React from "react";

import { cn, fmtBRL } from "@/lib/utils";

interface UnitCostCellProps {
  /** Valor EFETIVO exibido (override, se houver; senão o custo base). */
  value: number;
  /** Custo base do empreendimento — mostrado como "voltar para" no editor. */
  base: number;
  /** Tem override? Muda a cor e habilita o "↩ voltar ao custo base". */
  overridden: boolean;
  /** Sem custo em lugar nenhum: exibe "—" e ainda assim deixa digitar. */
  pending: boolean;
  /** `null` limpa o override. */
  onSave: (v: number | null) => void;
}

/**
 * Célula "Valor un." editável ao clique. Grava um override que substitui o custo
 * base (material + MO) SÓ desta aplicação — as outras aplicações do mesmo
 * material seguem no custo base do empreendimento.
 *
 * Digita-se o valor final, sem separar material de mão de obra: quem precisa
 * daquele detalhe usa a aba "Custos base"; aqui o caso de uso é "esta parede
 * específica sai por X".
 */
export function UnitCostCell({ value, base, overridden, pending, onSave }: UnitCostCellProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const start = () => {
    setDraft(value > 0 ? String(value) : "");
    setEditing(true);
  };

  const commit = () => {
    const n = parseFloat(draft.replace(",", ".")) || 0;
    setEditing(false);
    // Campo esvaziado = voltar a herdar, não "custo zero". Zerar de verdade é
    // trabalho da aba "Custos base"; aqui um branco significa "sem override".
    if (draft.trim() === "") {
      if (overridden) onSave(null);
      return;
    }
    if (n !== value) onSave(n);
  };

  if (editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <div className="relative inline-block">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-gray-6">
            R$
          </span>
          <input
            autoFocus
            type="number"
            step="0.01"
            value={draft}
            placeholder={base > 0 ? String(base) : "0,00"}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-[30px] w-[96px] rounded-md border-2 border-primary-7 bg-primary-1 pl-[22px] pr-1.5 text-right text-[11.5px] font-bold text-primary-8 outline-none"
          />
        </div>
        {overridden && (
          <button
            type="button"
            title={`Voltar ao custo base (${fmtBRL(base)})`}
            // onMouseDown: o onBlur do input dispararia antes do onClick e
            // fecharia o editor sem nunca chamar o reset.
            onMouseDown={(e) => {
              e.preventDefault();
              setEditing(false);
              onSave(null);
            }}
            className="rounded px-1 py-1 text-[11px] leading-none text-neutral-gray-6 hover:bg-neutral-gray-3 hover:text-primary-7"
          >
            ↩
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={start}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          start();
        }
      }}
      title={
        overridden
          ? `Valor sobrescrito nesta aplicação · custo base ${fmtBRL(base)}`
          : "Clique para sobrescrever o custo base nesta linha"
      }
      className="flex cursor-pointer items-center justify-end gap-1 rounded px-1 py-0.5"
    >
      <span className={cn(overridden ? "font-bold text-primary-7" : "text-neutral-gray-7")}>
        {pending && !overridden ? "—" : fmtBRL(value)}
      </span>
      {overridden && (
        <span className="inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-primary-7" />
      )}
    </div>
  );
}
