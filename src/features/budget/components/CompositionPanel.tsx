"use client";

import React from "react";

import { Button, Chip, Icon } from "@/components/ui";
import {
  useComposicaoOp,
  useSetCustoQtd,
  useUpdateComposicaoLine,
} from "@/lib/hooks/useComposicao";
import { useUpdateCostItem } from "@/lib/hooks/useCostItems";
import { cn, fmtBRL, parseBR } from "@/lib/utils";
import type { CompositionLine, CostItemRow, CustoBaseRow } from "@/shared/types/domain";
import { custoBaseTotal } from "@/shared/utils/custoBase";

import { CostField, precoToInput, QtyField, qtyToInput, TH } from "./CostField";

interface CompositionPanelProps {
  projectId: number;
  row: CustoBaseRow;
  /** Insumos da org (para a nota "usado em N materiais"). */
  costItems: CostItemRow[];
  onAddItems: () => void;
  onApply: () => void;
}

/** Rascunho por célula: "mat" (qtd do material), `qtd:<lineId>`, `preco:<lineId>`. */
type Draft = Record<string, string>;

const CELL = "px-3 py-[7px] text-[12.5px]";
const CODE = "font-mono text-[11px] text-neutral-gray-7";

/**
 * Composição do custo de UM material, no formato da planilha da construtora:
 * o próprio material (custo × quantitativo) + insumos (qtd × preço) + MO.
 *
 * Qtd e preço editam inline com o mesmo rascunho→blur das grades de custo:
 * nada é gravado enquanto o valor não muda. Qtd (coeficiente) é do catálogo —
 * vale em todos os empreendimentos; o preço do insumo é deste empreendimento.
 */
