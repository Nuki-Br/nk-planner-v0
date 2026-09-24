"use client";

import React from "react";

import { Button, Chip, Icon, Modal, Select } from "@/components/ui";
import { cn, fmtBRL, norm, parseBR } from "@/lib/utils";
import { isUnidade, UNIDADE_OPTIONS, type Unidade } from "@/shared/constants/unidades";
import type { CostItemLineInput } from "@/shared/types/costItems";
import type { CostItemRow } from "@/shared/types/domain";

import { looksTabular, parseTsv, type PastedRow } from "../compositionPaste";
import { CostField, precoToInput, QtyField, TH } from "./CostField";

export interface CostItemsGridModalProps {
  open: boolean;
  onClose: () => void;
  /** Insumos da org (autocomplete + detecção de repetidos). */
  costItems: CostItemRow[];
  saving: boolean;
  /** Contexto de material: mostra a coluna Qtd (vazia = 1) e exclui itens já na composição. */
  material?: { baseId: number; nome: string; excludeItemIds: number[] } | null;
  onSubmit: (lines: CostItemLineInput[]) => void;
}

/** Uma linha da grade: aponta para um insumo existente (`itemId`) ou descreve um novo. */
export interface GridRow {
  key: string;
  itemId: number | null;
  codigo: string;
  nome: string;
  unidade: Unidade;
  /** Só no contexto de material; "" = 1. */
  qtd: string;
  /** "" = preço pendente. */
  preco: string;
}

const INITIAL_ROWS = 5;
const DEFAULT_UNIDADE: Unidade = "und";

const INPUT =
  "h-[34px] w-full rounded-md border border-neutral-gray-5 bg-white px-2 text-[12.5px] text-neutral-gray-9 outline-none placeholder:text-neutral-gray-5 focus:border-primary-7";
const INPUT_LOCKED = "border-neutral-gray-4 bg-neutral-gray-2 text-neutral-gray-8";

// ─── Validação ──────────────────────────────────────────────────────────

interface RowCheck {
  /** Linha sem nada digitado — ignorada no envio. */
  empty: boolean;
  error: string | null;
  /** Payload da linha quando válida. */
  line: CostItemLineInput | null;
}

/** Índices por código e por nome normalizados (busca exata). */
function indexItems(items: CostItemRow[]) {
  const byCodigo = new Map<string, CostItemRow>();
  const byNome = new Map<string, CostItemRow>();
  for (const it of items) {
    if (it.codigo !== null && it.codigo.trim() !== "") byCodigo.set(norm(it.codigo.trim()), it);
    byNome.set(norm(it.nome.trim()), it);
  }
  return { byCodigo, byNome };
}

function isRowEmpty(r: GridRow): boolean {
  return (
    r.itemId === null &&
    r.codigo.trim() === "" &&
    r.nome.trim() === "" &&
    r.qtd.trim() === "" &&
    r.preco.trim() === ""
  );
}

function checkRows(
  rows: GridRow[],
  costItems: CostItemRow[],
  material: CostItemsGridModalProps["material"]
): RowCheck[] {
  const { byCodigo, byNome } = indexItems(costItems);
  const excluded = new Set(material?.excludeItemIds ?? []);
  const seenItem = new Set<number>();
  const seenCod = new Set<string>();
  const seenNome = new Set<string>();

  return rows.map((r) => {
    if (isRowEmpty(r)) return { empty: true, error: null, line: null };
    const codigo = r.codigo.trim();
    const nome = r.nome.trim();
    let error: string | null = null;

    const qtdN = material ? (r.qtd.trim() === "" ? 1 : parseBR(r.qtd)) : undefined;
    const precoN = r.preco.trim() === "" ? undefined : parseBR(r.preco);
    if (material && qtdN !== undefined && qtdN < 0) error = "Quantitativo inválido.";
    else if (precoN !== undefined && precoN < 0) error = "Valor inválido.";

    let line: CostItemLineInput;
    if (r.itemId !== null) {
      if (excluded.has(r.itemId)) error ??= "Já está na composição deste material.";
      else if (seenItem.has(r.itemId)) error ??= "Item repetido na grade.";
      seenItem.add(r.itemId);
      line = { itemId: r.itemId };
    } else {
      if (nome === "") error ??= "Informe o nome do item.";
      else if (!isUnidade(r.unidade)) error ??= "Escolha a unidade de medida.";
      else {
        const existing =
          (codigo !== "" ? byCodigo.get(norm(codigo)) : undefined) ?? byNome.get(norm(nome));
        if (existing) {
          error ??= excluded.has(existing.id)
            ? "Já está na composição deste material."
            : `Já existe no cadastro (${existing.nome}) — selecione-o na lista.`;
        } else if ((codigo !== "" && seenCod.has(norm(codigo))) || seenNome.has(norm(nome))) {
          error ??= "Item repetido na grade.";
        }
      }
      if (codigo !== "") seenCod.add(norm(codigo));
      if (nome !== "") seenNome.add(norm(nome));
      line = { novo: { codigo: codigo === "" ? null : codigo, nome, unidade: r.unidade } };
    }
    // Vazio = não mexe no preço (novo nasce pendente); 0 = volta a pendente.
    if (precoN !== undefined) line.preco = precoN > 0 ? precoN : null;
    if (material && qtdN !== undefined) line.qtd = qtdN;
    return { empty: false, error, line: error ? null : line };
  });
}

