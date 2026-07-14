import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { deleteKit, updateKit, type KitInput } from "@/lib/server/store";

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const patch = (await req.json()) as Partial<KitInput>;
  return withOrg((org) => updateKit(org, toInt(params.id), patch));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg((org) => deleteKit(org, toInt(params.id)));
}
