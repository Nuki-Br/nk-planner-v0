import type { NextRequest } from "next/server";

import { fail, toInt, withOrg } from "@/lib/api/handler";
import { createCostItems, listCostItems } from "@/lib/server/costItems";

import { isLinesBody } from "./validate";

interface Params {
  params: { id: string };
}

/** Insumos da org com o preço deste empreendimento (aba "Itens de custo"). */
export async function GET(_req: NextRequest, { params }: Params) {
  return withOrg((org) => listCostItems(org, toInt(params.id)));
}

/** Grade "Adicionar itens": várias linhas (existentes ou novas) num request só. */
export async function POST(req: NextRequest, { params }: Params) {
  const body: unknown = await req.json();
  if (!isLinesBody(body)) return fail("Payload de itens de custo inválido.", 400);
  return withOrg((org) => createCostItems(org, toInt(params.id), body.lines));
}
