import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { listCatalogEntities } from "@/lib/server/store";

import { optionalInt, parseCategoriaId, parseIdList, parseTipo } from "./params";

// Listagem paginada do catálogo (materiais + kits) para o catálogo e os pickers.
// Rota própria em vez de parâmetros em /api/materiais: aquele GET devolve
// `Material[]` para 8 telas mais o portal público, e kits estão fora do seu
// contrato — um retorno condicional ali envenenaria os tipos de todo mundo.
//
// Espelha /api/media/files; os parsers moram em ./params para poderem ser
// testados (um route.ts só deve exportar os verbos HTTP).

/** GET ?tipo=&search=&categoriaId=&excludeIds=&page=&limit= */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return withOrg((org) =>
    listCatalogEntities(org, {
      tipo: parseTipo(sp.get("tipo")),
      search: sp.get("search") ?? undefined,
      categoriaId: parseCategoriaId(sp.get("categoriaId")),
      excludeIds: parseIdList(sp.get("excludeIds")),
      page: optionalInt(sp.get("page"), "page"),
      limit: optionalInt(sp.get("limit"), "limit"),
    })
  );
}
