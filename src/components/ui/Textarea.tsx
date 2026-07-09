"use client";

import {
  Textarea as HeroTextarea,
  type TextAreaProps as HeroTextAreaProps,
} from "@heroui/react";

import { cn } from "@/lib/utils";

export type TextareaProps = Omit<HeroTextAreaProps, "variant">;

/** Textarea Nuki: label interna e borda preta 1px (NTextarea do protótipo). */
export function Textarea({ classNames, ...props }: TextareaProps) {
  return (
    <HeroTextarea
      variant="bordered"
      radius="sm"
      labelPlacement="inside"
      minRows={3}
      classNames={{
        ...classNames,
        label: cn("text-[11px] text-neutral-gray-7", classNames?.label),
        input: cn("text-sm", classNames?.input),
        inputWrapper: cn(
          // !important: ver nota no Input — border-medium da variante vence
          // um border-small simples no merge de slots.
          "!border-small border-neutral-gray-13 bg-white",
          "data-[hover=true]:border-neutral-gray-13",
          "group-data-[focus=true]:border-primary-7",
          "group-data-[invalid=true]:border-functional-error group-data-[invalid=true]:bg-functional-error-light",
          classNames?.inputWrapper
        ),
      }}
      {...props}
    />
  );
}
