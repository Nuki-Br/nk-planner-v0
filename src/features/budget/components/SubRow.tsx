"use client";

import React from "react";

import { Icon } from "@/components/ui";
import { cn, fmtBRL, fmtNum } from "@/lib/utils";
import type { BudgetColumn } from "@/shared/types/domain";

/**
 * Forma comum em que um sub-item de kit e um componente de custo se projetam.
 * Um só componente renderiza os dois: eles são IRMÃOS em profundidade 1 sob a
 * linha mestre (o satélite pende do componente, não do kit — aninhá-lo sob o
 * kit afirmaria que o rodapé do Hall pertence ao Piso Barcelona).
 */
export interface SubRowCells {
  key: string;
  nome: string;
  /** Segunda linha: fabricante, ou de onde vem o preço do item de custo. */
  sub?: string;
  qtd: number;
  unidade: string;
  valUn: number;
  /** valUn * qtd — já estendido. */
  line: number;
  pending: boolean;
  /** Selo curto à direita do nome (ex.: "Item de custo"). */
  badge?: string;
  /** Linha de crédito (lado padrão) em vez de débito. */
  credito?: boolean;
  /** Id do item de custo — presente só quando a linha é editável. */
  costItemId?: number;
}

function Td({
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
 * linha: colunas de taxa e total são da mestre — o satélite já está somado nela.
 */
export function SubRow({ cells, isLast, cols, onEdit, onRemove, usaDebitoCredito = true }: {
  cells: SubRowCells;
  isLast: boolean;
  cols: BudgetColumn[];
  /** Só itens de custo são editáveis — sub-item de kit vem do catálogo. */
  onEdit?: (costItemId: number) => void;
  onRemove?: (costItemId: number) => void;
  /** Empreendimento usa débito/crédito? false esconde a coluna Déb./Créd. */
  usaDebitoCredito?: boolean;
}) {
  const editable = cells.costItemId != null;
  return (
    <tr className="group/sub">
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
                cells.pending ? "text-tint-amber-fg" : "text-neutral-gray-9"
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
            {(cells.sub || cells.pending) && (
              <code className="text-[10px] text-neutral-gray-6">
                {cells.sub}
                {cells.pending && (
                  <span className="ml-1.5 font-bold text-tint-orange-fg">aguardando</span>
                )}
              </code>
            )}
          </div>
          {editable && (
            <div className="ml-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/sub:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                title="Editar item de custo"
                onClick={() => cells.costItemId != null && onEdit?.(cells.costItemId)}
                className="rounded p-1 text-neutral-gray-6 hover:bg-neutral-gray-3 hover:text-neutral-gray-9"
              >
                <Icon name="edit" size={12} />
              </button>
              <button
                type="button"
                title="Remover item de custo"
                onClick={() => cells.costItemId != null && onRemove?.(cells.costItemId)}
                className="rounded p-1 text-neutral-gray-6 hover:bg-functional-error-light hover:text-functional-error"
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
          )}
        </div>
      </Td>
      <Td right className="bg-white text-neutral-gray-7">
        {fmtNum(cells.qtd, 2)} {cells.unidade}
      </Td>
      <Td right className="bg-white text-neutral-gray-7">
        {cells.pending ? "—" : fmtBRL(cells.valUn)}
      </Td>
      {usaDebitoCredito && (
        <Td right className="bg-white">
          {cells.pending ? (
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
