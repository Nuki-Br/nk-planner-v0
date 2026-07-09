"use client";

import React from "react";

import { Button, Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { BudgetColumn, ColumnKind } from "@/shared/types/domain";

const KIND_OPTS: { value: ColumnKind; label: string; desc: string }[] = [
  { value: "free", label: "Coluna livre", desc: "Valor fixo ou fórmula por célula" },
  { value: "rowTotal", label: "Total da linha", desc: "Soma as colunas livres da linha" },
  { value: "rowAvg", label: "Média da linha", desc: "Média das colunas livres da linha" },
];
const KIND_DEFAULT_NAME: Record<ColumnKind, string> = {
  rowTotal: "Total da linha",
  rowAvg: "Média da linha",
  free: "",
};

interface ColHeaderCellProps {
  col: BudgetColumn;
  onRename: (id: string, nome: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDrop: (id: string) => void;
  isDragTarget: boolean;
}

// Header de coluna configurável: renomear (duplo-clique), excluir (× no
// hover, com confirmação) e reordenar por drag nativo — dnd-kit aplica
// transform no <th> e quebra o layout da tabela, então o HTML5 DnD do
// protótipo é a escolha aqui.
export function ColHeaderCell({
  col,
  onRename,
  onDelete,
  onDragStart,
  onDragEnter,
  onDrop,
  isDragTarget,
}: ColHeaderCellProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(col.nome);
  const [hover, setHover] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const inRef = React.useRef<HTMLInputElement>(null);
  const special = col.kind === "rowTotal" || col.kind === "rowAvg";

  React.useEffect(() => {
    if (editing) {
      inRef.current?.focus();
      inRef.current?.select();
    }
  }, [editing]);
  React.useEffect(() => {
    setDraft(col.nome);
  }, [col.nome]);

  const commit = () => {
    onRename(col.id, draft.trim() || col.nome);
    setEditing(false);
  };

  return (
    <th
      draggable={!editing}
      onDragStart={(e) => {
        if (editing) return;
        e.dataTransfer.effectAllowed = "move";
        onDragStart(col.id);
      }}
      onDragEnter={() => onDragEnter(col.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(col.id);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setConfirm(false);
      }}
      style={{ boxShadow: isDragTarget ? "inset 3px 0 0 #047676" : "none" }}
      className={cn(
        "relative whitespace-nowrap border-b-2 border-neutral-gray-4 bg-primary-1 px-2.5 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-primary-7",
        editing ? "cursor-text" : "cursor-grab"
      )}
    >
      {editing ? (
        <input
          ref={inRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setDraft(col.nome);
              setEditing(false);
            }
          }}
          className="w-[110px] rounded border-2 border-primary-7 bg-white px-[5px] py-0.5 text-right text-[11px] font-bold normal-case tracking-normal text-primary-8 outline-none"
        />
      ) : (
        <div
          onDoubleClick={() => setEditing(true)}
          title="Duplo-clique para renomear · arraste para reordenar"
          className="flex items-center justify-end gap-1"
          style={{ paddingRight: hover ? 14 : 0 }}
        >
          {special && (
            <span className="text-[13px] font-extrabold italic leading-none" style={{ fontFamily: "Georgia, serif" }}>
              ƒ
            </span>
          )}
          <span>{col.nome || "(sem nome)"}</span>
        </div>
      )}

      {hover && !editing && !confirm && (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          title="Remover coluna"
          className="absolute right-[3px] top-[3px] flex h-[15px] w-[15px] items-center justify-center rounded bg-primary-7/10 p-0 text-[11px] text-primary-7"
        >
          ×
        </button>
      )}

      {confirm && (
        <div className="absolute right-0 top-full z-[70] mt-1 flex w-[150px] flex-col gap-[7px] rounded-lg bg-neutral-gray-11 p-2.5 normal-case tracking-normal text-white shadow-[0_6px_18px_rgba(0,0,0,0.22)]">
          <span className="text-[11.5px] font-semibold">Remover coluna?</span>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="rounded-[5px] border border-white/35 px-2 py-[3px] text-[11px]"
            >
              Não
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirm(false);
                onDelete(col.id);
              }}
              className="rounded-[5px] bg-functional-error px-2 py-[3px] text-[11px] font-bold"
            >
              Remover
            </button>
          </div>
        </div>
      )}
    </th>
  );
}

