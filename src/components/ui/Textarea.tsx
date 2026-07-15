"use client";

import {
  Textarea as HeroTextarea,
  type TextAreaProps as HeroTextAreaProps,
} from "@heroui/react";

export type TextareaProps = Omit<HeroTextAreaProps, "variant">;

/**
 * Textarea Nuki: padrão HeroUI `bordered`, alinhado ao nk-admin-portal
 * (borda cinza padrão). `minRows={3}` por padrão, sobrescrevível.
 */
export function Textarea({ minRows = 3, ...props }: TextareaProps) {
  return <HeroTextarea variant="bordered" minRows={minRows} {...props} />;
}
