// Unidades de medida do domínio (fonte: docs/prototype-src/data.js).
// O tipo `Unidade` do domínio (Fase 1) deriva desta lista.
export const UNIDADES = ["m²", "ml", "und", "pç", "cj", "kg"] as const;

export type Unidade = (typeof UNIDADES)[number];

/** Fonte única das opções de select de unidade em toda a aplicação. */
export const UNIDADE_OPTIONS: { value: Unidade; label: string }[] = [
  { value: "m²", label: "m² — área" },
  { value: "ml", label: "ml — linear" },
  { value: "und", label: "und — peça" },
  { value: "pç", label: "pç — peça avulsa" },
  { value: "cj", label: "cj — conjunto" },
  { value: "kg", label: "kg — quilo" },
];
