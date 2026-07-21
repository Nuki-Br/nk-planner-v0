// Camada client da listagem paginada do catálogo — chama /api/catalogo via os
// wrappers de http.ts (envelope BaseResult).
//
// Fica em lib/api/ e não em lib/data/store.ts (onde moram listMateriais/listKits)
// porque é o que o conventions.md prescreve: "Funções de acesso em
// src/lib/api/*.ts usando os wrappers de src/lib/api/http.ts". O store.ts é
// código mais antigo, anterior à convenção.
import type { FetchCatalogParams, FetchCatalogResponse } from "@/shared/types/catalog";

import { httpGet } from "./http";

/**
 * Query string montada à mão, como fetchMediaFiles: http.ts não tem helper de
 * QS, e os parâmetros aqui têm regras próprias demais para um genérico —
 * `categoriaId: null` precisa virar "none" (e não sumir), enquanto os demais
 * campos vazios são omitidos.
 */
export async function fetchCatalogEntities(
  params: FetchCatalogParams
): Promise<FetchCatalogResponse> {
  const qs = new URLSearchParams();
  if (params.tipo) qs.set("tipo", params.tipo);
  if (params.search) qs.set("search", params.search);
  if (params.categoriaId !== undefined) {
    qs.set("categoriaId", params.categoriaId === null ? "none" : String(params.categoriaId));
  }
  if (params.excludeIds && params.excludeIds.length > 0) {
    qs.set("excludeIds", params.excludeIds.join(","));
  }
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  return httpGet<FetchCatalogResponse>(`/api/catalogo?${qs.toString()}`);
}
