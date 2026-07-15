"use client";

import { Input as HeroInput, type InputProps as HeroInputProps } from "@heroui/react";

export interface InputProps extends Omit<HeroInputProps, "variant" | "size"> {
  /** Compacto (size `sm`) para contextos densos; padrão é `md` (igual ao admin). */
  small?: boolean;
}

/**
 * Input Nuki: padrão HeroUI `bordered`, alinhado ao nk-admin-portal (borda cinza
 * padrão, cantos/altura padrão, foco padrão). Texto auxiliar → `description`;
 * erro → `isInvalid` + `errorMessage`.
 */
export function Input({ small = false, ...props }: InputProps) {
  return <HeroInput variant="bordered" size={small ? "sm" : "md"} {...props} />;
}