export function CompositionPanel({
  projectId,
  row,
  costItems,
  onAddItems,
  onApply,
}: CompositionPanelProps) {
  const [draft, setDraft] = React.useState<Draft>({});

  const setCustoQtd = useSetCustoQtd(projectId);
  const updateLine = useUpdateComposicaoLine(projectId);
  const updateItem = useUpdateCostItem(projectId);
  const composicao = useComposicaoOp(projectId);

  const setField = (key: string, val: string) => setDraft((p) => ({ ...p, [key]: val }));
  const clearField = (key: string) =>
    setDraft((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });

  const valOf = (key: string, stored: string): string => draft[key] ?? stored;

  // Blur sem ter digitado nada (rascunho ausente) → nenhum request.
  const commitCustoQtd = (raw: string) => {
    if (draft.mat !== undefined) {
      const n = parseBR(raw);
      if (n > 0 && n !== row.custoQtd) setCustoQtd.mutate({ baseId: row.baseId, custoQtd: n });
    }
    clearField("mat");
  };

  const commitQtd = (line: CompositionLine, raw: string) => {
    const key = `qtd:${line.id}`;
    if (draft[key] !== undefined && raw.trim() !== "") {
      const n = parseBR(raw);
      if (n >= 0 && n !== line.qtd)
        updateLine.mutate({ baseId: row.baseId, lineId: line.id, qtd: n });
    }
    clearField(key);
  };

  const commitPreco = (line: CompositionLine, raw: string) => {
    const key = `preco:${line.id}`;
    if (draft[key] !== undefined) {
      // Vazio ou 0 → pendente (null), como no custo de material.
      const n = parseBR(raw);
      const preco = n > 0 ? n : null;
      if (preco !== line.preco) updateItem.mutate({ itemId: line.itemId, patch: { preco } });
    }
    clearField(key);
  };

  const removeLine = (line: CompositionLine) =>
    composicao.mutate({ baseId: row.baseId, body: { op: "removeLine", lineId: line.id } });

  const usosOf = (itemId: number) => costItems.find((c) => c.id === itemId)?.usos ?? 0;

  const lines = React.useMemo(
    () => [...row.composicao].sort((a, b) => a.ordem - b.ordem),
    [row.composicao]
  );

  // Totais ao vivo: o rascunho digitado entra no cálculo antes do blur.
  const custoQtdEff = draft.mat !== undefined ? parseBR(draft.mat) : row.custoQtd;
  const matTotal = row.custoMat === null ? null : row.custoMat * custoQtdEff;
  const totalBase = custoBaseTotal(row);

  return (
    <div className="border-l-[3px] border-primary-4 bg-neutral-gray-2 px-5 py-3.5">
      <div className="overflow-x-auto rounded-md border border-neutral-gray-4 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-neutral-gray-4 bg-neutral-gray-2">
              <TH>Cód</TH>
              <TH>Item</TH>
              <TH right>Qtd</TH>
              <TH>Unid</TH>
              <TH right>Custo un.</TH>
              <TH right>Total</TH>
              <TH />
            </tr>
          </thead>
          <tbody>
            {/* Linha 0 — o próprio material: custo × quantitativo (quebra). */}
            <tr className="border-b border-neutral-gray-4">
              <td className={cn(CELL, CODE)}>{row.codigo || "—"}</td>
              <td className={CELL}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-neutral-gray-11">{row.nome}</span>
                  <Chip tone="teal" className="!text-[10px]">
                    material
                  </Chip>
                </div>
              </td>
              <td className="px-3 py-[5px] text-right">
                <QtyField
                  aria-label="Quantitativo do material"
                  value={valOf("mat", qtyToInput(row.custoQtd))}
                  onChange={(v) => setField("mat", v)}
                  onCommit={commitCustoQtd}
                />
              </td>
              <td className={cn(CELL, "text-neutral-gray-8")}>{row.unidade ?? "—"}</td>
              <td className={cn(CELL, "whitespace-nowrap text-right")}>
                {row.custoMat === null ? (
                  <>
                    <span className="font-bold text-tint-orange-fg">pendente</span>
                    <span className="block text-[10px] text-neutral-gray-6">
                      edite na linha acima
                    </span>
                  </>
                ) : (
                  <span className="text-neutral-gray-9">{fmtBRL(row.custoMat)}</span>
                )}
              </td>
              <td className={cn(CELL, "whitespace-nowrap text-right font-semibold text-neutral-gray-11")}>
                {matTotal === null ? "—" : fmtBRL(matTotal)}
              </td>
              <td />
            </tr>

            {/* Insumos da composição. */}
            {lines.map((line) => {
              const qtdKey = `qtd:${line.id}`;
              const precoKey = `preco:${line.id}`;
              const qtdEff = draft[qtdKey] !== undefined ? parseBR(draft[qtdKey] ?? "") : line.qtd;
              const usos = usosOf(line.itemId);
              return (
                <tr
                  key={line.id}
                  className={cn(
                    "border-b border-neutral-gray-4",
                    line.preco === null && "bg-functional-warning-light"
                  )}
                >
                  <td className={cn(CELL, CODE)}>{line.codigo ?? "—"}</td>
                  <td className={cn(CELL, "text-neutral-gray-11")}>{line.nome}</td>
                  <td className="px-3 py-[5px] text-right">
                    <QtyField
                      aria-label={`Quantitativo de ${line.nome}`}
                      value={valOf(qtdKey, qtyToInput(line.qtd))}
                      onChange={(v) => setField(qtdKey, v)}
                      onCommit={(v) => commitQtd(line, v)}
                    />
                  </td>
                  <td className={cn(CELL, "text-neutral-gray-8")}>{line.unidade}</td>
                  <td className="px-3 py-[5px] text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <CostField
                        aria-label={`Preço unitário de ${line.nome}`}
                        value={valOf(precoKey, precoToInput(line.preco))}
                        isPending={line.preco === null}
                        onChange={(v) => setField(precoKey, v)}
                        onCommit={(v) => commitPreco(line, v)}
                      />
                      {line.preco === null && (
                        <span className="text-[10px] font-bold text-tint-orange-fg">
                          aguardando preço
                        </span>
                      )}
                      {usos > 1 && (
                        <span className="whitespace-nowrap text-[10px] text-neutral-gray-6">
                          · usado em {usos} materiais
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={cn(CELL, "whitespace-nowrap text-right font-semibold text-neutral-gray-11")}>
                    {line.preco === null ? "—" : fmtBRL(qtdEff * line.preco)}
                  </td>
                  <td className="px-2 py-[5px] text-right">
                    <button
                      type="button"
                      title="Remover da composição"
                      aria-label={`Remover ${line.nome} da composição`}
                      disabled={composicao.isPending}
                      onClick={() => removeLine(line)}
                      className="flex p-1 text-neutral-gray-6 hover:text-functional-error disabled:opacity-50"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {lines.length === 0 && (
              <tr className="border-b border-neutral-gray-4">
                <td colSpan={7} className="px-3 py-3 text-center text-[11px] text-neutral-gray-6">
                  Nenhum insumo na composição — o custo é só material e mão de obra. Adicione
                  argamassa, rejunte, serviços ou frete para compor como na planilha.
                </td>
              </tr>
            )}

            {row.custoMO > 0 && (
              <tr className="border-b border-neutral-gray-4">
                <td className={cn(CELL, CODE)}>—</td>
                <td className={cn(CELL, "text-neutral-gray-11")}>Mão de obra (custo MO)</td>
                <td className={cn(CELL, "text-right text-neutral-gray-8")}>1</td>
                <td className={cn(CELL, "text-neutral-gray-8")}>{row.unidade ?? "—"}</td>
                <td className={cn(CELL, "whitespace-nowrap text-right text-neutral-gray-9")}>
                  {fmtBRL(row.custoMO)}
                </td>
                <td className={cn(CELL, "whitespace-nowrap text-right font-semibold text-neutral-gray-11")}>
                  {fmtBRL(row.custoMO)}
                </td>
                <td />
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-neutral-gray-2">
              <td
                colSpan={5}
                className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-neutral-gray-7"
              >
                Total base
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold text-neutral-gray-11">
                {totalBase > 0 ? fmtBRL(totalBase) : "—"}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Button variant="bordered" size="sm" icon="plus" onPress={onAddItems}>
          Adicionar itens
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon="copy"
          onPress={onApply}
          isDisabled={row.composicao.length === 0}
        >
          Aplicar composição em…
        </Button>
        <span className="ml-auto text-[11px] text-neutral-gray-6">
          A composição é do catálogo e vale para todos os empreendimentos; o preço dos insumos é
          deste empreendimento.
        </span>
      </div>
    </div>
  );
}
