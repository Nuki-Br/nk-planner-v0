import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { deleteUnitGroup, updateUnitGroup, type UnitGroupInput } from "@/lib/server/store";

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const patch = (await req.json()) as Partial<UnitGroupInput>;
  return withOrg((org) => updateUnitGroup(org, toInt(params.id), patch));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg((org) => deleteUnitGroup(org, toInt(params.id)));
}
