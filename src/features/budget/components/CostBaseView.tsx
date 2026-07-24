"use client";

import React from "react";

import { EmptyState, Icon, StatusBadge } from "@/components/ui";
import { cn, fmtBRL } from "@/lib/utils";
import type { CustoBaseRow } from "@/shared/types/domain";

/** Campo de custo em edição — "" enquanto o usuário limpa para redigitar. */
type Draft = Record<number, { mat?: string; mo?: string }>;

function CostField({
  value,
  isPending,
  onChange,
  onCommit,
}: {
  value: string;
  isPending: boolean;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
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
        onBlur={(e) => onCommit(e.target.value)}
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
  /** Todo material que precisa de custo NESTE empreendimento (todas as tipologias). */
  rows: CustoBaseRow[];
  /** Persiste no blur. Campo omitido = não mexe (a grade grava um por vez). */
  onPersist: (baseId: number, patch: { custoMat?: number; custoMO?: number }) => void;
}

/**
 * Visão "Custos base" — grade editável de custo material/MO POR EMPREENDIMENTO.
 *
 * Lista plana e de-duplicada: um material usado em cinco componentes aparece uma
 * vez só, porque o custo é um só. Antes esta grade era por tipologia e repetia o
 * mesmo material em cada ambiente, dando a impressão de que dava para cobrar
 * preços diferentes — não dá, e não deveria dar.
 *
 * SEM coluna de comentários, ao contrário da versão por tipologia: a thread é
 * por APLICAÇÃO (Material), e aqui uma linha pode ser cinco aplicações. Um
 * contador somado abriria uma thread escolhida a esmo. Os comentários seguem na
 * aba "Preço final", onde cada linha é uma aplicação só.
 */
export function CostBaseView({ rows, onPersist }: CostBaseViewProps) {
  // Só o que está sendo digitado: o valor de verdade vem do servidor. Guardar a
  // grade inteira em estado local traria de volta o bug de custo que sumia no
  // reload — o rascunho aqui vive entre o keystroke e o blur, mais nada.
  const [draft, setDraft] = React.useState<Draft>({});

  const setField = (baseId: number, fld: "mat" | "mo", val: string) =>
    setDraft((p) => ({ ...p, [baseId]: { ...p[baseId], [fld]: val } }));

  const valOf = (row: CustoBaseRow, fld: "mat" | "mo"): string => {
    const d = draft[row.baseId]?.[fld];
    if (d !== undefined) return d;
    const v = fld === "mat" ? row.custoMat : row.custoMO;
    return v > 0 ? String(v) : "";
  };

  const commit = (row: CustoBaseRow, fld: "mat" | "mo", raw: string) => {
    const n = parseFloat(raw.replace(",", ".")) || 0;
    const atual = fld === "mat" ? row.custoMat : row.custoMO;
    // Sai do campo sem ter mudado nada → nenhum request.
    if (n !== atual) onPersist(row.baseId, fld === "mat" ? { custoMat: n } : { custoMO: n });
    setDraft((p) => {
      const next = { ...p };
      delete next[row.baseId];
      return next;
    });
  };

  const TH = ({
    children,
    right = false,
    teal = false,
  }: {
    children?: React.ReactNode;
    right?: boolean;
    teal?: boolean;
  }) => (
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

  if (rows.length === 0) {
    return (
      <div className="mb-6 rounded-b-lg border border-t-0 border-neutral-gray-4 bg-white">
        <EmptyState
          icon="layers"
          title="Nenhum material aplicado neste empreendimento"
          subtitle="Cadastre as tipologias e seus componentes para preencher os custos base."
        />
      </div>
    );
  }

  const pendentes = rows.filter((r) => r.custoMat <= 0).length;

  return (
    <div className="mb-6 overflow-x-auto rounded-b-lg border border-neutral-gray-4 bg-white">
      <div className="flex items-center gap-2 border-b border-neutral-gray-4 bg-neutral-gray-2 px-4 py-[9px]">
        <Icon name="edit" size={13} className="text-primary-7" />
        <span className="text-xs font-semibold text-primary-7">
          Custo de material e mão de obra deste empreendimento — vale para todas as tipologias
        </span>
        <span className="ml-auto text-[11px] text-neutral-gray-7">
          {rows.length} {rows.length === 1 ? "material" : "materiais"}
          {pendentes > 0 && (
            <strong className="ml-1.5 font-bold text-tint-orange-fg">
              · {pendentes} sem custo
            </strong>
          )}
        </span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-neutral-gray-4 bg-neutral-gray-2">
            <TH>Especificação</TH>
            <TH>Onde é usado</TH>
            <TH right teal>Custo mat.</TH>
            <TH right teal>Custo MO</TH>
            <TH right>Total base</TH>
            <TH>Status</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const matV = valOf(row, "mat");
            const moV = valOf(row, "mo");
            const matN = parseFloat(matV) || 0;
            const moN = parseFloat(moV) || 0;
            const isPending = row.custoMat <= 0 && !(matN > 0);
            return (
              <tr
                key={row.baseId}
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
                    {row.nome}
                  </div>
                  <div
                    className={cn(
                      "mt-px text-[11px]",
                      isPending ? "text-[#b45309]" : "text-neutral-gray-6"
                    )}
                  >
                    {row.fabricante || "sem fabricante"}
                    {row.categoria && ` · ${row.categoria}`}
                    {/* Não é uma opção ofertada ao cliente: entra no custo por
                        dentro (sub-item de kit ou item de custo), e por isso não
                        aparece como linha própria na aba "Preço final". */}
                    {row.somenteIndireto && (
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
                <td className="min-w-[200px] px-3.5 py-[9px] text-[11px] text-neutral-gray-7">
                  {/* Três já dizem "é usado em vários lugares"; a lista inteira
                      vira parede de texto numa grade densa. */}
                  {row.usadoEm.slice(0, 3).join(", ")}
                  {row.usadoEm.length > 3 && (
                    <span className="text-neutral-gray-6">
                      {" "}
                      +{row.usadoEm.length - 3}
                    </span>
                  )}
                </td>
                <td className="px-3 py-[5px] text-right">
                  <CostField
                    value={matV}
                    isPending={isPending}
                    onChange={(v) => setField(row.baseId, "mat", v)}
                    onCommit={(v) => commit(row, "mat", v)}
                  />
                </td>
                <td className="px-3 py-[5px] text-right">
                  <CostField
                    value={moV}
                    isPending={isPending}
                    onChange={(v) => setField(row.baseId, "mo", v)}
                    onCommit={(v) => commit(row, "mo", v)}
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
