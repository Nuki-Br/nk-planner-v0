"use client";

import React from "react";

import { Icon } from "@/components/ui";
import { cn, fmtBRL } from "@/lib/utils";

export type CostField = "mat" | "mo";
/** rowKey → campo → valor digitado (string de input). */
export type CostOverrides = Record<string, Partial<Record<CostField, string>>>;
export interface EditCellRef {
  key: string;
  field: CostField;
}

// Célula de custo com edição inline ao clique (EditableCell do protótipo,
// tela 8): Enter/Tab confirmam, Esc reverte; valor modificado fica teal.
export function EditableCell({
  rowKey,
  field,
  value,
  editCell,
  setEditCell,
  overrides,
  setOverrides,
}: {
  rowKey: string;
  field: CostField;
  /** Valor original (do catálogo) em R$. */
  value: number;
  editCell: EditCellRef | null;
  setEditCell: (ref: EditCellRef | null) => void;
  overrides: CostOverrides;
  setOverrides: React.Dispatch<React.SetStateAction<CostOverrides>>;
}) {
  const isEditing = editCell?.key === rowKey && editCell?.field === field;
  const ov = overrides[rowKey] ?? {};
  const ovValue = ov[field];
  const isModified = ovValue != null;
  const editStr = ovValue ?? String(value || "");
  const displayNum = isModified ? parseFloat(ovValue) || 0 : value;
  const [hov, setHov] = React.useState(false);

  const startEdit = () => {
    setOverrides((p) => ({
      ...p,
      [rowKey]: { ...(p[rowKey] ?? {}), [field]: String(value || "") },
    }));
    setEditCell({ key: rowKey, field });
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        type="number"
        step="0.01"
        value={editStr}
        onChange={(e) =>
          setOverrides((p) => ({
            ...p,
            [rowKey]: { ...(p[rowKey] ?? {}), [field]: e.target.value },
          }))
        }
        onBlur={() => setEditCell(null)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            setEditCell(null);
          }
          if (e.key === "Escape") {
            setOverrides((p) => {
              const next = { ...p };
              const row = { ...(next[rowKey] ?? {}) };
              delete row[field];
              next[rowKey] = row;
              return next;
            });
            setEditCell(null);
          }
        }}
        className="h-[30px] w-[90px] rounded-lg border-2 border-primary-7 bg-primary-1 px-2 text-right text-xs font-bold text-primary-8 outline-none"
      />
    );
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={startEdit}
      className={cn(
        "flex cursor-text select-none items-center justify-end gap-1 rounded px-1.5 py-[3px] transition-colors",
        hov ? "bg-neutral-gray-3" : isModified && "bg-primary-1"
      )}
    >
      <span
        className={cn(
          "text-xs",
          isModified
            ? "font-bold text-primary-7"
            : value > 0
              ? "text-neutral-gray-11"
              : "text-neutral-gray-5"
        )}
      >
        {value > 0 || isModified ? fmtBRL(displayNum) : "—"}
      </span>
      <Icon
        name="edit"
        size={11}
        className={cn(
          hov || isModified
            ? isModified
              ? "text-primary-7"
              : "text-neutral-gray-5"
            : "text-transparent"
        )}
      />
    </div>
  );
}
