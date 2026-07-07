"use client";

import React from "react";

import { evalCell, normName, type Scope } from "@/lib/formula";
import { cn, fmtBRL } from "@/lib/utils";

import type { ScopeRef } from "../calc";

interface FormulaCellEditorProps {
  initial: string;
  scope: Scope;
  refs: ScopeRef[];
  onSave: (expr: string) => void;
  onCancel: () => void;
  onReset: () => void;
  /** true quando a célula tem override (mostra o "redefinir"). */
  canReset: boolean;
}

// Editor de célula: número fixo ou "=fórmula", com avaliação ao vivo,
// erro #ERR e autocomplete de referências (budget-table.jsx linhas 30-118).
export function FormulaCellEditor({
  initial,
  scope,
  refs,
  onSave,
  onCancel,
  onReset,
  canReset,
}: FormulaCellEditorProps) {
  const [val, setVal] = React.useState(initial);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const trimmed = val.trim();
  const isFormula = trimmed.startsWith("=");
  const fragMatch = isFormula ? val.match(/([\p{L}\p{N}_]*)$/u) : null;
  const frag = fragMatch?.[1] ?? "";
  const fragNorm = normName(frag);
  const sugg = isFormula
    ? refs.filter((r) => fragNorm === "" || r.token.includes(fragNorm)).slice(0, 6)
    : [];

  const ev = evalCell(val, scope);

  const insert = (tok: string) => {
    const base = frag !== "" ? val.slice(0, val.length - frag.length) : val;
    const needsSpace = base.length > 0 && !/[\s(=+\-*/]$/.test(base);
    setVal(base + (needsSpace ? " " : "") + tok);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="relative flex w-[184px] flex-col gap-1 text-left">
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSave(trimmed);
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="valor ou =fórmula"
        className={cn(
          "w-full rounded-md border-2 px-2 py-[5px] text-xs font-semibold outline-none",
          ev.error
            ? "border-functional-error bg-functional-error-light text-functional-error"
            : "border-primary-7 bg-primary-1 text-primary-8"
        )}
      />

      <div className="flex min-h-3.5 items-center justify-between">
        <span
          className={cn(
            "text-[10.5px] font-bold",
            ev.error ? "text-functional-error" : "text-primary-7"
          )}
        >
          {ev.error ? "#ERR · " + ev.error : "= " + fmtBRL(ev.value)}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onSave(trimmed)}
            title="Salvar"
            className="rounded bg-primary-7 px-[7px] py-0.5 text-[11px] font-bold text-white"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={onCancel}
            title="Cancelar"
            className="rounded border border-neutral-gray-5 px-1.5 py-0.5 text-[11px] text-neutral-gray-7"
          >
            ✕
          </button>
        </div>
      </div>

      {isFormula && sugg.length > 0 && (
        <div className="absolute left-0 top-full z-[60] mt-0.5 w-full overflow-hidden rounded-md border border-neutral-gray-5 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.14)]">
          <div className="bg-neutral-gray-2 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-gray-6">
            Inserir referência
          </div>
          {sugg.map((r) => (
            <div
              key={r.token}
              onMouseDown={(e) => {
                e.preventDefault();
                insert(r.token);
              }}
              className="flex cursor-pointer items-center justify-between gap-2 px-2 py-[5px] hover:bg-primary-1"
            >
              <span className="font-mono text-xs font-semibold text-primary-8">{r.token}</span>
              <span className="whitespace-nowrap text-[10px] text-neutral-gray-6">{r.desc}</span>
            </div>
          ))}
        </div>
      )}

      {canReset && (
        <button
          type="button"
          onClick={onReset}
          className="p-0 text-left text-[10px] text-neutral-gray-6 hover:text-primary-7"
        >
          ↩ redefinir para o padrão da coluna
        </button>
      )}
    </div>
  );
}
