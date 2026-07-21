"use client";

import React from "react";

import { normName } from "@/lib/formula";

import type { ScopeRef } from "../calc";

interface UseFormulaSuggestionsResult {
  /** Referências que casam com o fragmento sendo digitado (máx. 6). */
  sugg: ScopeRef[];
  /** Substitui o fragmento atual pelo token escolhido e devolve o novo valor. */
  withToken: (token: string) => string;
}

/**
 * Autocomplete de referências de fórmula: enquanto o valor começa com "=",
 * casa o último fragmento digitado contra os tokens disponíveis.
 * Compartilhado pelo editor de célula e pelo modal de coluna.
 */
export function useFormulaSuggestions(
  value: string,
  refs: ScopeRef[]
): UseFormulaSuggestionsResult {
  const isFormula = value.trim().startsWith("=");
  const frag = isFormula ? (value.match(/([\p{L}\p{N}_]*)$/u)?.[1] ?? "") : "";

  const sugg = React.useMemo(() => {
    if (!isFormula) return [];
    const fragNorm = normName(frag);
    return refs.filter((r) => fragNorm === "" || r.token.includes(fragNorm)).slice(0, 6);
  }, [isFormula, frag, refs]);

  const withToken = React.useCallback(
    (token: string) => {
      const base = frag !== "" ? value.slice(0, value.length - frag.length) : value;
      const needsSpace = base.length > 0 && !/[\s(=+\-*/]$/.test(base);
      return base + (needsSpace ? " " : "") + token;
    },
    [frag, value]
  );

  return { sugg, withToken };
}
