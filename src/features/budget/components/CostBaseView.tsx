"use client";

import React from "react";

import { EmptyState, Icon, StatusBadge } from "@/components/ui";
import { getMaterial } from "@/lib/data/entities";

import { enumerateCostRefs } from "../enumerate";
import { cn, fmtBRL } from "@/lib/utils";
import type { ThreadRow } from "@/features/construtor-shared/CommentThreadPanel";
import type { Comment, Material, Tipologia } from "@/shared/types/domain";

import type { BaseCosts } from "../calc";

function CostField({
  value,
  isPending,
  onChange,
  onCommit,
}: {
  value: string;
  isPending: boolean;
  onChange: (v: string) => void;
  onCommit?: (v: string) => void;
}) {
  const filledNow = value !== "" && parseFloat(value) > 0;
  return (
    <div className="relative inline-block">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-gray-6">
        R$
      </span>
      <input
        type="number"
        step="0.01"
        value={value}
        placeholder="0,00"
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit?.(e.target.value)}
        className={cn(
          "h-[34px] w-[118px] rounded-md border py-0 pl-[26px] pr-2 text-right text-[12.5px] outline-none",
          isPending && !filledNow
            ? "border-functional-error bg-functional-error-light text-neutral-gray-9"
            : filledNow
              ? "border-primary-7 bg-white font-bold text-primary-8"
              : "border-neutral-gray-5 bg-white text-neutral-gray-9"
        )}
      />
    </div>
  );
}

interface CostBaseViewProps {
  tip: Tipologia;
  materiais: Material[];
  baseCosts: BaseCosts;
  setBaseCosts: React.Dispatch<React.SetStateAction<BaseCosts>>;
  comments: Record<string, Comment[]>;
  onOpenThread: (row: ThreadRow) => void;
  /** Persiste o custo no material ao sair do campo (blur) — keyed por baseId. */
  onPersist: (baseId: number, mat: string, mo: string) => void;
}

