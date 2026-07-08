"use client";

import { Select as HeroSelect, SelectItem } from "@heroui/react";

import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  /** Nome acessível quando não há `label` visível (evita o aviso do react-aria). */
  "aria-label"?: string;
  placeholder?: string;
  options: SelectOption[];
  /** Valor selecionado (controlado). "" = nenhum. */
  value: string;
  onValueChange: (value: string) => void;
  small?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  description?: string;
  className?: string;
}

/** Select Nuki: label interna, borda preta 1px (NSelect do protótipo). */
export function Select({
  label,
  "aria-label": ariaLabel,
  placeholder = "Selecione...",
  options,
  value,
  onValueChange,
  small = false,
  isDisabled,
  isInvalid,
  errorMessage,
  description,
  className,
}: SelectProps) {
  return (
    <HeroSelect
      label={label}
      aria-label={ariaLabel}
      placeholder={placeholder}
      variant="bordered"
      radius="sm"
      size={small ? "sm" : "lg"}
      labelPlacement="inside"
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      description={description}
      className={className}
      selectedKeys={value ? [value] : []}
      onSelectionChange={(keys) => {
        if (keys === "all") return;
        const first = Array.from(keys)[0];
        onValueChange(first == null ? "" : String(first));
      }}
      classNames={{
        label: "text-[11px] text-neutral-gray-7",
        value: cn(small ? "text-xs" : "text-sm", "text-neutral-gray-11"),
        description: "text-[11px] text-neutral-gray-7",
        trigger: cn(
          // !important: ver nota no Input — border-medium da variante vence
          // um border-small simples no merge de slots.
          "!border-small border-neutral-gray-13 bg-white",
          "data-[hover=true]:border-neutral-gray-13",
          "data-[open=true]:border-primary-7 data-[focus=true]:border-primary-7"
        ),
      }}
    >
      {options.map((o) => (
        <SelectItem key={o.value}>{o.label}</SelectItem>
      ))}
    </HeroSelect>
  );
}