// ─── Autocomplete de célula (Cód / Nome) ────────────────────────────────

interface CellAutocompleteProps {
  value: string;
  candidates: CostItemRow[];
  placeholder: string;
  "aria-label": string;
  autoFocus?: boolean;
  onChange: (v: string) => void;
  onPick: (item: CostItemRow) => void;
  /** Blur — o chamador pode vincular por código exato. */
  onBlur: (v: string) => void;
}

const MAX_SUGGESTIONS = 8;

/**
 * Input com lista de sugestões abaixo (insumos existentes). Feito em casa:
 * o Autocomplete do HeroUI dentro do Modal briga pelo foco e quebra o Tab
 * entre as células. Setas navegam, Enter escolhe, Esc fecha, Tab segue.
 */
function CellAutocomplete({
  value,
  candidates,
  placeholder,
  "aria-label": ariaLabel,
  autoFocus,
  onChange,
  onPick,
  onBlur,
}: CellAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [hi, setHi] = React.useState(0);
  const listId = React.useId();

  const q = norm(value.trim());
  const matches = React.useMemo(
    () =>
      q === ""
        ? []
        : candidates
            .filter(
              (c) => norm(c.nome).includes(q) || (c.codigo !== null && norm(c.codigo).includes(q))
            )
            .slice(0, MAX_SUGGESTIONS),
    [candidates, q]
  );
  const showList = open && matches.length > 0;

  const pick = (item: CostItemRow) => {
    onPick(item);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showList}
        autoComplete="off"
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          setOpen(false);
          onBlur(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => Math.min(h + 1, Math.max(matches.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            const item = showList ? matches[hi] : undefined;
            if (item) {
              e.preventDefault();
              pick(item);
            }
          } else if (e.key === "Escape" && showList) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className={INPUT}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-[calc(100%+3px)] z-50 max-h-[220px] w-[340px] overflow-y-auto rounded-lg border border-neutral-gray-4 bg-white p-1 shadow-[0_8px_28px_rgba(0,0,0,0.12)]"
        >
          {matches.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === hi}
              // preventDefault no mousedown: o input não perde o foco antes do clique.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHi(i)}
              onClick={() => pick(c)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12px]",
                i === hi ? "bg-primary-1 text-primary-8" : "text-neutral-gray-9"
              )}
            >
              <code className="w-[52px] shrink-0 truncate text-[10.5px] text-neutral-gray-6">
                {c.codigo ?? "—"}
              </code>
              <span className="min-w-0 flex-1 truncate font-medium">{c.nome}</span>
              <span className="shrink-0 text-[10.5px] text-neutral-gray-6">
                {c.unidade} · {c.preco === null ? "pendente" : fmtBRL(c.preco)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────

/**
 * Grade "adicionar vários de uma vez" (Cód · Nome · Unidade · Qtd · Valor),
 * no molde da planilha da construtora. Cada linha ou aponta para um insumo
 * existente (escolhido no autocomplete, ou colado com o mesmo código/nome) ou
 * descreve um novo. Colar do Excel preenche várias linhas.
 */
export function CostItemsGridModal({
  open,
  onClose,
  costItems,
  saving,
  material = null,
  onSubmit,
}: CostItemsGridModalProps) {
  const seq = React.useRef(0);
  const newRow = React.useCallback(
    (): GridRow => ({
      key: `r${++seq.current}`,
      itemId: null,
      codigo: "",
      nome: "",
      unidade: DEFAULT_UNIDADE,
      qtd: "",
      preco: "",
    }),
    []
  );

  const [rows, setRows] = React.useState<GridRow[]>([]);
  // Erros só aparecem depois da primeira tentativa de enviar.
  const [tried, setTried] = React.useState(false);
  // Linha com foco — destino do colar.
  const [focusedRow, setFocusedRow] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setRows(Array.from({ length: INITIAL_ROWS }, () => newRow()));
    setTried(false);
    setFocusedRow(null);
  }, [open, newRow]);

  const comQtd = material !== null;
  const excluded = React.useMemo(
    () => new Set(material?.excludeItemIds ?? []),
    [material?.excludeItemIds]
  );
  const picked = React.useMemo(
    () => new Set(rows.flatMap((r) => (r.itemId === null ? [] : [r.itemId]))),
    [rows]
  );
  // Sugestões: insumos que não estão na composição nem em outra linha.
  const available = React.useMemo(
    () => costItems.filter((c) => !excluded.has(c.id) && !picked.has(c.id)),
    [costItems, excluded, picked]
  );

  const patchRow = (i: number, patch: Partial<GridRow>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const linkRow = (i: number, item: CostItemRow) =>
    setRows((prev) =>
      prev.map((r, j) =>
        j === i
          ? {
              ...r,
              itemId: item.id,
              codigo: item.codigo ?? "",
              nome: item.nome,
              unidade: item.unidade,
              // Preço do empreendimento já cadastrado — o usuário pode sobrescrever.
              preco: r.preco.trim() !== "" ? r.preco : precoToInput(item.preco),
            }
          : r
      )
    );

  /** "x" do chip "existente": desvincula e limpa a identidade (mantém a qtd). */
  const unlinkRow = (i: number) =>
    patchRow(i, { itemId: null, codigo: "", nome: "", unidade: DEFAULT_UNIDADE, preco: "" });

  // Código digitado igual ao de um insumo existente vincula no blur (não a
  // cada tecla: "6" travaria a linha antes de o usuário terminar "6495").
  const linkByCodigo = (i: number, raw: string) => {
    const q = norm(raw.trim());
    if (q === "") return;
    const item = available.find((c) => c.codigo !== null && norm(c.codigo.trim()) === q);
    if (item) linkRow(i, item);
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (i: number) =>
    setRows((prev) => {
      const next = prev.filter((_, j) => j !== i);
      return next.length === 0 ? [newRow()] : next;
    });

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!looksTabular(text)) return;
    const pasted = parseTsv(text, { comQtd });
    if (pasted.length === 0) return;
    e.preventDefault();
    const { byCodigo, byNome } = indexItems(costItems);
    setRows((prev) => {
      const firstEmpty = prev.findIndex(isRowEmpty);
      // Linha focada pode ter sido removida depois do foco: nunca além do fim.
      const start = Math.min(
        focusedRow ?? (firstEmpty === -1 ? prev.length : firstEmpty),
        prev.length
      );
      const next = [...prev];
      // Insumos já vinculados fora da faixa sobrescrita continuam ocupados.
      const used = new Set(
        next.flatMap((r, j) =>
          r.itemId !== null && (j < start || j >= start + pasted.length) ? [r.itemId] : []
        )
      );
      pasted.forEach((p: PastedRow, k) => {
        const idx = start + k;
        const base = next[idx] ?? newRow();
        const found =
          (p.codigo !== "" ? byCodigo.get(norm(p.codigo)) : undefined) ?? byNome.get(norm(p.nome));
        const qtd = comQtd && p.qtd !== null ? String(p.qtd) : "";
        const precoPasted = p.preco !== null ? String(p.preco) : "";
        if (found && !excluded.has(found.id) && !used.has(found.id)) {
          used.add(found.id);
          next[idx] = {
            ...base,
            itemId: found.id,
            codigo: found.codigo ?? "",
            nome: found.nome,
            unidade: found.unidade,
            qtd,
            preco: precoPasted !== "" ? precoPasted : precoToInput(found.preco),
          };
        } else {
          next[idx] = {
            ...base,
            itemId: null,
            codigo: p.codigo,
            nome: p.nome,
            unidade: p.unidade ?? base.unidade,
            qtd,
            preco: precoPasted,
          };
        }
      });
      return next;
    });
  };

  const checks = React.useMemo(() => checkRows(rows, costItems, material), [rows, costItems, material]);
  const validLines = React.useMemo(
    () => checks.flatMap((c) => (c.line ? [c.line] : [])),
    [checks]
  );
  const hasErrors = checks.some((c) => c.error !== null);
  const n = validLines.length;

  const handleSubmit = () => {
    if (hasErrors) {
      setTried(true);
      return;
    }
    if (n === 0) return;
    onSubmit(validLines);
  };

  const title = material ? `Adicionar itens de custo — ${material.nome}` : "Adicionar itens de custo";
  const colCount = comQtd ? 6 : 5;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={860}
      actions={
        <>
          <Button variant="bordered" onPress={onClose} isDisabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="teal"
            onPress={handleSubmit}
            isDisabled={n === 0 && !hasErrors}
            isLoading={saving}
          >
            {n === 0 ? "Adicionar itens" : `Adicionar ${n} ${n === 1 ? "item" : "itens"}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-neutral-gray-7">
          {material
            ? "Insumos que entram no custo deste material (argamassa, rejunte, serviço, frete…). Escolha um existente ou descreva um novo em cada linha."
            : "Código, nome e unidade valem para toda a organização; o valor é o preço neste empreendimento."}
        </p>

        <div onPaste={handlePaste} className="rounded-lg border border-neutral-gray-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-neutral-gray-4 bg-neutral-gray-2">
                <TH className="w-[120px]">Cód</TH>
                <TH>Nome</TH>
                <TH className="w-[156px]">Unidade de medida</TH>
                {comQtd && (
                  <TH right className="w-[104px]">
                    Quantitativo
                  </TH>
                )}
                <TH right className="w-[134px]">
                  Valor
                </TH>
                <TH className="w-[36px]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const check = checks[i];
                const linked = r.itemId !== null;
                const showError = tried && check !== undefined && check.error !== null;
                return (
                  <React.Fragment key={r.key}>
                    <tr
                      onFocus={() => setFocusedRow(i)}
                      className={cn(
                        "border-b border-neutral-gray-4",
                        showError ? "bg-functional-error-light" : linked ? "bg-neutral-gray-2" : "bg-white"
                      )}
                    >
                      <td className="px-2 py-1.5 align-top">
                        {linked ? (
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={r.codigo}
                            aria-label={`Código da linha ${i + 1}`}
                            placeholder="—"
                            className={cn(INPUT, INPUT_LOCKED, "font-mono text-[11.5px]")}
                          />
                        ) : (
                          <CellAutocomplete
                            value={r.codigo}
                            candidates={available}
                            placeholder="Cód"
                            aria-label={`Código da linha ${i + 1}`}
                            autoFocus={i === 0}
                            onChange={(v) => patchRow(i, { codigo: v })}
                            onPick={(item) => linkRow(i, item)}
                            onBlur={(v) => linkByCodigo(i, v)}
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        {linked ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              readOnly
                              tabIndex={-1}
                              value={r.nome}
                              aria-label={`Nome da linha ${i + 1}`}
                              className={cn(INPUT, INPUT_LOCKED)}
                            />
                            <Chip tone="teal" className="shrink-0 !text-[10px]">
                              existente
                            </Chip>
                            <button
                              type="button"
                              title="Desvincular e limpar a linha"
                              aria-label={`Desvincular a linha ${i + 1}`}
                              onClick={() => unlinkRow(i)}
                              className="flex shrink-0 p-1 text-neutral-gray-6 hover:text-neutral-gray-9"
                            >
                              <Icon name="close" size={13} />
                            </button>
                          </div>
                        ) : (
                          <CellAutocomplete
                            value={r.nome}
                            candidates={available}
                            placeholder="Nome do item"
                            aria-label={`Nome da linha ${i + 1}`}
                            onChange={(v) => patchRow(i, { nome: v })}
                            onPick={(item) => linkRow(i, item)}
                            onBlur={() => undefined}
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <Select
                          aria-label={`Unidade da linha ${i + 1}`}
                          options={UNIDADE_OPTIONS}
                          value={r.unidade}
                          // Guarda contra deseleção (HeroUI emite "" ao limpar).
                          onValueChange={(v) => {
                            if (isUnidade(v)) patchRow(i, { unidade: v });
                          }}
                          small
                          isDisabled={linked}
                          classNames={{ trigger: "h-[34px] min-h-[34px] bg-white" }}
                        />
                      </td>
                      {comQtd && (
                        <td className="px-2 py-1.5 text-right align-top">
                          <QtyField
                            aria-label={`Quantitativo da linha ${i + 1}`}
                            value={r.qtd}
                            placeholder="1"
                            className="w-full"
                            onChange={(v) => patchRow(i, { qtd: v })}
                          />
                        </td>
                      )}
                      <td className="px-2 py-1.5 text-right align-top">
                        <CostField
                          aria-label={`Valor da linha ${i + 1}`}
                          value={r.preco}
                          isPending={false}
                          className="w-full"
                          onChange={(v) => patchRow(i, { preco: v })}
                        />
                      </td>
                      <td className="px-1 py-1.5 text-center align-top">
                        <button
                          type="button"
                          title="Remover linha"
                          aria-label={`Remover a linha ${i + 1}`}
                          onClick={() => removeRow(i)}
                          className="mt-[9px] flex p-1 text-neutral-gray-5 hover:text-functional-error"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </td>
                    </tr>
                    {showError && (
                      <tr className="border-b border-neutral-gray-4 bg-functional-error-light">
                        <td colSpan={colCount} className="px-3 pb-1.5 text-[11px] font-semibold text-functional-error">
                          {check.error}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <Button variant="ghost" size="sm" icon="plus" onPress={addRow}>
              Linha
            </Button>
            <span className="text-[11px] text-neutral-gray-6">
              {comQtd
                ? "Cole linhas do Excel (Cód, Nome, Unidade, Qtd, Valor) para preencher várias de uma vez."
                : "Cole linhas do Excel (Cód, Nome, Unidade, Valor) para preencher várias de uma vez."}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
