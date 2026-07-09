"use client";

import { Button as HeroButton, type ButtonProps as HeroButtonProps } from "@heroui/react";

import { cn } from "@/lib/utils";

import { Icon, type IconName } from "./Icon";

// Variantes do protótipo (Btn): solid (preto), bordered, teal (marca),
// ghost e danger — mapeadas para variant/color do HeroUI + classes Nuki.
export type ButtonVariant = "solid" | "bordered" | "teal" | "ghost" | "danger";

const VARIANT_CFG: Record<
  ButtonVariant,
  { hero: Pick<HeroButtonProps, "variant" | "color">; className: string }
> = {
  solid: {
    hero: { variant: "solid" },
    className:
      "bg-neutral-gray-13 text-white data-[hover=true]:bg-neutral-gray-11",
  },
  bordered: {
    hero: { variant: "bordered" },
    className: "border-small border-neutral-gray-13 text-neutral-gray-13",
  },
  teal: {
    hero: { variant: "solid", color: "primary" },
    className: "data-[hover=true]:bg-primary-6",
  },
  ghost: {
    hero: { variant: "light" },
    className: "text-neutral-gray-11 data-[hover=true]:bg-neutral-gray-3",
  },
  danger: {
    hero: { variant: "solid", color: "danger" },
    className: "",
  },
};

const SIZE_TEXT: Record<"sm" | "md" | "lg", string> = {
  sm: "text-xs",
  md: "text-[13px]",
  lg: "text-sm",
};

export interface ButtonProps
  extends Omit<HeroButtonProps, "variant" | "color" | "startContent"> {
  variant?: ButtonVariant;
  /** Ícone à esquerda do texto (mapa do componente Icon). */
  icon?: IconName;
}

export function Button({
  variant = "solid",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  const cfg = VARIANT_CFG[variant];
  return (
    <HeroButton
      {...cfg.hero}
      size={size}
      radius="sm"
      startContent={icon ? <Icon name={icon} size={15} /> : undefined}
      className={cn("font-semibold", SIZE_TEXT[size], cfg.className, className)}
      {...props}
    >
      {children}
    </HeroButton>
  );
}
