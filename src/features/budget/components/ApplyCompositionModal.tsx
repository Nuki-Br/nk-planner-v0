"use client";

import React from "react";

import { Button, Checkbox, Icon, Input, Modal, RadioCard, RadioGroup } from "@/components/ui";
import { CategoryChip } from "@/features/catalog/components/CategoryChip";
import { useCategorias } from "@/lib/hooks/useCategorias";
import { cn, fmtNum, norm, parseBR } from "@/lib/utils";
import type { CustoBaseRow } from "@/shared/types/domain";

import { QtyField, qtyToInput, TH } from "./CostField";

export type ApplyMode = "substituir" | "mesclar";

export interface ApplyCompositionInput {
  targetBaseIds: number[];
  mode: ApplyMode;
  lines: { itemId: number; qtd: number }[];
  copiarCustoQtd: boolean;
}

export interface ApplyCompositionModalProps {
  open: boolean;
  onClose: () => void;
  /** Material cuja composição será copiada. */
  source: CustoBaseRow;
  /** Destinos possíveis (mesma categoria do source; todos quando ele não tem categoria). */
  candidates: CustoBaseRow[];
  saving: boolean;
  onApply: (input: ApplyCompositionInput) => void;
}

/**
 * Copia a composição de um material para outros (ex.: a receita de assentar
 * porcelanato vale para todos os porcelanatos). Os quantitativos podem ser
 * ajustados antes — valem para todos os destinos escolhidos.
 */
