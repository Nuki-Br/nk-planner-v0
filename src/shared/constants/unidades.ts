// Unidades de medida do domínio (fonte: docs/prototype-src/data.js + planilha de
// composição da construtora: M2, M, M3, KG, UN, VB, DIA, H, SC).
// O tipo `Unidade` do domínio deriva desta lista.
export const UNIDADES = [
  "m²",
  "ml",
  "und",
  "pç",
  "cj",
  "kg",
  "m³",
  "l",
  "vb",
  "dia",
  "h",
  "sc",
] as const;

export type Unidade = (typeof UNIDADES)[number];

/** Fonte única das opções de select de unidade em toda a aplicação. */
export const UNIDADE_OPTIONS: { value: Unidade; label: string }[] = [
  { value: "m²", label: "m² — área" },
  { value: "ml", label: "ml — linear" },
  { value: "und", label: "und — peça" },
  { value: "pç", label: "pç — peça avulsa" },
  { value: "cj", label: "cj — conjunto" },
  { value: "kg", label: "kg — quilo" },
  { value: "m³", label: "m³ — volume" },
  { value: "l", label: "l — litro" },
  { value: "vb", label: "vb — verba" },
  { value: "dia", label: "dia — diária" },
  { value: "h", label: "h — hora" },
  { value: "sc", label: "sc — saco" },
];

export function isUnidade(v: unknown): v is Unidade {
  return typeof v === "string" && (UNIDADES as readonly string[]).includes(v);
}

/** Grafias que chegam de planilha/CSV → unidade do domínio. */
const SINONIMOS: Record<string, Unidade> = {
  m2: "m²",
  "m²": "m²",
  m3: "m³",
  "m³": "m³",
  m: "ml",
  ml: "ml",
  un: "und",
  und: "und",
  unid: "und",
  unidade: "und",
  pc: "pç",
  "pç": "pç",
  cj: "cj",
  conj: "cj",
  kg: "kg",
  l: "l",
  lt: "l",
  vb: "vb",
  verba: "vb",
  dia: "dia",
  h: "h",
  hora: "h",
  sc: "sc",
  saco: "sc",
};

/**
 * Normaliza a unidade digitada/colada ("M2", "Un ", "KG") para o domínio.
 * `null` quando não reconhece — o chamador decide o fallback (o CSV usa `und`).
 */
export function normalizeUnidade(raw: string): Unidade | null {
  const key = raw.trim().toLowerCase().replace(/\.$/, "");
  if (key === "") return null;
  return SINONIMOS[key] ?? null;
}
