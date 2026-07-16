// Esquemas de cor das categorias de material (MaterialCategory.ColorScheme).
// As categorias em si são dinâmicas (por Organization, CRUD em /api/categorias);
// aqui ficam só as 10 cores disponíveis no seletor (referência: nk-admin-portal).
// As classes de chip são literais completos — o JIT do Tailwind exige.
export const CATEGORY_COLOR_KEYS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "cyan",
  "purple",
  "pink",
] as const;

export type CategoryColorKey = (typeof CATEGORY_COLOR_KEYS)[number];

interface ColorScheme {
  /** Classes do chip (pastel bg + fg escuro), tokens tint-* do tailwind.config. */
  chip: string;
  /** Cor sólida do swatch no seletor de cor. */
  swatch: string;
}

export const COLOR_SCHEMES: Record<CategoryColorKey, ColorScheme> = {
  gray: { chip: "bg-tint-gray-bg text-tint-gray-fg", swatch: "#8c8c8c" },
  red: { chip: "bg-tint-red-bg text-tint-red-fg", swatch: "#ef4444" },
  orange: { chip: "bg-tint-orange-bg text-tint-orange-fg", swatch: "#f97316" },
  yellow: { chip: "bg-tint-yellow-bg text-tint-yellow-fg", swatch: "#eab308" },
  green: { chip: "bg-tint-green-bg text-tint-green-fg", swatch: "#22c55e" },
  teal: { chip: "bg-tint-teal-bg text-tint-teal-fg", swatch: "#14b8a6" },
  blue: { chip: "bg-tint-blue-bg text-tint-blue-fg", swatch: "#3b82f6" },
  cyan: { chip: "bg-tint-cyan-bg text-tint-cyan-fg", swatch: "#06b6d4" },
  purple: { chip: "bg-tint-purple-bg text-tint-purple-fg", swatch: "#a855f7" },
  pink: { chip: "bg-tint-pink-bg text-tint-pink-fg", swatch: "#ec4899" },
};

export const DEFAULT_COLOR: CategoryColorKey = "gray";

/** Cor válida do banco (ColorScheme) → chave tipada; inválida/nula → default. */
export function toColorKey(cor: string | null | undefined): CategoryColorKey {
  return (CATEGORY_COLOR_KEYS as readonly string[]).includes(cor ?? "")
    ? (cor as CategoryColorKey)
    : DEFAULT_COLOR;
}

/** Classes de chip neutras para categoria desconhecida/sem categoria. */
export const CHIP_FALLBACK = "bg-neutral-gray-3 text-neutral-gray-8";
