"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";

import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";

interface AddSplitButtonProps {
  onAddMaterial: () => void;
  onCreateKit: () => void;
}

/** Split button: ação primária "Adicionar material" + menu "Criar kit". */
export function AddSplitButton({ onAddMaterial, onCreateKit }: AddSplitButtonProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="inline-flex">
      <button
        type="button"
        onClick={onAddMaterial}
        className="inline-flex h-10 items-center gap-[7px] rounded-l-lg bg-neutral-gray-13 px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        <Icon name="plus" size={16} className="text-white" />
        Adicionar material
      </button>
      <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-end" offset={6}>
        <PopoverTrigger>
          <button
            type="button"
            aria-label="Mais opções"
            className="flex h-10 w-[38px] items-center justify-center rounded-r-lg border-l border-white/20 bg-neutral-gray-13 text-white transition-opacity hover:opacity-90"
          >
            <Icon name="chevD" size={16} className={cn("text-white transition-transform", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="min-w-[200px] rounded-lg border border-neutral-gray-4 bg-white p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreateKit();
            }}
            className="flex w-full items-center gap-2.5 rounded px-3 py-2.5 text-left text-[13px] font-semibold text-neutral-gray-11 hover:bg-neutral-gray-2"
          >
            <Icon name="layers" size={16} className="text-neutral-gray-9" />
            Criar kit
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
