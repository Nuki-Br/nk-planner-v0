// Unidades de medida do domínio (fonte: docs/prototype-src/data.js).
// O tipo `Unidade` do domínio (Fase 1) deriva desta lista.
export const UNIDADES = ["m²", "ml", "und", "pç", "cj", "kg"] as const;

export type Unidade = (typeof UNIDADES)[number];
