"use client";

import {
  Switch as HeroSwitch,
  type SwitchProps as HeroSwitchProps,
} from "@heroui/react";

import { cn } from "@/lib/utils";

export type SwitchProps = HeroSwitchProps;

/**
 * Switch Nuki: trilho/thumb cinza quando off, teal quando on — espelha o
 * componente Switch do nk-admin-portal.
 */
export function Switch({ classNames, ...props }: SwitchProps) {
  return (
    <HeroSwitch
      classNames={{
        ...classNames,
        wrapper: cn(
          "bg-neutral-gray-4 group-data-[selected=true]:bg-primary-2",
          classNames?.wrapper
        ),
        thumb: cn(
          "bg-neutral-gray-7 group-data-[selected=true]:bg-primary-7",
          classNames?.thumb
        ),
      }}
      {...props}
    />
  );
}
