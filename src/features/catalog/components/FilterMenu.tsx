"use client";

import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/react";

import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterMenuProps {
  label: string;
  icon?: IconName;
  options: FilterOption[];
  /** string (single) ou string[] (multi — onChange alterna o valor clicado). */
  value: string | string[];
  onChange: (value: string) => void;
  multi?: boolean;
}

/** Dropdown de filtro no estilo dos filtros de planta do protótipo. */
export function FilterMenu({
  label,
  icon = "filter",
  options,
  value,
  onChange,
  multi = false,
}: FilterMenuProps) {
  const [open, setOpen] = React.useState(false);
  const isSel = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v);
  const active = Array.isArray(value) ? value.length > 0 : value !== "";

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom-start" offset={6}>
      <PopoverTrigger>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-[7px] rounded-lg px-3.5 text-[13px] font-semibold transition-colors",
            active
              ? "bg-primary-1 text-primary-7"
              : "bg-neutral-gray-3 text-neutral-gray-9 hover:bg-neutral-gray-4"
          )}
        >
          <Icon name={icon} size={15} className={active ? "text-primary-7" : "text-neutral-gray-7"} />
          {label}
          <Icon
            name="chevD"
            size={14}
            className={cn(
              "transition-transform",
              open && "rotate-180",
              active ? "text-primary-7" : "text-neutral-gray-7"
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[210px] rounded-lg border border-neutral-gray-4 bg-white p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
        <div className="w-full">
          {options.map((o) => {
            const sel = isSel(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  if (!multi) setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded px-3 py-[9px] text-left text-[13px]",
                  sel
                    ? "bg-primary-1 font-semibold text-primary-7"
                    : "font-medium text-neutral-gray-9 hover:bg-neutral-gray-2"
                )}
              >
                {o.label}
                {sel && <Icon name="check" size={15} className="text-primary-7" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Chip de filtro ativo com X circular (ActiveChip do protótipo). */
export function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-[30px] items-center gap-[7px] rounded-full bg-primary-1 pl-[7px] pr-3.5 text-[13px] font-medium text-primary-7">
      <button
        type="button"
        onClick={onRemove}
        title="Remover filtro"
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary-7"
      >
        <Icon name="close" size={11} className="text-white" />
      </button>
      {label}
    </span>
  );
}