// Visão Custos base — grade editável de custo mat/MO por item. Preencher e sair
// do campo (blur) persiste o custo no material via onPersist (e some a pendência).
export function CostBaseView({
  tip,
  materiais,
  baseCosts,
  setBaseCosts,
  comments,
  onOpenThread,
  onPersist,
}: CostBaseViewProps) {
  const setField = (baseId: number, fld: "mat" | "mo", val: string) =>
    setBaseCosts((p) => {
      const cur = p[baseId] ?? { mat: "", mo: "" };
      return { ...p, [baseId]: { ...cur, [fld]: val } };
    });

  const valOf = (baseId: number, m: Material, fld: "mat" | "mo"): string => {
    const f = baseCosts[baseId];
    const filled = f?.[fld];
    if (filled !== undefined && filled !== "") return filled;
    const orig = fld === "mat" ? m.custoMat : m.custoMO;
    return orig > 0 ? String(orig) : "";
  };

  const TH = ({ children, right = false, teal = false }: { children?: React.ReactNode; right?: boolean; teal?: boolean }) => (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider",
        right ? "text-right" : "text-left",
        teal ? "bg-primary-1 text-primary-7" : "text-neutral-gray-7"
      )}
    >
      {children}
    </th>
  );

  if (tip.ambientes.length === 0) {
    return (
      <div className="mb-6 rounded-b-lg border border-t-0 border-neutral-gray-4 bg-white">
        <EmptyState
          icon="layers"
          title="Nenhum ambiente nesta tipologia"
          subtitle="Cadastre os ambientes e seus componentes para preencher os custos base."
        />
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-x-auto rounded-b-lg border border-t-0 border-neutral-gray-4 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-gray-4 bg-neutral-gray-2 px-4 py-[9px]">
        <Icon name="edit" size={13} className="text-primary-7" />
        <span className="text-xs font-semibold text-primary-7">
          Preencha os custos base de material e mão de obra — usados como ponto de partida do preço
        </span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-gray-4 bg-neutral-gray-2">
            <TH>Especificação</TH>
            <TH right teal>Custo mat.</TH>
            <TH right teal>Custo MO</TH>
            <TH right>Total base</TH>
            <TH>Status</TH>
            <th className="w-11 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {tip.ambientes.map((amb) => (
            <React.Fragment key={amb.id}>
              <tr>
                <td
                  colSpan={6}
                  className="bg-neutral-gray-11 px-3.5 py-[7px] text-[11px] font-bold uppercase tracking-[0.08em] text-white"
                >
                  {amb.nome}
                </td>
              </tr>
              {enumerateCostRefs(amb).map((ref) => {
                    const m = getMaterial(materiais, ref.baseId);
                    if (!m) return null;
                    const rk = ref.key;
                    const matV = valOf(ref.baseId, m, "mat");
                    const moV = valOf(ref.baseId, m, "mo");
                    const matN = parseFloat(matV) || 0;
                    const moN = parseFloat(moV) || 0;
                    const isPending = m.custoMat <= 0 && !(matN > 0);
                    const cmts = comments[rk] ?? [];
                    return (
                      <tr
                        key={rk}
                        className={cn(
                          "border-b border-neutral-gray-4",
                          isPending
                            ? "bg-functional-warning-light"
                            : matN > 0
                              ? "bg-[#f7fffe]"
                              : "bg-white"
                        )}
                      >
                        <td className="min-w-[240px] px-3.5 py-[9px]">
                          <div
                            className={cn(
                              "text-xs font-semibold",
                              isPending ? "text-tint-amber-fg" : "text-neutral-gray-11"
                            )}
                          >
                            {m.nome}
                          </div>
                          <div
                            className={cn(
                              "mt-px text-[11px]",
                              isPending ? "text-[#b45309]" : "text-neutral-gray-6"
                            )}
                          >
                            {ref.compNome} · {m.fabricante}
                            {ref.isDefault && (
                              <span className="ml-1.5 rounded bg-functional-success-light px-1 py-px text-[9px] font-bold uppercase tracking-wide text-functional-success">
                                Padrão
                              </span>
                            )}
                            {ref.origem === "componente-custo" && (
                              <span className="ml-1.5 rounded bg-neutral-gray-3 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-neutral-gray-7">
                                Item de custo
                              </span>
                            )}
                            {isPending && (
                              <span className="ml-1.5 font-bold text-tint-orange-fg">
                                · Aguardando custo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-[5px] text-right">
                          <CostField
                            value={matV}
                            isPending={isPending}
                            onChange={(v) => setField(ref.baseId, "mat", v)}
                            onCommit={(v) => onPersist(ref.baseId, v, moV)}
                          />
                        </td>
                        <td className="px-3 py-[5px] text-right">
                          <CostField
                            value={moV}
                            isPending={isPending}
                            onChange={(v) => setField(ref.baseId, "mo", v)}
                            onCommit={(v) => onPersist(ref.baseId, matV, v)}
                          />
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-3 py-[9px] text-right text-xs font-bold",
                            matN + moN > 0 ? "text-neutral-gray-11" : "text-neutral-gray-5"
                          )}
                        >
                          {matN + moN > 0 ? fmtBRL(matN + moN) : "—"}
                        </td>
                        <td className="px-3 py-[9px]">
                          <StatusBadge status={isPending ? "pendente" : "preenchido"} />
                        </td>
                        <td className="px-2 py-2 text-center">
                          {/* Componente de custo não tem linha Material, logo
                              não tem thread — só opções comentam. */}
                          {ref.origem === "opcao" && (
                            <button
                              type="button"
                              onClick={() =>
                                onOpenThread({
                                  key: rk,
                                  especificacao: m.nome,
                                  ambiente: amb.nome,
                                  componente: ref.compNome,
                                })
                              }
                              className={cn(
                                "inline-flex items-center gap-[3px] rounded px-1.5 py-1",
                                cmts.length > 0 ? "bg-functional-warning-light" : ""
                              )}
                            >
                              <Icon
                                name="chat"
                                size={14}
                                className={
                                  cmts.length > 0 ? "text-functional-warning" : "text-neutral-gray-5"
                                }
                              />
                              {cmts.length > 0 && (
                                <span className="text-[10px] font-bold text-functional-warning">
                                  {cmts.length}
                                </span>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