export function ApplyCompositionModal({
  open,
  onClose,
  source,
  candidates,
  saving,
  onApply,
}: ApplyCompositionModalProps) {
  const { data: categorias = [] } = useCategorias();

  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [search, setSearch] = React.useState("");
  const [qtds, setQtds] = React.useState<Record<number, string>>({});
  const [mode, setMode] = React.useState<ApplyMode>("substituir");
  const [copiarCustoQtd, setCopiarCustoQtd] = React.useState(true);

  const lines = React.useMemo(
    () => [...source.composicao].sort((a, b) => a.ordem - b.ordem),
    [source.composicao]
  );

  React.useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch("");
    setQtds({});
    setMode("substituir");
    setCopiarCustoQtd(true);
  }, [open, source.baseId]);

  const q = norm(search.trim());
  const filtered = React.useMemo(
    () =>
      q === ""
        ? candidates
        : candidates.filter(
            (c) =>
              norm(c.nome).includes(q) ||
              norm(c.fabricante).includes(q) ||
              norm(c.codigo).includes(q)
          ),
    [candidates, q]
  );

  const toggle = (baseId: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(baseId)) next.delete(baseId);
      else next.add(baseId);
      return next;
    });
  const selectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of filtered) next.add(c.baseId);
      return next;
    });
  const clearAll = () => setSelected(new Set());

  const qtdValue = (lineId: number, stored: number) => qtds[lineId] ?? qtyToInput(stored);
  /** Vazio/zero no blur volta ao quantitativo original. */
  const commitQtd = (lineId: number, raw: string) => {
    if (raw.trim() === "" || parseBR(raw) <= 0)
      setQtds((p) => {
        const next = { ...p };
        delete next[lineId];
        return next;
      });
  };

  const n = selected.size;
  const semCategoria = source.categoria === "";

  const handleApply = () => {
    if (n === 0) return;
    onApply({
      targetBaseIds: [...selected],
      mode,
      lines: lines.map((l) => {
        const typed = qtds[l.id];
        const qtd = typed !== undefined ? parseBR(typed) : l.qtd;
        return { itemId: l.itemId, qtd: qtd > 0 ? qtd : l.qtd };
      }),
      copiarCustoQtd,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Aplicar composição de ${source.nome}`}
      width={760}
      actions={
        <>
          <Button variant="bordered" onPress={onClose} isDisabled={saving}>
            Cancelar
          </Button>
          <Button variant="teal" onPress={handleApply} isDisabled={n === 0} isLoading={saving}>
            {n === 0 ? "Aplicar" : `Aplicar em ${n} ${n === 1 ? "material" : "materiais"}`}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Esquerda: destinos */}
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[13px] font-bold text-neutral-gray-9">Aplicar em</p>
          {semCategoria && (
            <p className="flex items-start gap-1.5 text-[11px] text-neutral-gray-7">
              <Icon name="info" size={12} className="mt-px shrink-0" />
              Material sem categoria: mostrando todos os materiais
            </p>
          )}
          <Input
            small
            value={search}
            onValueChange={setSearch}
            aria-label="Buscar material de destino"
            placeholder="Buscar material..."
            radius="sm"
            isClearable
            onClear={() => setSearch("")}
            startContent={<Icon name="search" size={13} className="text-neutral-gray-6" />}
            classNames={{
              inputWrapper: "!border-small h-9 border-neutral-gray-5 bg-white",
              input: "text-[12.5px]",
            }}
          />
          <div className="flex items-center gap-3 text-[11px] font-semibold">
            <button
              type="button"
              onClick={selectAll}
              disabled={filtered.length === 0}
              className="text-primary-7 hover:underline disabled:opacity-50"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={n === 0}
              className="text-neutral-gray-7 hover:underline disabled:opacity-50"
            >
              Limpar
            </button>
            <span className="ml-auto font-medium text-neutral-gray-6">
              {n} de {candidates.length}
            </span>
          </div>
          <div className="max-h-[320px] overflow-y-auto rounded-lg border border-neutral-gray-4">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-neutral-gray-6">
                {candidates.length === 0
                  ? "Nenhum outro material nesta categoria."
                  : "Nenhum material encontrado."}
              </p>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.baseId}
                  className={cn(
                    "border-b border-neutral-gray-4 px-2.5 py-1.5 last:border-b-0",
                    selected.has(c.baseId) && "bg-primary-1/60"
                  )}
                >
                  <Checkbox
                    size="sm"
                    isSelected={selected.has(c.baseId)}
                    onValueChange={() => toggle(c.baseId)}
                    classNames={{ base: "max-w-full", label: "min-w-0" }}
                  >
                    <span className="block truncate text-[12.5px] font-semibold text-neutral-gray-11">
                      {c.nome}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-gray-6">
                      {c.fabricante || "sem fabricante"}
                      {semCategoria && <CategoryChip nome={c.categoria} categorias={categorias} />}
                      {c.composicao.length > 0 && (
                        <span className="text-neutral-gray-6">
                          · já tem {c.composicao.length}{" "}
                          {c.composicao.length === 1 ? "item" : "itens"}
                        </span>
                      )}
                    </span>
                  </Checkbox>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Direita: prévia + modo */}
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-[13px] font-bold text-neutral-gray-9">Composição a aplicar</p>
          <div className="overflow-hidden rounded-lg border border-neutral-gray-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-neutral-gray-4 bg-neutral-gray-2">
                  <TH>Cód</TH>
                  <TH>Item</TH>
                  <TH right>Qtd</TH>
                  <TH>Unid</TH>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-neutral-gray-4 last:border-b-0">
                    <td className="px-3 py-[5px] font-mono text-[11px] text-neutral-gray-7">
                      {l.codigo ?? "—"}
                    </td>
                    <td className="px-3 py-[5px] text-[12px] text-neutral-gray-11">{l.nome}</td>
                    <td className="px-2 py-[5px] text-right">
                      <QtyField
                        aria-label={`Quantitativo de ${l.nome}`}
                        value={qtdValue(l.id, l.qtd)}
                        className="w-[80px]"
                        onChange={(v) => setQtds((p) => ({ ...p, [l.id]: v }))}
                        onCommit={(v) => commitQtd(l.id, v)}
                      />
                    </td>
                    <td className="px-3 py-[5px] text-[12px] text-neutral-gray-8">{l.unidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-neutral-gray-6">
            Os quantitativos acima valem para todos os destinos escolhidos.
          </p>

          <RadioGroup
            aria-label="Modo de aplicação"
            value={mode}
            onValueChange={(v) => setMode(v === "mesclar" ? "mesclar" : "substituir")}
            classNames={{ wrapper: "gap-2" }}
          >
            <RadioCard
              value="substituir"
              maxWidth={520}
              description="Apaga o que os destinos já tinham e grava esta composição."
            >
              Substituir a composição dos destinos
            </RadioCard>
            <RadioCard
              value="mesclar"
              maxWidth={520}
              description="Mantém os outros itens dos destinos; os repetidos recebem estes quantitativos."
            >
              Mesclar com a composição existente (atualiza quantitativos)
            </RadioCard>
          </RadioGroup>

          <Checkbox
            size="sm"
            isSelected={copiarCustoQtd}
            onValueChange={setCopiarCustoQtd}
            classNames={{ label: "text-[12.5px] text-neutral-gray-9" }}
          >
            Copiar quantitativo do material (× {fmtNum(source.custoQtd, 4)})
          </Checkbox>

          <p className="flex items-start gap-1.5 rounded-lg bg-neutral-gray-2 px-3 py-2 text-[11px] leading-snug text-neutral-gray-7">
            <Icon name="warning" size={12} className="mt-px shrink-0 text-tint-orange-fg" />
            A composição é do catálogo: vale em todos os empreendimentos que usam estes materiais.
          </p>
        </div>
      </div>
    </Modal>
  );
}
