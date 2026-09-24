"use client";

import React from "react";

import { Icon } from "@/components/ui";
import { kitCredit, resolveKitSubItems, type KitRowResult, type KitSubItemResult } from "@/lib/budget";
import { cn, fmtBRL } from "@/lib/utils";
import type { BudgetColumn, Componente, Kit, MaterialOption } from "@/shared/types/domain";

import {
  kitSubItemsOf,
  pricingOf,
  qtdOf,
  rtOf,
  unidadeOf,
  type BudgetDeps,
} from "../calc";
import { linhasPendentesOf } from "../resolve";
import { kitSubRow } from "../subRows";
import { CostFillPopover } from "./CostFillPopover";
import { KitItemQtyPopover } from "./KitItemQtyPopover";
import { QtyPopover, type QtyValue } from "./QtyPopover";
import { SubRow, Td } from "./SubRow";

interface KitOptionRowsProps {
  /** "padrao" = linha de crédito; "upgrade" = linha de débito, com colunas e total. */
  modo: "padrao" | "upgrade";
  kit: Kit;
  comp: Componente;
  opt: MaterialOption;
  deps: BudgetDeps;
  cols: BudgetColumn[];
  usaDC: boolean;
  /** Nome da tipologia ativa — a qtd dos sub-itens é desta planta. */
  tipologia: string;
  expanded: boolean;
  onToggle: () => void;
  /** Só upgrade: a linha calculada pelo motor. */
  result?: KitRowResult | null;
  /** Só upgrade: células das colunas livres, já renderizadas pela tela. */
  configCells?: React.ReactNode;
  /** Célula de comentários (upgrade) — a tela é dona das threads. */
  commentCell?: React.ReactNode;
  /** Override de qtd/RT/unidade DO KIT (vale em todas as tipologias). */
  onSaveQtd: (v: QtyValue) => void;
  /** Quantidade de um sub-item nesta planta; null = apaga a gravação. */
  onSaveItemQtd: (kitItemId: number, qtd: number | null) => void;
  /** Custo base do material do sub-item (strings do formulário). */
  onFillCost: (baseId: number, mat: string, mo: string) => void;
  onSemCusto: (baseId: number) => void;
  /** Leva à aba "Itens de custo" (insumo da composição sem preço). */
  onVerItens: () => void;
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/**
 * Linha de um KIT no Construtor de Preço — padrão (crédito) ou upgrade (débito)
 * — mais uma sub-linha por sub-item. O kit não tem valor unitário: cada
 * sub-item carrega o custo base do seu material e a sua quantidade nesta
 * planta, e é ali que se edita um e outro. A RT (popover da linha do kit) entra
 * por cima da quantidade líquida de cada sub-item no débito; o crédito do kit
 * padrão usa a líquida.
 */
export function KitOptionRows({
  modo,
  kit,
  comp,
  opt,
  deps,
  cols,
  usaDC,
  tipologia,
  expanded,
  onToggle,
  result,
  configCells,
  commentCell,
  onSaveQtd,
  onSaveItemQtd,
  onFillCost,
  onSemCusto,
  onVerItens,
}: KitOptionRowsProps) {
  const padrao = modo === "padrao";
  const pricing = pricingOf(deps, opt.id);
  const rt = rtOf(deps, comp, opt.id);
  const baseQtd = qtdOf(deps, comp, opt.id);
  const baseUnidade = unidadeOf(deps, comp, opt.id);

  // Upgrade: o motor já estendeu os sub-itens. Padrão: não há linha no motor
  // (o padrão só vira crédito dos upgrades), então estende aqui mesmo.
  const subs: KitSubItemResult[] = padrao
    ? resolveKitSubItems(kitSubItemsOf(deps, comp, opt) ?? [], rt)
    : (result?.subItems ?? []);
  const semCusto = subs.filter((s) => s.pending).length;
  const semQtd = subs.filter((s) => s.qtd === null).length;
  const pending = semCusto > 0 || semQtd > 0;
  const credito = padrao ? kitCredit(subs).credito : 0;

  const bg = pending
    ? "bg-functional-warning-light"
    : padrao
      ? "bg-[#f4fffe]"
      : "bg-[#fbf6ff]";
  const r = !padrao && result && !pending ? result : null;

  return (
    <>
      <tr className="group/row">
        <Td sticky className={bg}>
          <div className="flex items-start gap-1.5">
            <button
              type="button"
              onClick={onToggle}
              title={expanded ? "Recolher kit" : "Expandir kit"}
              className="flex pt-px text-neutral-gray-7"
            >
              <Icon name={expanded ? "chevD" : "chevR"} size={15} />
            </button>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-[7px]">
                <span
                  className={cn(
                    "text-xs font-bold",
                    pending ? "text-tint-amber-fg" : "text-neutral-gray-11"
                  )}
                >
                  {kit.nome}
                </span>
                <span className="inline-flex items-center gap-[3px] rounded-full bg-primary-8 px-[7px] py-px text-[10px] font-bold text-white">
                  ⬡ Kit
                </span>
              </div>
              <div
                className={cn("mt-px text-[11px]", pending ? "text-[#b45309]" : "text-neutral-gray-6")}
              >
                {comp.nome} · {plural(kit.itens.length, "item", "itens")}
                {semCusto > 0 && (
                  <span className="ml-1.5 font-bold text-tint-orange-fg">
                    · {plural(semCusto, "sub-item", "sub-itens")} sem custo
                  </span>
                )}
                {semQtd > 0 && (
                  <span className="ml-1.5 font-bold text-tint-orange-fg">
                    · {plural(semQtd, "sub-item", "sub-itens")} sem quantidade
                  </span>
                )}
              </div>
            </div>
            {pending && <Icon name="warning" size={13} className="text-tint-orange-fg" />}
          </div>
        </Td>
        <Td right className={cn(bg, "text-neutral-gray-7")}>
          {/* Qtd/RT/unidade DO KIT: a qtd é o que os sub-itens de mesma
              unidade herdam; a RT incide sobre todos no débito. */}
          <QtyPopover
            qtd={baseQtd}
            rt={rt}
            unidade={baseUnidade}
            herdado={{ qtd: comp.qtd, rt: comp.rt, unidade: comp.unidade }}
            overridden={pricing.qtd != null || pricing.rt != null || pricing.unidade != null}
            comRT={!padrao}
            onSave={onSaveQtd}
          />
        </Td>
        {/* Kit não tem valor unitário editável: o custo é a soma dos
            sub-itens, cada um com seu custo base. */}
        <Td right className={cn(bg, "text-neutral-gray-7")}>
          <span title="Soma dos sub-itens — o custo é de cada material">
            {plural(kit.itens.length, "item", "itens")}
          </span>
        </Td>
        {usaDC && (
          <Td right className={bg}>
            {pending ? (
              <span className="text-neutral-gray-5">—</span>
            ) : padrao ? (
              <span className="font-semibold text-functional-success">Créd. {fmtBRL(credito)}</span>
            ) : r ? (
              <span className="font-semibold text-[#c2410c]">Déb. {fmtBRL(r.debitoTotal)}</span>
            ) : (
              "—"
            )}
          </Td>
        )}
        <Td right className={cn(bg, "text-neutral-gray-8")}>
          {r ? <span className="font-semibold">{fmtBRL(r.custoDeTroca)}</span> : "—"}
        </Td>
        {padrao
          ? cols.map((col) => (
              <Td key={col.id} right className={cn(bg, "text-neutral-gray-5")}>
                —
              </Td>
            ))
          : configCells}
        <Td className={bg} />
        <Td right className={r ? "bg-primary-1" : cn(bg, "text-neutral-gray-5")}>
          {r ? (
            <span className="text-[13px] font-extrabold text-primary-7">{fmtBRL(r.total)}</span>
          ) : (
            "—"
          )}
        </Td>
        {commentCell ?? (
          <Td right className={cn(bg, "text-neutral-gray-5")}>
            —
          </Td>
        )}
      </tr>

      {expanded &&
        subs.map((s, i) => {
          const custo = deps.custosBase[s.item.materialId];
          const semCotacao = s.pending && (custo?.custoMat ?? null) === null;
          const insumos = s.pending && !semCotacao ? linhasPendentesOf(deps.custosBase, s.item.materialId) : [];
          const primeiroInsumo = insumos[0];
          return (
            <SubRow
              key={`${opt.id}-${s.item.id}`}
              cells={kitSubRow(s, padrao ? "credito" : "debito")}
              isLast={i === subs.length - 1}
              cols={cols}
              usaDebitoCredito={usaDC}
              qtdSlot={
                <KitItemQtyPopover
                  qtd={s.qtd}
                  herdada={s.herdada}
                  herdavel={s.item.unidade === baseUnidade ? baseQtd : null}
                  rt={rt}
                  unidade={s.item.unidade}
                  comRT={!padrao}
                  tipologia={tipologia}
                  onSave={(q) => onSaveItemQtd(s.item.id, q)}
                />
              }
              actionSlot={
                semCotacao ? (
                  <CostFillPopover
                    nome={s.item.nome}
                    inicial={{ mat: custo?.custoMat ?? null, mo: custo?.custoMO ?? 0 }}
                    onSave={(mat, mo) => onFillCost(s.item.materialId, mat, mo)}
                    onSemCusto={padrao ? () => onSemCusto(s.item.materialId) : undefined}
                  />
                ) : primeiroInsumo ? (
                  <span className="mt-0.5 block text-[10.5px] font-bold text-tint-orange-fg">
                    Insumo sem preço: {primeiroInsumo.nome}
                    {insumos.length > 1 && ` e mais ${insumos.length - 1}`}{" "}
                    <button
                      type="button"
                      onClick={onVerItens}
                      className="font-semibold text-primary-7 underline"
                    >
                      ver Itens de custo
                    </button>
                  </span>
                ) : undefined
              }
            />
          );
        })}
    </>
  );
}
