import type { NextRequest } from "next/server";

import { fail, toInt, withOrg } from "@/lib/api/handler";
import { runComposicaoOp } from "@/lib/server/costItems";

import { isComposicaoOp } from "../../../itens-de-custo/validate";

interface Params {
  params: { id: string; baseId: string };
}

/** Uma operação sobre a composição do material (add/update/remove/reorder/coeficiente/aplicar). */
export async function POST(req: NextRequest, { params }: Params) {
  const body: unknown = await req.json();
  if (!isComposicaoOp(body)) return fail("Operação de composição inválida.", 400);
  return withOrg(async (org) => {
    await runComposicaoOp(org, toInt(params.id), toInt(params.baseId), body);
    return null;
  });
}
