import type { NextRequest } from "next/server";

import { fail, toInt, withOrg } from "@/lib/api/handler";
import {
  addCostComponent,
  removeCostComponent,
  reorderCostComponents,
  setCostQtds,
  updateCostComponent,
  type CostComponentInput,
} from "@/lib/server/store";

interface Params {
  params: { id: string; ambId: string; compId: string };
}

/**
 * Operações sobre os componentes de custo (satélites) de um componente.
 *
 * A DEFINIÇÃO (nome/tipo/material/unidade/lado/ordem) é compartilhada por todas
 * as plantas que usam o ambiente; o QUANTITATIVO (`setQtds`, e o `qtd` do `add`)
 * é só desta planta. Mesma divisão de `opcoes` ⇄ `setKitQtds`.
 */
type CustoBody =
  | ({ op: "add" } & CostComponentInput)
  | { op: "update"; costItemId: number; patch: Partial<Omit<CostComponentInput, "qtd">> }
  | { op: "remove"; costItemId: number }
  | { op: "setQtds"; qtds: Record<number, number> }
  | { op: "reorder"; orderedIds: number[] };

export async function POST(req: NextRequest, { params }: Params) {
  const body = (await req.json()) as CustoBody;
  const { id, ambId, compId } = params;
  switch (body.op) {
    case "add":
      return withOrg((org) =>
        addCostComponent(org, toInt(id), toInt(ambId), toInt(compId), {
          nome: body.nome,
          tipo: body.tipo,
          baseId: body.baseId,
          unidade: body.unidade,
          lado: body.lado,
          qtd: body.qtd,
        })
      );
    case "update":
      return withOrg((org) =>
        updateCostComponent(org, toInt(id), toInt(ambId), toInt(compId), body.costItemId, body.patch)
      );
    case "remove":
      return withOrg((org) =>
        removeCostComponent(org, toInt(id), toInt(ambId), toInt(compId), body.costItemId)
      );
    case "setQtds":
      return withOrg((org) => setCostQtds(org, toInt(id), toInt(ambId), toInt(compId), body.qtds));
    case "reorder":
      return withOrg((org) =>
        reorderCostComponents(org, toInt(id), toInt(ambId), toInt(compId), body.orderedIds)
      );
    default:
      return fail("Operação inválida.", 400);
  }
}
