"use client";

import React from "react";

import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { BudgetColumn } from "@/shared/types/domain";

interface ColHeaderCellProps {
  col: BudgetColumn;
  onRequestEdit: (col: BudgetColumn) => void;
  onRequestDelete: (col: BudgetColumn) => void;
  onDragStart: (id: number) => void;
  onDragEnter: (id: number) => void;
  onDrop: (id: number) => void;
  isDragTarget: boolean;
}

// Header de coluna configurável: editar (lápis ou duplo-clique) e remover (×),
// ambos abrindo modal na BudgetScreen — nada aqui depende de hover para
// permanecer aberto. Reordenar é drag nativo: dnd-kit aplica transform no <th>
// e quebra o layout da tabela, então o HTML5 DnD do protótipo é a escolha aqui.
export function ColHeaderCell({
  col,
  onRequestEdit,
  onRequestDelete,
  onDragStart,
  onDragEnter,
  onDrop,
  isDragTarget,
}: ColHeaderCellProps) {
  const [hover, setHover] = React.useState(false);

  return (
    <th
      draggable
      onDragStart={(e) => {
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
      onMouseLeave={() => setHover(false)}
      style={{ boxShadow: isDragTarget ? "inset 3px 0 0 #047676" : "none" }}
      className={cn(
        "relative cursor-grab whitespace-nowrap border-b-2 border-neutral-gray-4 bg-primary-1",
        "px-2.5 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-primary-7"
      )}
    >
      <div
        onDoubleClick={() => onRequestEdit(col)}
        title="Duplo-clique para editar · arraste para reordenar"
        className="flex items-center justify-end gap-1"
        style={{ paddingRight: hover ? 32 : 0 }}
      >
        <span>{col.nome || "(sem nome)"}</span>
      </div>

      {hover && (
        <div className="absolute right-[3px] top-[3px] flex items-center gap-[3px]">
          <button
            type="button"
            onClick={() => onRequestEdit(col)}
            title="Editar coluna"
            className="flex h-[17px] w-[17px] items-center justify-center rounded bg-primary-7/10 p-0 text-primary-7"
          >
            <Icon name="edit" size={10} />
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete(col)}
            title="Remover coluna"
            className="flex h-[17px] w-[17px] items-center justify-center rounded bg-primary-7/10 p-0 text-[11px] text-primary-7"
          >
            ×
          </button>
        </div>
      )}
    </th>
  );
}

/** Célula-botão "+" no fim das colunas configuráveis. */
export function AddColumnTh({ onRequestCreate }: { onRequestCreate: () => void }) {
  return (
    <th className="w-11 border-b-2 border-neutral-gray-4 bg-neutral-gray-2 px-2 py-1">
      <button
        type="button"
        onClick={onRequestCreate}
        title="Adicionar coluna"
        className="mx-auto flex h-[26px] w-[26px] items-center justify-center rounded-full border border-dashed border-primary-7 bg-white text-primary-7"
      >
        <Icon name="plus" size={15} />
      </button>
    </th>
  );
}
