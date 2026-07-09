"use client";

import { Input as HeroInput, type InputProps as HeroInputProps } from "@heroui/react";

import { cn } from "@/lib/utils";

export interface InputProps extends Omit<HeroInputProps, "variant" | "size"> {
  /** Compacto (48px) — equivalente ao `small` do protótipo; padrão 64px. */
  small?: boolean;
}

/**
 * Input Nuki: label flutuante interna, borda preta 1px (NInput do protótipo).
 * Texto auxiliar → `description`; erro → `isInvalid` + `errorMessage`.
 */
export function Input({ small = false, classNames, ...props }: InputProps) {
  return (
    <HeroInput
      variant="bordered"
      radius="sm"
      size={small ? "sm" : "lg"}
      labelPlacement="inside"
      classNames={{
        ...classNames,
        label: cn("text-[11px] text-neutral-gray-7", classNames?.label),
        input: cn(small ? "text-xs" : "text-sm", classNames?.input),
        description: cn("text-[11px] text-neutral-gray-7", classNames?.description),
        inputWrapper: cn(
          // !important: o merge de slots do HeroUI mantém o border-medium da
          // variante bordered sobre um border-small simples.
          "!border-small border-neutral-gray-13 bg-white",
          "data-[hover=true]:border-neutral-gray-13",
          "group-data-[focus=true]:border-primary-7",
          "group-data-[invalid=true]:border-functional-error group-data-[invalid=true]:bg-functional-error-light",
          "group-data-[disabled=true]:bg-neutral-gray-3",
          classNames?.inputWrapper
        ),
      }}
      {...props}
    />
  );
}
