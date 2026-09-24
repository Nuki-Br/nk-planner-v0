import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { updateMetragens } from "@/lib/server/store";
import type { MetragemInput } from "@/shared/types/domain";

interface Params {
  params: { id: string };
}

/** "Editar metragens": qtd/RT de vários componentes desta tipologia de uma vez. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const body = (await req.json()) as { itens: MetragemInput[] };
  return withOrg((org) => updateMetragens(org, toInt(params.id), body.itens));
}
