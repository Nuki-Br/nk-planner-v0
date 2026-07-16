"use client";

import {
  Select as HeroSelect,
  SelectItem,
  type SelectProps as HeroSelectProps,
} from "@heroui/react";

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
  /** Passthrough dos slots do HeroUI (ex.: trigger para casar altura/borda). */
  classNames?: HeroSelectProps["classNames"];
}

/**
 * Select Nuki: padrão HeroUI `bordered`, alinhado ao nk-admin-portal (borda
 * cinza padrão, cantos/altura padrão). API controlada por `value`/`onValueChange`.
 */
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
  classNames,
}: SelectProps) {
  return (
    <HeroSelect
      label={label}
      aria-label={ariaLabel}
      placeholder={placeholder}
      variant="bordered"
      size={small ? "sm" : "md"}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      description={description}
      className={className}
      classNames={classNames}
      selectedKeys={value ? [value] : []}
      onSelectionChange={(keys) => {
        if (keys === "all") return;
        const first = Array.from(keys)[0];
        onValueChange(first == null ? "" : String(first));
      }}
    >
      {options.map((o) => (
        <SelectItem key={o.value}>{o.label}</SelectItem>
      ))}
    </HeroSelect>
  );
}
