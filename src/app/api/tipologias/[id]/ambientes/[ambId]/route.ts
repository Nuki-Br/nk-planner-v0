import type { NextRequest } from "next/server";

import { toInt, withOrg } from "@/lib/api/handler";
import { deleteAmbiente, updateAmbiente, type AmbienteInput } from "@/lib/server/store";

interface Params {
  params: { id: string; ambId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const patch = (await req.json()) as Partial<AmbienteInput>;
  return withOrg((org) => updateAmbiente(org, toInt(params.id), toInt(params.ambId), patch));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return withOrg((org) => deleteAmbiente(org, toInt(params.id), toInt(params.ambId)));
}
