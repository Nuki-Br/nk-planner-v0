import type { NextRequest } from "next/server";

import { fail, toInt, withOrg } from "@/lib/api/handler";
import {
  addUpgrade,
  removeUpgrade,
  replaceUpgrade,
  setKitQtds,
  setPadrao,
} from "@/lib/server/store";

interface Params {
  params: { id: string; ambId: string; compId: string };
}

/**
 * Operações sobre a paleta do componente (payload discriminado). Ids em `number`:
 * setPadrao/addUpgrade recebem um BaseMaterial (catálogo); replace/remove recebem
 * o id da linha de opção (Material); setKitQtds mapeia KitItem id → quantitativo.
 */
type OpcaoBody =
  | { op: "setPadrao"; padraoBaseId: number | null }
  | { op: "addUpgrade"; baseId: number }
  | { op: "replaceUpgrade"; optionId: number; newBaseId: number }
  | { op: "removeUpgrade"; optionId: number }
  | { op: "setKitQtds"; qtds: Record<number, number> };

export async function POST(req: NextRequest, { params }: Params) {
  const body = (await req.json()) as OpcaoBody;
  const { id, ambId, compId } = params;
  switch (body.op) {
    case "setPadrao":
      return withOrg((org) => setPadrao(org, toInt(id), toInt(ambId), toInt(compId), body.padraoBaseId));
    case "addUpgrade":
      return withOrg((org) => addUpgrade(org, toInt(id), toInt(ambId), toInt(compId), body.baseId));
    case "replaceUpgrade":
      return withOrg((org) =>
        replaceUpgrade(org, toInt(id), toInt(ambId), toInt(compId), body.optionId, body.newBaseId)
      );
    case "removeUpgrade":
      return withOrg((org) => removeUpgrade(org, toInt(id), toInt(ambId), toInt(compId), body.optionId));
    case "setKitQtds":
      return withOrg((org) => setKitQtds(org, toInt(id), toInt(ambId), toInt(compId), body.qtds));
    default:
      return fail("Operação inválida.", 400);
  }
}
