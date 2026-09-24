import type { NextRequest } from "next/server";

import { fail, toInt, withOrg } from "@/lib/api/handler";
import { deleteCostItem, updateCostItem } from "@/lib/server/costItems";

import { isCostItemPatch } from "../validate";

interface Params {
  params: { id: string; itemId: string };
}

/** Identidade (org) e/ou preço (empreendimento) — a grade grava um campo por blur. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const body: unknown = await req.json();
  if (!isCostItemPatch(body)) return fail("Payload de item de custo inválido.", 400);
  return withOrg((org) => updateCostItem(org, toInt(params.id), toInt(params.itemId), body));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg(async (org) => {
    await deleteCostItem(org, toInt(params.itemId));
    return null;
  });
}
