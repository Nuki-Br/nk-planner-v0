"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";

import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

interface EditTipSplitButtonProps {
  onEdit: () => void;
  onEditMetragens: () => void;
}

const half =
  "inline-flex h-8 items-center text-xs font-semibold text-neutral-gray-11 transition-colors hover:bg-neutral-gray-3";

/**
 * "Editar" da tipologia (ghost, sm) com um menu aninhado — hoje só "Editar
 * metragens". Mesmo padrão dos split buttons de Publicar orçamento e do
 * catálogo, no peso visual do botão que substitui.
 */
export function EditTipSplitButton({ onEdit, onEditMetragens }: EditTipSplitButtonProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="inline-flex">
      <button type="button" onClick={onEdit} className={cn(half, "gap-2 rounded-l-small pl-3 pr-2.5")}>
        <Icon name="edit" size={15} />
        Editar
      </button>
      <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-end" offset={6}>
        <PopoverTrigger>
          <button
            type="button"
            aria-label="Mais opções de edição"
            className={cn(half, "w-7 justify-center rounded-r-small border-l border-neutral-gray-4")}
          >
            <Icon name="chevD" size={14} className={cn("transition-transform", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="min-w-[240px] rounded-lg border border-neutral-gray-4 bg-white p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEditMetragens();
            }}
            className="flex w-full items-start gap-2.5 rounded px-3 py-2.5 text-left hover:bg-neutral-gray-2"
          >
            <Icon name="ruler" size={16} className="mt-px shrink-0 text-neutral-gray-9" />
            <span>
              <span className="block text-[13px] font-semibold text-neutral-gray-11">
                Editar metragens
              </span>
              <span className="block text-[11px] text-neutral-gray-6">
                Quantidade e RT de todos os componentes
              </span>
            </span>
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
