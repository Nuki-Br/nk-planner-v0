import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { deleteMaterial, updateMaterial, type MaterialInput } from "@/lib/server/store";

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const patch = (await req.json()) as Partial<MaterialInput>;
  return withOrg((org) => updateMaterial(org, toInt(params.id), patch));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg((org) => deleteMaterial(org, toInt(params.id)));
}
