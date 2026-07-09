import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner (same helper convention as nk-admin-portal). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formata moeda BRL: 1234.5 → "R$ 1.234,50". null/undefined → "—". */
export function fmtBRL(v: number | null | undefined): string {
  if (v == null) return "—";
  return (
    "R$ " +
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

/** Formata número no locale pt-BR com `dec` casas decimais. null/undefined → "—". */
export function fmtNum(v: number | null | undefined, dec = 2): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

/**
 * Converte entrada numérica BR em número: "1,5" → 1.5.
 * Contrato idêntico ao do protótipo (`parseFloat(String(v).replace(',', '.')) || 0`):
 * entrada não-numérica ou vazia → 0. Usar em TODA entrada numérica de formulário.
 */
export function parseBR(value: string | number): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return parseFloat(value.replace(",", ".")) || 0;
}
