"use client";

import React from "react";

import { Button, Icon, Modal } from "@/components/ui";
import { useUpdateMetragens } from "@/lib/hooks/useTipologiaMutations";
import { cn, fmtNum } from "@/lib/utils";
import type { Tipologia } from "@/shared/types/domain";

import {
  applyPaste,
  fmtInput,
  initialDraft,
  metragemChanges,
  metragemGroups,
  rowState,
  type MetragemCol,
  type MetragemDraft,
  type MetragemRow,
} from "../../metragens";

interface EditMetragensModalProps {
  tip: Tipologia;
  onClose: () => void;
}

const COLS = 6;

function Th({ children, right = false }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "sticky top-0 z-[2] whitespace-nowrap border-b-2 border-neutral-gray-4 bg-neutral-gray-2 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-gray-7",
        right ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

function NumInput({
  value,
  changed,
  invalid,
  label,
  inputRef,
  onChange,
  onKeyDown,
  onPaste,
}: {
  value: string;
  changed: boolean;
  invalid: boolean;
  label: string;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      ref={inputRef}
      value={value}
      inputMode="decimal"
      aria-label={label}
      aria-invalid={invalid}
      title={invalid ? "Valor inválido — use um número maior ou igual a zero" : undefined}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      className={cn(
        "h-[30px] w-[96px] rounded-md border px-2 text-right text-xs outline-none transition-colors focus:border-primary-7 focus:ring-2 focus:ring-primary-2",
        invalid
          ? "border-functional-error bg-functional-error-light font-bold text-functional-error"
          : changed
            ? "border-primary-6 bg-primary-1 font-bold text-primary-8"
            : "border-neutral-gray-5 bg-white text-neutral-gray-11"
      )}
    />
  );
}

/**
 * "Editar metragens": quantidade e RT de TODOS os componentes da tipologia numa
 * tabela por ambiente (mesma leitura do Construtor de Preço), gravados num
 * request só. Montada ao abrir: o rascunho nasce da árvore naquele momento e um
 * refetch no meio da edição não apaga o que foi digitado.
 *
 * Para ser rápido: Enter/↓ desce para a próxima linha (Shift+Enter/↑ sobe) e
 * colar uma coluna do Excel preenche várias linhas a partir da célula focada.
 */
export function EditMetragensModal({ tip, onClose }: EditMetragensModalProps) {
  const groups = React.useMemo(() => metragemGroups(tip), [tip]);
  const rows = React.useMemo(() => groups.flatMap((g) => g.rows), [groups]);
  const [draft, setDraft] = React.useState<MetragemDraft>(() => initialDraft(groups));
  const [pasteMsg, setPasteMsg] = React.useState("");
  const inputs = React.useRef(new Map<string, HTMLInputElement>());
  const update = useUpdateMetragens();

  const { itens, invalidas } = metragemChanges(groups, draft);
  const rowIndex = React.useMemo(() => new Map(rows.map((r, i) => [r.key, i])), [rows]);

  const setCell = (key: string, col: MetragemCol, v: string) =>
    setDraft((d) => {
      const cur = d[key] ?? { qtd: "", rt: "" };
      return { ...d, [key]: { ...cur, [col]: v } };
    });

  const revertRow = (r: MetragemRow) =>
    setDraft((d) => ({ ...d, [r.key]: { qtd: fmtInput(r.qtd), rt: fmtInput(r.rt) } }));

  const focusCell = (idx: number, col: MetragemCol) => {
    const r = rows[idx];
    if (!r) return;
    inputs.current.get(`${r.key}|${col}`)?.focus();
  };

  const onKeyDown = (r: MetragemRow, col: MetragemCol) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    const i = rowIndex.get(r.key) ?? 0;
    if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const up = e.key === "ArrowUp" || (e.key === "Enter" && e.shiftKey);
      focusCell(up ? i - 1 : i + 1, col);
    }
  };

  const onPaste = (r: MetragemRow, col: MetragemCol) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const res = applyPaste(rows, draft, r.key, col, e.clipboardData.getData("text"));
    if (!res) return; // uma célula só: colar normal do input
    e.preventDefault();
    setDraft(res.draft);
    setPasteMsg(
      res.linhas === 1 ? "1 linha preenchida pelo colar" : `${res.linhas} linhas preenchidas pelo colar`
    );
  };

  const save = () => {
    if (itens.length === 0 || invalidas > 0) return;
    update.mutate({ tipologiaId: tip.id, itens }, { onSuccess: onClose });
  };

  const resumo =
    invalidas > 0
      ? `${invalidas} ${invalidas === 1 ? "valor inválido" : "valores inválidos"}`
      : itens.length === 0
        ? pasteMsg || "Nenhuma alteração"
        : `${itens.length} ${itens.length === 1 ? "componente alterado" : "componentes alterados"}`;

  return (
    <Modal
      open
      onClose={onClose}
      width={760}
      title={
        <div className="pr-6">
          <p className="text-medium font-bold text-neutral-gray-11">Editar metragens</p>
          <p className="mt-0.5 text-[11px] font-normal text-neutral-gray-6">{tip.nome}</p>
        </div>
      }
      actions={
        <>
          <span
            className={cn(
              "mr-auto self-center text-xs",
              invalidas > 0 ? "font-bold text-functional-error" : "text-neutral-gray-7"
            )}
          >
            {resumo}
          </span>
          <Button variant="bordered" onPress={onClose} isDisabled={update.isPending}>
            Cancelar
          </Button>
          <Button
            icon="check"
            onPress={save}
            isLoading={update.isPending}
            isDisabled={itens.length === 0 || invalidas > 0}
          >
            Salvar metragens
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs leading-relaxed text-neutral-gray-7">
          Quantidade líquida e reserva técnica de cada componente nesta tipologia — em ambientes
          compartilhados, as outras tipologias mantêm as delas. <strong>Enter</strong> desce para a
          próxima linha; cole uma coluna do Excel para preencher várias de uma vez.
        </p>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-gray-5 px-4 py-6 text-center text-xs text-neutral-gray-7">
            Esta tipologia ainda não tem componentes.
          </p>
        ) : (
          <table className="w-full border-collapse border border-neutral-gray-4">
            <thead>
              <tr>
                <Th>Componente</Th>
                <Th>Un.</Th>
                <Th right>Quantidade</Th>
                <Th right>RT (%)</Th>
                <Th right>Qtd c/ RT</Th>
                <Th />
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g.ambienteId}>
                <tr>
                  <td
                    colSpan={COLS}
                    className="bg-neutral-gray-11 px-3.5 py-[7px] text-[11px] font-bold uppercase tracking-[0.08em] text-white"
                  >
                    {g.nome}
                    <span className="ml-1.5 font-semibold normal-case tracking-normal text-white/60">
                      · {g.rows.length} {g.rows.length === 1 ? "componente" : "componentes"}
                    </span>
                  </td>
                </tr>
                {g.rows.length === 0 && (
                  <tr>
                    <td colSpan={COLS} className="px-3.5 py-3 text-center text-[11.5px] text-neutral-gray-6">
                      Nenhum componente neste ambiente
                    </td>
                  </tr>
                )}
                {g.rows.map((r) => {
                  const cell = draft[r.key];
                  const s = rowState(r, cell);
                  const changed = s.qtdChanged || s.rtChanged;
                  const comRT = s.qtd !== null && s.rt !== null ? s.qtd * (1 + s.rt / 100) : null;
                  return (
                    <tr key={r.key} className={changed ? "bg-[#f0faf9]" : "bg-white"}>
                      <td className="border-b border-neutral-gray-4 px-3.5 py-[7px] text-xs font-semibold text-neutral-gray-11">
                        {r.nome}
                      </td>
                      <td className="border-b border-neutral-gray-4 px-2.5 py-[7px] text-xs text-neutral-gray-7">
                        {r.unidade}
                      </td>
                      <td className="border-b border-neutral-gray-4 px-2.5 py-[5px] text-right">
                        <NumInput
                          label={`Quantidade — ${g.nome} · ${r.nome}`}
                          value={cell?.qtd ?? ""}
                          changed={s.qtdChanged}
                          invalid={s.qtd === null}
                          inputRef={(el) => {
                            if (el) inputs.current.set(`${r.key}|qtd`, el);
                            else inputs.current.delete(`${r.key}|qtd`);
                          }}
                          onChange={(v) => setCell(r.key, "qtd", v)}
                          onKeyDown={onKeyDown(r, "qtd")}
                          onPaste={onPaste(r, "qtd")}
                        />
                      </td>
                      <td className="border-b border-neutral-gray-4 px-2.5 py-[5px] text-right">
                        <NumInput
                          label={`RT — ${g.nome} · ${r.nome}`}
                          value={cell?.rt ?? ""}
                          changed={s.rtChanged}
                          invalid={s.rt === null}
                          inputRef={(el) => {
                            if (el) inputs.current.set(`${r.key}|rt`, el);
                            else inputs.current.delete(`${r.key}|rt`);
                          }}
                          onChange={(v) => setCell(r.key, "rt", v)}
                          onKeyDown={onKeyDown(r, "rt")}
                          onPaste={onPaste(r, "rt")}
                        />
                      </td>
                      <td className="border-b border-neutral-gray-4 px-2.5 py-[7px] text-right text-xs text-neutral-gray-7">
                        {comRT === null ? "—" : `${fmtNum(comRT, 2)} ${r.unidade}`}
                      </td>
                      <td className="w-9 border-b border-neutral-gray-4 px-1.5 py-[7px] text-center">
                        {changed && (
                          <button
                            type="button"
                            onClick={() => revertRow(r)}
                            title="Desfazer alteração desta linha"
                            aria-label={`Desfazer alteração — ${r.nome}`}
                            className="inline-flex rounded p-1 text-neutral-gray-6 hover:bg-neutral-gray-3 hover:text-neutral-gray-9"
                          >
                            <Icon name="undo" size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        )}

        {update.isError && (
          <div className="flex items-start gap-2 rounded-lg border border-functional-error/30 bg-functional-error-light px-3 py-2">
            <Icon name="warning" size={13} className="mt-0.5 shrink-0 text-functional-error" />
            <p className="text-[12px] text-functional-error">
              Não foi possível salvar:{" "}
              {update.error instanceof Error ? update.error.message : "erro inesperado"}. Nenhuma
              metragem foi alterada.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
