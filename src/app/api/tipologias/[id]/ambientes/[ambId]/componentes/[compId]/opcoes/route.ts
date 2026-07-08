import type { NextRequest } from "next/server";

import { fail, withOrg } from "@/lib/api/handler";
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

/** Operações sobre padrão/upgrades/kitQtds do componente (payload discriminado). */
type OpcaoBody =
  | { op: "setPadrao"; padraoId: string | null }
  | { op: "addUpgrade"; upgradeId: string }
  | { op: "replaceUpgrade"; oldId: string; newId: string }
  | { op: "removeUpgrade"; upgradeId: string }
  | { op: "setKitQtds"; kitId: string; qtds: Record<string, number> };

export async function POST(req: NextRequest, { params }: Params) {
  const body = (await req.json()) as OpcaoBody;
  const { id, ambId, compId } = params;
  switch (body.op) {
    case "setPadrao":
      return withOrg((org) => setPadrao(org, id, ambId, compId, body.padraoId));
    case "addUpgrade":
      return withOrg((org) => addUpgrade(org, id, ambId, compId, body.upgradeId));
    case "replaceUpgrade":
      return withOrg((org) => replaceUpgrade(org, id, ambId, compId, body.oldId, body.newId));
    case "removeUpgrade":
      return withOrg((org) => removeUpgrade(org, id, ambId, compId, body.upgradeId));
    case "setKitQtds":
      return withOrg((org) => setKitQtds(org, id, ambId, compId, body.kitId, body.qtds));
    default:
      return fail("Operação inválida.", 400);
  }
}
