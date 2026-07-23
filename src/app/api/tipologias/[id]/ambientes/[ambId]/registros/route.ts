import type { NextRequest } from "next/server";

import { fail, toInt, withOrg } from "@/lib/api/handler";
import {
  addCostRegistro,
  removeCostRegistro,
  updateCostRegistro,
  type CostRegistroInput,
} from "@/lib/server/store";

interface Params {
  params: { id: string; ambId: string };
}

/**
 * Linhas de custo avulsas (registro) de um ambiente. Nível Room — valem para
 * todas as plantas que usam o ambiente. Nome em texto livre, sem componente.
 */
type RegistroBody =
  | ({ op: "add" } & CostRegistroInput)
  | { op: "update"; registroId: number; patch: Partial<CostRegistroInput> }
  | { op: "remove"; registroId: number };

export async function POST(req: NextRequest, { params }: Params) {
  const body = (await req.json()) as RegistroBody;
  const { id, ambId } = params;
  switch (body.op) {
    case "add":
      return withOrg((org) =>
        addCostRegistro(org, toInt(id), toInt(ambId), {
          nome: body.nome,
          valorUnitario: body.valorUnitario,
          unidade: body.unidade,
          qtd: body.qtd,
        })
      );
    case "update":
      return withOrg((org) =>
        updateCostRegistro(org, toInt(id), toInt(ambId), body.registroId, body.patch)
      );
    case "remove":
      return withOrg((org) => removeCostRegistro(org, toInt(id), toInt(ambId), body.registroId));
    default:
      return fail("Operação inválida.", 400);
  }
}
