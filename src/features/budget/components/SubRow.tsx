"use client";

import React from "react";

import { cn, fmtBRL, fmtNum } from "@/lib/utils";
import type { BudgetColumn } from "@/shared/types/domain";

/**
 * Forma comum em que um sub-item de kit e uma parcela da composição do custo
 * base se projetam: um só componente renderiza os dois, em profundidade 1 sob
 * a linha mestre. A composição é só leitura (edita-se na aba "Itens de custo");
 * o sub-item de kit injeta os seus editores pelos slots do SubRow.
 */
export interface SubRowCells {
  key: string;
  nome: string;
  /** Segunda linha: fabricante, código do insumo ou nota ("valor un. sobreposto"). */
  sub?: string;
  qtd: number;
  unidade: string;
  valUn: number;
  /** valUn * qtd — já estendido. */
  line: number;
  pending: boolean;
  /** Sub-item de kit sem quantidade nesta planta — a linha não tem valor. */
  pendingQtd?: boolean;
  /** Selo curto à direita do nome (ex.: "Insumo"). */
  badge?: string;
  /** Linha de crédito (lado padrão) em vez de débito. */
  credito?: boolean;
}

export function Td({
  children,
  right = false,
  className,
  sticky = false,
}: {
  children?: React.ReactNode;
  right?: boolean;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <td
      className={cn(
        "border-b border-neutral-gray-4 px-2.5 py-[7px] align-middle text-xs text-neutral-gray-11",
        right ? "text-right" : "text-left",
        sticky && "sticky left-0 z-[1] border-r border-r-neutral-gray-4",
        className
      )}
    >
      {children}
    </td>
  );
}

/**
 * Sub-linha indentada sob uma linha mestre. Só qtd, valor unitário e o valor da
 * linha: colunas de taxa e total são da mestre — a parcela já está somada nela.
 */
export function SubRow({
  cells,
  isLast,
  cols,
  usaDebitoCredito = true,
  dimmed = false,
  qtdSlot,
  actionSlot,
}: {
  cells: SubRowCells;
  isLast: boolean;
  cols: BudgetColumn[];
  /** Empreendimento usa débito/crédito? false esconde a coluna Déb./Créd. */
  usaDebitoCredito?: boolean;
  /** Só informativa — ex.: o valor unitário da linha-pai foi sobreposto. */
  dimmed?: boolean;
  /** Substitui o texto da coluna Qtd (editor de quantidade do sub-item de kit). */
  qtdSlot?: React.ReactNode;
  /** Ação sob o nome (ex.: "Preencher custo" de um sub-item de kit). */
  actionSlot?: React.ReactNode;
}) {
  const semValor = cells.pending || cells.pendingQtd;
  return (
    <tr className={cn(dimmed && "opacity-60")}>
      <Td sticky className="bg-white !pl-0">
        <div className="flex items-stretch">
          {/* Conector em árvore: tronco vertical + cotovelo. No último filho o
              tronco para na metade, fechando o desenho. */}
          <span className="relative w-[26px] shrink-0">
            <span
              className="absolute left-[17px] w-px bg-neutral-gray-5"
              style={{ top: -2, bottom: isLast ? "50%" : -2 }}
            />
            <span className="absolute left-[17px] top-1/2 h-px w-[7px] bg-neutral-gray-5" />
          </span>
          <div className="pt-px">
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs",
                semValor ? "text-tint-amber-fg" : "text-neutral-gray-9"
              )}
            >
              <span>
                <span className="mr-1 text-neutral-gray-5">·</span>
                {cells.nome}
              </span>
              {cells.badge && (
                <span className="rounded bg-neutral-gray-3 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-neutral-gray-7">
                  {cells.badge}
                </span>
              )}
            </div>
            {(cells.sub || cells.pending || cells.pendingQtd) && (
              <code className="text-[10px] text-neutral-gray-6">
                {cells.sub}
                {cells.pending && (
                  <span className="ml-1.5 font-bold text-tint-orange-fg">aguardando</span>
                )}
                {cells.pendingQtd && (
                  <span className="ml-1.5 font-bold text-tint-orange-fg">
                    {cells.pending && "· "}sem quantidade
                  </span>
                )}
              </code>
            )}
            {actionSlot}
          </div>
        </div>
      </Td>
      <Td right className="bg-white text-neutral-gray-7">
        {qtdSlot ?? (
          <>
            {fmtNum(cells.qtd, 2)} {cells.unidade}
          </>
        )}
      </Td>
      <Td right className="bg-white text-neutral-gray-7">
        {cells.pending ? "—" : fmtBRL(cells.valUn)}
      </Td>
      {usaDebitoCredito && (
        <Td right className="bg-white">
          {semValor ? (
            <span className="text-neutral-gray-5">—</span>
          ) : (
            <span
              className={cn(
                "font-semibold",
                cells.credito ? "text-functional-success" : "text-[#c2410c]"
              )}
            >
              {cells.credito ? "Créd. " : "Déb. "}
              {fmtBRL(cells.line)}
            </span>
          )}
        </Td>
      )}
      <Td right className="bg-white text-neutral-gray-5">—</Td>
      {cols.map((col) => (
        <Td key={col.id} right className="bg-white text-neutral-gray-5">
          —
        </Td>
      ))}
      <Td className="bg-white" />
      <Td right className="bg-white text-neutral-gray-5">—</Td>
      <Td right className="bg-white text-neutral-gray-5">—</Td>
    </tr>
  );
}