/** Popover "Nova coluna" (nome + tipo free/rowTotal/rowAvg). */
export function AddColumnPopover({
  onAdd,
  onClose,
}: {
  onAdd: (input: { nome: string; kind: ColumnKind }) => void;
  onClose: () => void;
}) {
  const [nome, setNome] = React.useState("");
  const [kind, setKind] = React.useState<ColumnKind>("free");
  const [touched, setTouched] = React.useState(false);
  const inRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inRef.current?.focus();
  }, []);

  const chooseKind = (k: ColumnKind) => {
    setKind(k);
    if (!touched) setNome(KIND_DEFAULT_NAME[k]);
  };

  const submit = () => {
    const finalName = nome.trim() || KIND_DEFAULT_NAME[kind] || "Nova coluna";
    onAdd({ nome: finalName, kind });
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[80]" />
      <div className="absolute right-0 top-full z-[90] mt-1.5 w-[268px] rounded-xl border border-neutral-gray-5 bg-white p-4 text-left normal-case tracking-normal shadow-[0_12px_36px_rgba(0,0,0,0.18)]">
        <div className="mb-3 text-[13px] font-bold text-neutral-gray-11">Nova coluna</div>

        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-gray-7">
          Nome
        </label>
        <input
          ref={inRef}
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setTouched(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onClose();
          }}
          placeholder="Ex: Taxa Construtora"
          className="mb-3.5 mt-1 w-full rounded-lg border border-neutral-gray-5 px-2.5 py-2 text-[13px] text-neutral-gray-11 outline-none focus:border-primary-7"
        />

        <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-gray-7">
          Tipo
        </label>
        <div className="mb-4 mt-1.5 flex flex-col gap-1.5">
          {KIND_OPTS.map((o) => {
            const sel = kind === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => chooseKind(o.value)}
                className={cn(
                  "flex items-start gap-[9px] rounded-lg border px-2.5 py-2 text-left",
                  sel ? "border-primary-7 bg-primary-1" : "border-neutral-gray-5 bg-white"
                )}
              >
                <span
                  className={cn(
                    "mt-px flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-2 bg-white",
                    sel ? "border-primary-7" : "border-neutral-gray-5"
                  )}
                >
                  {sel && <span className="h-[7px] w-[7px] rounded-full bg-primary-7" />}
                </span>
                <span>
                  <span className="flex items-center gap-1 text-[12.5px] font-semibold text-neutral-gray-11">
                    {o.value !== "free" && (
                      <span
                        className="font-extrabold italic text-primary-7"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        ƒ
                      </span>
                    )}
                    {o.label}
                  </span>
                  <span className="mt-px block text-[11px] text-neutral-gray-6">{o.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="bordered" size="sm" onPress={onClose}>
            Cancelar
          </Button>
          <Button size="sm" icon="plus" onPress={submit}>
            Adicionar
          </Button>
        </div>
      </div>
    </>
  );
}

export function AddColumnTh({
  showAdd,
  setShowAdd,
  onAdd,
}: {
  showAdd: boolean;
  setShowAdd: (fn: (s: boolean) => boolean) => void;
  onAdd: (input: { nome: string; kind: ColumnKind }) => void;
}) {
  return (
    <th className="relative w-11 border-b-2 border-neutral-gray-4 bg-neutral-gray-2 px-2 py-1">
      <button
        type="button"
        onClick={() => setShowAdd((s) => !s)}
        title="Adicionar coluna"
        className={cn(
          "mx-auto flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-primary-7 text-primary-7",
          showAdd ? "bg-primary-1" : "bg-white"
        )}
      >
        <Icon name="plus" size={15} />
      </button>
      {showAdd && <AddColumnPopover onAdd={onAdd} onClose={() => setShowAdd(() => false)} />}
    </th>
  );
}
