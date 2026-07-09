import type { NextRequest } from "next/server";

import { withOrg } from "@/lib/api/handler";
import { createAmbiente, reorderAmbientes, type AmbienteInput } from "@/lib/server/store";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const input = (await req.json()) as AmbienteInput;
  return withOrg((org) => createAmbiente(org, params.id, input));
}

/** Reordenação por drag: body = { orderedIds }. */
export async function PUT(req: NextRequest, { params }: Params) {
  const { orderedIds } = (await req.json()) as { orderedIds: string[] };
  return withOrg((org) => reorderAmbientes(org, params.id, orderedIds));
}
