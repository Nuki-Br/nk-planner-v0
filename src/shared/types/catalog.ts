// Contratos da listagem paginada do catálogo (/api/catalogo) — materiais e kits
// juntos, já que ambos são linhas de BaseMaterial distinguidas por `Type`.
//
// Vocabulário `page`/`limit`/`results`/`total` espelhando o Media Center
// (shared/types/media.ts), que é a paginação de referência do repo. NÃO usar
// `Paginated<T>`/`GetParams` de shared/types/api.ts: estão sem uso e o
// `pageSize` de lá conflitaria com o `limit` que o servidor realmente aceita.
import type { CatalogEntity } from "./domain";

/** "all" = materiais + kits (o que os pickers que mesclam os dois pedem). */
export type CatalogTipo = "single" | "kit" | "all";

export interface FetchCatalogParams {
  /** Ausente → "all". */
  tipo?: CatalogTipo;
  /** Casa com nome, código ou fabricante. */
  search?: string;
  /**
   * Três estados, de propósito: `undefined` = sem filtro; `null` = só as
   * entidades SEM categoria; number = a categoria daquele id.
   */
  categoriaId?: number | null;
  /** Ids a esconder (opções já usadas). Aplicado no servidor — ver store.ts. */
  excludeIds?: readonly number[];
  page?: number;
  limit?: number;
}

export interface FetchCatalogResponse {
  results: CatalogEntity[];
  total: number;
  page: number;
  limit: number;
}
