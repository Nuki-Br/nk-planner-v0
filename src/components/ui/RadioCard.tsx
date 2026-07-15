"use client";

import type { RadioProps } from "@heroui/react";
import { useRadio, VisuallyHidden, cn } from "@heroui/react";

/**
 * Radio em cartão horizontal — espelha o HorizontalRadioCard do nk-admin-portal.
 * Usar dentro de um `<RadioGroup>` do HeroUI. Selecionado → borda teal (primary-7).
 */
export function RadioCard(props: RadioProps & { maxWidth?: number }) {
  const {
    Component,
    children,
    description,
    getBaseProps,
    getInputProps,
    getLabelProps,
    getLabelWrapperProps,
  } = useRadio(props);

  return (
    <Component
      {...getBaseProps()}
      style={props.maxWidth ? { maxWidth: props.maxWidth } : undefined}
      className={cn(
        "group inline-flex flex-row-reverse items-center justify-between hover:bg-content2",
        "max-w-[300px] cursor-pointer gap-4 rounded-lg border-2 border-default p-4",
        "data-[selected=true]:border-primary-7"
      )}
    >
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <div {...getLabelWrapperProps()} className="flex h-full flex-col gap-2">
        {children && <span {...getLabelProps()}>{children}</span>}
        {description && (
          <span className="text-xs-p text-foreground opacity-70">{description}</span>
        )}
      </div>
    </Component>
  );
}
