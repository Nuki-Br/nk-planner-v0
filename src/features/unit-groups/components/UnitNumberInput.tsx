"use client";

import React from "react";

import { Icon } from "@/components/ui";

import { addUnitTokens } from "../unitTokens";

interface UnitNumberInputProps {
  values: string[];
  onChange: (values: string[]) => void;
}

/** Chips tokenizados de números de unidade (Enter/vírgula/blur adicionam; Backspace remove o último). */
export function UnitNumberInput({ values, onChange }: UnitNumberInputProps) {
  const [draft, setDraft] = React.useState("");

  const commit = (raw: string) => {
    const next = addUnitTokens(values, raw);
    if (next.length !== values.length) onChange(next);
    setDraft("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-bold text-neutral-gray-9">Números das unidades</span>
        <span className="text-[11px] text-neutral-gray-6">
          {values.length} unidade{values.length === 1 ? "" : "s"}
        </span>
      </div>
      {values.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {values.map((u) => (
            <span
              key={u}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-1 py-[5px] pl-3 pr-1.5 text-[13px] font-semibold text-primary-7"
            >
              {u}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== u))}
                title="Remover unidade"
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary-7/10 text-primary-7"
              >
                <Icon name="close" size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-lg border border-neutral-gray-5 bg-white px-2.5 py-2">
        <Icon name="plus" size={15} className="text-neutral-gray-6" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => commit(draft)}
          placeholder="Ex: 101, 111, 121, 131…  (Enter para adicionar)"
          className="flex-1 border-none bg-transparent py-0.5 text-[13px] text-neutral-gray-11 outline-none"
        />
      </div>
    </div>
  );
}
