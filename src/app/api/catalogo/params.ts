// Parsers da query string de /api/catalogo.
//
// Em módulo separado do route.ts porque um arquivo de route handler do App
// Router só deve exportar os verbos HTTP — aqui eles ficam exportáveis e,
// principalmente, testáveis (ver params.test.ts). São a parte da rota com
// regras próprias o bastante para errar em silêncio.
import type { CatalogTipo } from "@/shared/types/catalog";

/** Inteiro opcional de query string (ausente → undefined; inválido → erro). */
export function optionalInt(raw: string | null, field: string): number | undefined {
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error(`Parâmetro inválido: ${field}.`);
  return n;
}

/** Valor desconhecido cai em "all" — mesma tolerância do parseFileType. */
export function parseTipo(raw: string | null): CatalogTipo {
  return raw === "single" || raw === "kit" ? raw : "all";
}

/**
 * Três estados, e a diferença importa: ausente = sem filtro de categoria;
 * "none" = só o que NÃO tem categoria; número = aquela categoria. Devolver
 * null no lugar de undefined transformaria "sem filtro" em "sem categoria" e
 * esvaziaria a lista.
 */
export function parseCategoriaId(raw: string | null): number | null | undefined {
  if (raw === null || raw === "") return undefined;
  if (raw === "none") return null;
  const n = Number(raw);
  if (!Number.isInteger(n)) throw new Error("Parâmetro inválido: categoriaId.");
  return n;
}

/** Teto de ids aceitos numa única query (ver parseIdList). */
export const MAX_EXCLUDE_IDS = 200;

/**
 * Lista de ids separada por vírgula. O teto existe porque isso viaja na URL:
 * 200 ids dão ~1,4 kB, bem dentro do limite, enquanto uma composição enorme
 * sem corte estouraria a linha de request e falharia de um jeito difícil de
 * diagnosticar.
 */
export function parseIdList(raw: string | null): number[] {
  if (raw === null || raw === "") return [];
  return raw.split(",").map(Number).filter(Number.isInteger).slice(0, MAX_EXCLUDE_IDS);
}
