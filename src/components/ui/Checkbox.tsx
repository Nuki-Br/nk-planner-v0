"use client";

import {
  Checkbox as HeroCheckbox,
  type CheckboxProps as HeroCheckboxProps,
} from "@heroui/react";

export type CheckboxProps = HeroCheckboxProps;

/**
 * Checkbox Nuki: selecionado em teal (primary), alinhado ao nk-admin-portal.
 * `color` pode ser sobrescrito pelo chamador.
 */
export function Checkbox(props: CheckboxProps) {
  return <HeroCheckbox color="primary" {...props} />;
}
