"use client";

import React from "react";

import { cn } from "@/lib/utils";

// Células editáveis das grades de custo (Custos base, composição, Itens de
// custo). Padrão comum a todas: o valor exibido é uma string controlada pelo
// chamador (rascunho entre o keystroke e o blur), `onCommit` roda no blur e é
// o chamador quem decide se houve mudança antes de gravar.

interface FieldEvents {
  onChange: (v: string) => void;
  /** Blur — o chamador compara com o valor gravado e só então persiste. */
  onCommit?: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  "aria-label"?: string;
  autoFocus?: boolean;
}

interface CostFieldProps extends FieldEvents {
  value: string;
  /** Sem valor gravado — pinta em alerta enquanto nada for digitado. */
  isPending: boolean;
  /** Linha "sem custo": não há o que digitar — desfazer volta a pendente. */
  disabled?: boolean;
  className?: string;
}

/** Campo de custo em R$ (inline, alinhado à direita). */
export function CostField({
  value,
  isPending,
  disabled = false,
  className,
  onChange,
  onCommit,
  onKeyDown,
  autoFocus,
  "aria-label": ariaLabel,
}: CostFieldProps) {
  const filledNow = value !== "" && parseFloat(value) > 0;
  if (disabled) {
    return (
      <span
        className={cn(
          "inline-block w-[118px] pr-2 text-right text-[12.5px] text-neutral-gray-5",
          className
        )}
      >
        —
      </span>
    );
  }
  return (
    <div className={cn("relative inline-block w-[118px]", className)}>
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-neutral-gray-6">
        R$
      </span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        placeholder="0,00"
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit?.(e.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          "h-[34px] w-full rounded-md border py-0 pl-[26px] pr-2 text-right text-[12.5px] outline-none focus:border-primary-7",
          isPending && !filledNow
            ? "border-functional-error bg-functional-error-light text-neutral-gray-9"
            : filledNow
              ? "border-primary-7 bg-white font-bold text-primary-8"
              : "border-neutral-gray-5 bg-white text-neutral-gray-9"
        )}
      />
    </div>
  );
}

interface QtyFieldProps extends FieldEvents {
  value: string;
  /** Quantidade inválida/zerada — mesma cor de alerta do CostField. */
  isPending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/** Campo de quantitativo/coeficiente (até 4 casas), sem prefixo de moeda. */
export function QtyField({
  value,
  isPending = false,
  disabled = false,
  placeholder = "1",
  className,
  onChange,
  onCommit,
  onKeyDown,
  autoFocus,
  "aria-label": ariaLabel,
}: QtyFieldProps) {
  const filledNow = value !== "" && parseFloat(value) > 0;
  return (
    <input
      type="number"
      step="0.0001"
      min="0"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onCommit?.(e.target.value)}
      onKeyDown={onKeyDown}
      className={cn(
        "h-[34px] w-[92px] rounded-md border px-2 py-0 text-right text-[12.5px] outline-none focus:border-primary-7 disabled:bg-neutral-gray-2 disabled:text-neutral-gray-6",
        isPending && !filledNow
          ? "border-functional-error bg-functional-error-light text-neutral-gray-9"
          : "border-neutral-gray-5 bg-white text-neutral-gray-9",
        className
      )}
    />
  );
}

/** Número gravado → string do `<input type=number>` (até 4 casas, sem zeros à direita). */
export function qtyToInput(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return String(parseFloat(n.toFixed(4)));
}

/** Preço gravado → string do CostField ("" quando null/0 — pendente). */
export function precoToInput(n: number | null | undefined): string {
  return n != null && n > 0 ? String(n) : "";
}

/** Cabeçalho de coluna das grades de custo (10px, caixa alta). */
export function TH({
  children,
  right = false,
  teal = false,
  className,
}: {
  children?: React.ReactNode;
  right?: boolean;
  teal?: boolean;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider",
        right ? "text-right" : "text-left",
        teal ? "bg-primary-1 text-primary-7" : "text-neutral-gray-7",
        className
      )}
    >
      {children}
    </th>
  );
}
