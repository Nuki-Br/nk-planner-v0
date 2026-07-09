// Categorias de material do domínio (fonte: docs/prototype-src/data.js).
// O tipo `Categoria` do domínio (Fase 1) deriva desta lista.
export const CATEGORIAS = [
  "Piso",
  "Revestimento",
  "Pedra",
  "Metal",
  "Rodapé",
  "Cuba/Louça",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

// Classes de cor dos chips de categoria (CAT_COLORS do protótipo),
// usando os tokens `tint-*` de tailwind.config.ts.
export const CAT_COLORS: Record<Categoria, string> = {
  Piso: "bg-tint-blue-bg text-tint-blue-fg",
  Revestimento: "bg-tint-violet-bg text-tint-violet-fg",
  Pedra: "bg-tint-pink-bg text-tint-pink-fg",
  Metal: "bg-tint-amber-bg text-tint-amber-fg",
  Rodapé: "bg-tint-emerald-bg text-tint-emerald-fg",
  "Cuba/Louça": "bg-tint-sky-bg text-tint-sky-fg",
};
