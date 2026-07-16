import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { deleteCategoria, updateCategoria, type CategoriaInput } from "@/lib/server/store";

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const patch = (await req.json()) as Partial<CategoriaInput>;
  return withOrg((org) => updateCategoria(org, toInt(params.id), patch));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg((org) => deleteCategoria(org, toInt(params.id)));
}
